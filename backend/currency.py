import logging
import time

import httpx

logger = logging.getLogger(__name__)

# Free, keyless, ECB-backed rates — good enough for a "roughly what this
# costs in AUD" comparison across stores, not for financial accuracy.
_RATES_URL = "https://api.frankfurter.app/latest"
_CACHE_TTL = 6 * 3600

_cache: dict[str, tuple[float, float]] = {}  # currency -> (rate_to_aud, fetched_at)


async def get_rate_to_aud(currency: str) -> float | None:
    """How many AUD one unit of `currency` is worth, or None if unavailable."""
    if currency == "AUD":
        return 1.0

    cached = _cache.get(currency)
    if cached and time.time() - cached[1] < _CACHE_TTL:
        return cached[0]

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(_RATES_URL, params={"from": currency, "to": "AUD"})
            response.raise_for_status()
            rate = response.json()["rates"]["AUD"]
    except Exception as e:
        logger.warning(f"Exchange rate lookup failed for {currency}->AUD: {e}")
        # Serve a stale rate rather than nothing if we have one cached.
        return cached[0] if cached else None

    _cache[currency] = (rate, time.time())
    return rate
