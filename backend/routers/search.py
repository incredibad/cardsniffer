import asyncio
import logging
from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import crypto
from auth import require_user
from currency import get_rate_to_aud
from database import (
    SearchLog,
    User,
    get_db,
    get_setting,
    get_user_store_enabled,
    is_store_globally_enabled,
    is_store_proxy_enabled,
)
from scrapers import SCRAPERS, get_scraper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])

_GST_RATE = 1.10
_GST_STORE_NAMES = {cls.store_name for cls in SCRAPERS.values() if cls.applies_gst}

# "Art Series" cards are non-playable collector items (just card-sized art, no
# rules text). Some stores list these as regular search hits without a
# scraper-level way to detect it, but the set field reliably names it — so
# results are tagged (not dropped) here regardless of store or the scraper's
# own is_art flag, and the frontend's "show art cards" toggle decides whether
# to display them.
_ART_SET_SUBSTRINGS = ("art series",)


def _is_art(result) -> bool:
    set_name = (result.set_name or "").lower()
    return result.is_art or any(substr in set_name for substr in _ART_SET_SUBSTRINGS)


def scraper_kwargs(db: Session, key: str) -> dict:
    """Constructor kwargs for a scraper — proxy plus any store-specific
    credentials/config from settings. Shared with the cart price refresh."""
    proxy_url = get_setting(db, "vpn_proxy_url", "") if is_store_proxy_enabled(db, key) else ""
    kwargs = {"proxy_url": proxy_url}
    if key == "ebay":
        cert_encrypted = get_setting(db, "ebay_cert_id_encrypted", "")
        kwargs["app_id"] = get_setting(db, "ebay_app_id", "")
        kwargs["cert_id"] = crypto.decrypt(cert_encrypted) if cert_encrypted else ""
    if key == "mtgmate":
        kwargs["base_url"] = get_setting(db, "mtgmate_relay_url", "")
    return kwargs


def priced_fields(result, rate: float | None) -> dict:
    """Display price/currency (AUD conversion + GST where applicable) plus the
    store's original pair — the pricing every surface (search results, cart)
    must agree on. rate=None (exchange rate unavailable) leaves the price
    unconverted."""
    price, currency = result.price, result.currency
    if rate is not None:
        price, currency = round(result.price * rate, 2), "AUD"
    if result.store_name in _GST_STORE_NAMES:
        price = round(price * _GST_RATE, 2)
    return {
        "price": price,
        "currency": currency,
        "price_original": result.price,
        "currency_original": result.currency,
    }


# eBay "Playtest" listings are unofficial proxies (not real WotC Playtest
# cards), identifiable only by the listing title since eBay has no separate
# category/flag for them — same title-substring approach as art cards above,
# and store-agnostic in case any other store's listing titles carry it too.
def _is_playtest(result) -> bool:
    return "playtest" in (result.card_name or "").lower()


@router.get("")
async def search(
    q: str = Query(..., min_length=1),
    store: str | None = Query(None),
    exact: bool = Query(False),
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    if store:
        # "eBay Snipe": a single-store, exact-query search rather than the
        # usual all-enabled-stores aggregate — still respects the store
        # being disabled globally or by this user, same as the normal search.
        if store not in SCRAPERS:
            raise HTTPException(status_code=400, detail=f"Unknown store: {store}")
        if not is_store_globally_enabled(db, store):
            raise HTTPException(status_code=400, detail=f"{SCRAPERS[store].store_name} is disabled in Settings")
        if not get_user_store_enabled(db, user.id, store):
            raise HTTPException(
                status_code=400,
                detail=f"{SCRAPERS[store].store_name} is disabled in your account settings",
            )
        enabled_keys = [store]
    else:
        enabled_keys = [
            key for key in SCRAPERS
            if is_store_globally_enabled(db, key) and get_user_store_enabled(db, user.id, key)
        ]

    errors: list[dict] = []

    async def run_one(key: str):
        try:
            async with get_scraper(key, **scraper_kwargs(db, key)) as scraper:
                if key == "ebay" and exact:
                    return await scraper.search(q, exact=True)
                return await scraper.search(q)
        except Exception as e:
            logger.warning(f"Scraper '{key}' failed for query {q!r}: {e}")
            errors.append({"store": key, "error": str(e)})
            return []

    per_store = await asyncio.gather(*(run_one(k) for k in enabled_keys))
    in_stock = [r for store_results in per_store for r in store_results if r.in_stock]

    currencies = {r.currency for r in in_stock}
    rates = dict(zip(currencies, await asyncio.gather(*(get_rate_to_aud(c) for c in currencies))))
    for currency, rate in rates.items():
        if rate is None:
            errors.append({
                "store": f"currency:{currency}",
                "error": f"Exchange rate unavailable for {currency}; affected prices shown unconverted",
            })

    results = []
    for r in in_stock:
        d = asdict(r)
        d.update(priced_fields(r, rates.get(r.currency)))
        d["is_art"] = _is_art(r)
        d["is_playtest"] = _is_playtest(r)
        results.append(d)

    search_type = "ebay_snipe" if (store == "ebay" and exact) else "search"
    db.add(SearchLog(query=q, result_count=len(results), user_id=user.id, search_type=search_type))
    db.commit()

    logger.info(f"Search {q!r}: {len(results)} results from {len(enabled_keys)} store(s), {len(errors)} error(s)")

    return {"query": q, "results": results, "errors": errors}
