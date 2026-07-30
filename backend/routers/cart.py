import asyncio
import logging
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import carddb
from auth import require_user
from currency import get_rate_to_aud
from database import CartItem, User, get_db, is_store_globally_enabled
from routers.search import priced_fields, scraper_kwargs
from scrapers import SCRAPERS, get_scraper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cart", tags=["cart"])


class CartItemIn(BaseModel):
    """Snapshot of a live search result at the moment it's added — mirrors
    the SearchResult fields the cart page needs to render a row and link out
    to the store."""

    store_name: str = Field(min_length=1, max_length=128)
    card_name: str = Field(min_length=1, max_length=512)
    set_name: str | None = None
    collector_number: str | None = None
    foil: bool = False
    foil_treatment: str | None = None
    condition: str = Field(min_length=1, max_length=64)
    price: float
    currency: str = Field(min_length=1, max_length=8)
    price_original: float | None = None
    currency_original: str | None = None
    shipping_price: float | None = None
    image_url: str | None = None
    product_url: str = Field(min_length=1, max_length=2048)


class CartItemOut(CartItemIn):
    id: int
    quantity: int
    added_at: datetime
    price_checked_at: datetime | None = None
    refresh_missing: bool = False
    # Best-effort real card name resolved from card_name (see carddb.py) —
    # only ever set for eBay, whose listing titles are free text. Null means
    # resolution failed or hasn't run; the frontend falls back to card_name.
    card_name_clean: str | None = None

    class Config:
        from_attributes = True


class CartRefreshOut(BaseModel):
    items: list[CartItemOut]
    checked: int  # items whose store search completed (matched or missing)
    changed: int  # checked items whose display price actually moved
    missing: int  # checked items no longer found in stock at the store
    errors: list[dict]


def _cart_items(db: Session, user: User) -> list[CartItem]:
    return (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id)
        .order_by(CartItem.added_at.desc(), CartItem.id.desc())
        .all()
    )


# Every mutation returns the full cart so the frontend's CartContext can
# replace its state in one step — no separate refetch round-trip.
@router.get("", response_model=list[CartItemOut])
def get_cart(db: Session = Depends(get_db), user: User = Depends(require_user)):
    return _cart_items(db, user)


@router.post("", response_model=list[CartItemOut])
async def add_to_cart(payload: CartItemIn, db: Session = Depends(get_db), user: User = Depends(require_user)):
    # The same listing added again bumps quantity instead of duplicating.
    # product_url alone isn't enough — some stores list every condition/foil
    # variant on one product page, so those are part of the identity too.
    existing = (
        db.query(CartItem)
        .filter(
            CartItem.user_id == user.id,
            CartItem.store_name == payload.store_name,
            CartItem.product_url == payload.product_url,
            CartItem.condition == payload.condition,
            CartItem.foil == payload.foil,
        )
        .first()
    )
    if existing:
        existing.quantity += 1
        if existing.card_name_clean is None:
            # Backfill items added before this feature shipped, or where the
            # first attempt ran before the name index had finished loading.
            existing.card_name_clean = await _resolve_clean_name(payload)
    else:
        card_name_clean = await _resolve_clean_name(payload)
        db.add(CartItem(user_id=user.id, card_name_clean=card_name_clean, **payload.model_dump()))
    db.commit()
    return _cart_items(db, user)


async def _resolve_clean_name(payload: CartItemIn) -> str | None:
    """Only eBay's card_name is free listing-title text rather than an
    already-clean parsed name (see ebay.py) — no other store needs this."""
    if payload.store_name != SCRAPERS["ebay"].store_name:
        return None
    return await carddb.match_card_name(payload.card_name)


