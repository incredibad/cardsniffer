import asyncio
import logging
from dataclasses import asdict

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import SearchLog, get_db, get_setting
from scrapers import SCRAPERS, get_scraper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])


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
    results = [
        asdict(r)
        for store_results in per_store
        for r in store_results
        if r.in_stock
    ]

    db.add(SearchLog(query=q, result_count=len(results)))
    db.commit()

    logger.info(f"Search {q!r}: {len(results)} results from {len(enabled_keys)} store(s), {len(errors)} error(s)")

    return {"query": q, "results": results, "errors": errors}
