import asyncio
import logging
from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import crypto
from auth import get_current_user
from currency import get_rate_to_aud
from database import SearchLog, User, get_db, get_setting, get_user_store_enabled
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


@router.get("")
async def search(
    q: str = Query(..., min_length=1),
    store: str | None = Query(None),
    exact: bool = Query(False),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    proxy_url = get_setting(db, "vpn_proxy_url", "")

    if store:
        # "eBay Snipe": a single-store, exact-query search rather than the
        # usual all-enabled-stores aggregate — still respects the store
        # being disabled globally or by this user, same as the normal search.
        if store not in SCRAPERS:
            raise HTTPException(status_code=400, detail=f"Unknown store: {store}")
        if get_setting(db, f"store_{store}_enabled", "true") == "false":
            raise HTTPException(status_code=400, detail=f"{SCRAPERS[store].store_name} is disabled in Settings")
        if user and not get_user_store_enabled(db, user.id, store):
            raise HTTPException(
                status_code=400,
                detail=f"{SCRAPERS[store].store_name} is disabled in your account settings",
            )
        enabled_keys = [store]
    else:
        enabled_keys = [
            key for key in SCRAPERS
            if get_setting(db, f"store_{key}_enabled", "true") != "false"
            and (user is None or get_user_store_enabled(db, user.id, key))
        ]

    errors: list[dict] = []

    async def run_one(key: str):
        try:
            kwargs = {"proxy_url": proxy_url}
            if key == "ebay":
                cert_encrypted = get_setting(db, "ebay_cert_id_encrypted", "")
                kwargs["app_id"] = get_setting(db, "ebay_app_id", "")
                kwargs["cert_id"] = crypto.decrypt(cert_encrypted) if cert_encrypted else ""
            async with get_scraper(key, **kwargs) as scraper:
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
        d["price_original"] = r.price
        d["currency_original"] = r.currency
        rate = rates.get(r.currency)
        if rate is not None:
            d["price"] = round(r.price * rate, 2)
            d["currency"] = "AUD"
        if r.store_name in _GST_STORE_NAMES:
            d["price"] = round(d["price"] * _GST_RATE, 2)
        d["is_art"] = _is_art(r)
        results.append(d)

    db.add(SearchLog(query=q, result_count=len(results)))
    db.commit()

    logger.info(f"Search {q!r}: {len(results)} results from {len(enabled_keys)} store(s), {len(errors)} error(s)")

    return {"query": q, "results": results, "errors": errors}