# Re-scrape every cart item's store listing and pull the current price into
# the snapshot. Matching uses the same listing identity as add_to_cart's
# dedup (product_url + condition + foil); an item that no longer appears in
# stock keeps its old price but gets flagged refresh_missing. Stores run
# concurrently (like the search endpoint); queries within one store run
# sequentially on a shared scraper so we don't hammer any single site.
@router.post("/refresh", response_model=CartRefreshOut)
async def refresh_cart_prices(db: Session = Depends(get_db), user: User = Depends(require_user)):
    items = _cart_items(db, user)
    key_by_store_name = {cls.store_name: key for key, cls in SCRAPERS.items()}

    items_by_key: dict[str, list[CartItem]] = defaultdict(list)
    for item in items:
        key = key_by_store_name.get(item.store_name)
        # A store that's been removed or globally disabled can't be
        # re-checked — leave its items' snapshots untouched.
        if key and is_store_globally_enabled(db, key):
            items_by_key[key].append(item)

    errors: list[dict] = []
    matched: dict[int, object] = {}  # cart item id -> fresh SearchResult
    checked_ids: set[int] = set()

    async def run_store(key: str, store_items: list[CartItem]):
        by_name: dict[str, list[CartItem]] = defaultdict(list)
        for item in store_items:
            by_name[item.card_name].append(item)
        try:
            async with get_scraper(key, **scraper_kwargs(db, key)) as scraper:
                for card_name, name_items in by_name.items():
                    try:
                        if key == "ebay":
                            # card_name is the full listing title here, so an
                            # exact-phrase search pins down the one listing.
                            results = await scraper.search(card_name, exact=True)
                        else:
                            results = await scraper.search(card_name)
                    except Exception as e:
                        logger.warning(f"Cart refresh: scraper '{key}' failed for {card_name!r}: {e}")
                        errors.append({"store": key, "error": f"{card_name}: {e}"})
                        continue
                    in_stock = [r for r in results if r.in_stock]
                    for item in name_items:
                        checked_ids.add(item.id)
                        for r in in_stock:
                            if (
                                r.product_url == item.product_url
                                and r.condition == item.condition
                                and r.foil == item.foil
                            ):
                                matched[item.id] = r
                                break
        except Exception as e:
            logger.warning(f"Cart refresh: scraper '{key}' failed: {e}")
            errors.append({"store": key, "error": str(e)})

    await asyncio.gather(*(run_store(k, v) for k, v in items_by_key.items()))

    currencies = {r.currency for r in matched.values()}
    rates = dict(zip(currencies, await asyncio.gather(*(get_rate_to_aud(c) for c in currencies))))

    now = datetime.utcnow()
    changed = 0
    items_by_id = {item.id: item for item in items}
    for item_id in checked_ids:
        item = items_by_id[item_id]
        item.price_checked_at = now
        result = matched.get(item_id)
        if result is None:
            item.refresh_missing = True
            continue
        item.refresh_missing = False
        fields = priced_fields(result, rates.get(result.currency))
        if fields["price"] != item.price or fields["currency"] != item.currency:
            changed += 1
        item.price = fields["price"]
        item.currency = fields["currency"]
        item.price_original = fields["price_original"]
        item.currency_original = fields["currency_original"]
        item.shipping_price = result.shipping_price
    db.commit()

    missing = len(checked_ids) - len(matched)
    logger.info(
        f"Cart refresh for user {user.username!r}: {len(checked_ids)} checked, "
        f"{changed} changed, {missing} missing, {len(errors)} error(s)"
    )
    return {
        "items": _cart_items(db, user),
        "checked": len(checked_ids),
        "changed": changed,
        "missing": missing,
        "errors": errors,
    }


# Declared before /{item_id} so "store" is never swallowed by the int path
# converter's 422.
@router.delete("/store/{store_name}", response_model=list[CartItemOut])
def clear_store_cart(store_name: str, db: Session = Depends(get_db), user: User = Depends(require_user)):
    db.query(CartItem).filter(CartItem.user_id == user.id, CartItem.store_name == store_name).delete()
    db.commit()
    return _cart_items(db, user)


@router.delete("/{item_id}", response_model=list[CartItemOut])
def delete_cart_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(require_user)):
    deleted = db.query(CartItem).filter(CartItem.id == item_id, CartItem.user_id == user.id).delete()
    if not deleted:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.commit()
    return _cart_items(db, user)


@router.delete("", response_model=list[CartItemOut])
def clear_all_carts(db: Session = Depends(get_db), user: User = Depends(require_user)):
    db.query(CartItem).filter(CartItem.user_id == user.id).delete()
    db.commit()
    return []
