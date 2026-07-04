"""Scraper framework — one subclass per retailer.

To add a new store:
  1. Create backend/scrapers/<store>.py with a class subclassing BaseScraper.
  2. Set store_name and implement `async def search(self, query) -> list[SearchResult]`.
  3. Set applies_gst = True if it's an overseas store that doesn't already
     include Australian GST on imports in its listed prices.
  4. Register it in backend/scrapers/__init__.py's SCRAPERS dict.
That's it — the search router, the Settings page's store toggles, and the
enable/disable persistence all pick up new entries automatically via the
registry; no other files need touching.

If a site requires TLS/JA3 fingerprint impersonation to avoid bot detection,
override __init__/close to swap the httpx.AsyncClient for a
curl_cffi.requests.AsyncSession(impersonate="chrome124") while keeping the
same public search() signature — see card_kingdom.py for the plain-httpx
baseline case.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

import httpx

_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


@dataclass
class SearchResult:
    card_name: str
    set_name: Optional[str]
    collector_number: Optional[str]
    foil: bool
    condition: str  # free-text, normalized per-scraper — stores use different scales
    price: float
    currency: str
    in_stock: bool
    quantity_available: Optional[int]
    image_url: Optional[str]
    product_url: str
    store_name: str
    # Non-playable art-only print (e.g. Secret Lair/Art Series "cards" with no
    # rules text). Most stores don't carry these; scrapers that do should set
    # this instead of dropping the row, so the search router's "show art
    # cards" option can decide whether to include it.
    is_art: bool = False
    # Non-English printing. Most stores are English-only and never set this;
    # scrapers for stores that carry other languages should set it so the
    # search router's "show foreign cards" option can decide whether to
    # include it.
    foreign: bool = False
    # Specific named foil treatment (e.g. "Foil Etched", "Dragonscale Foil",
    # "Surge Foil") when a scraper can tell it apart from a plain foil —
    # shown as the badge label in place of generic "Foil" when set. None
    # (the default) just falls back to "Foil" for any foil=True result.
    foil_treatment: Optional[str] = None
    # Postage cost, shown informationally next to the price — deliberately
    # NOT folded into `price`/GST/currency conversion, since it isn't part of
    # what you pay for the card itself and stores quote it inconsistently
    # (free, flat-rate, calculated-at-checkout). None (the default) means the
    # store doesn't expose a per-listing shipping cost. Always in the same
    # currency as `price` — no separate currency field needed since every
    # scraper that sets this only ever operates in one currency (eBay: AUD).
    shipping_price: Optional[float] = None
    # When the listing was posted, ISO 8601 string, for the frontend's "Date"
    # sort. None (the default) means the store has no such concept — most
    # stores just show current catalog inventory, not individual dated
    # listings, so this is only ever set by eBay for now.
    listed_at: Optional[str] = None


class BaseScraper(ABC):
    """Abstract base class for all store scrapers."""

    store_name: str = ""
    # Australian GST (10%) on low-value imported goods — set True for stores
    # that don't already fold it into their listed price. The search router
    # applies it centrally after currency conversion.
    applies_gst: bool = False

    def __init__(self, proxy_url: str = ""):
        self.client = httpx.AsyncClient(
            timeout=15.0,
            headers=_DEFAULT_HEADERS,
            follow_redirects=True,
            **({"proxy": proxy_url} if proxy_url else {}),
        )

    @abstractmethod
    async def search(self, query: str) -> list[SearchResult]:
        """Search the store for a card name and return all matching printings/conditions."""

    async def close(self):
        await self.client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()
