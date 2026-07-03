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
        results.append(d)

    db.add(SearchLog(query=q, result_count=len(results)))
    db.commit()

    logger.info(f"Search {q!r}: {len(results)} results from {len(enabled_keys)} store(s), {len(errors)} error(s)")

    return {"query": q, "results": results, "errors": errors}
