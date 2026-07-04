import asyncio
import logging
from dataclasses import asdict

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from currency import get_rate_to_aud
from database import SearchLog, get_db, get_setting
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
async def search(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    proxy_url = get_setting(db, "vpn_proxy_url", "")
    enabled_keys = [
        key for key in SCRAPERS
        if get_setting(db, f"store_{key}_enabled", "true") != "false"
    ]

    errors: list[dict] = []

    async def run_one(key: str):
        try:
            async with get_scraper(key, proxy_url=proxy_url) as scraper:
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
