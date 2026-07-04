import asyncio
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from curl_cffi.requests import AsyncSession

from .base import BaseScraper, SearchResult

BASE_URL = "https://www.cardkingdom.com"
SEARCH_URL = f"{BASE_URL}/catalog/search"

# Card Kingdom's search results page embeds full listing data (name, set,
# collector number, and a price/qty per condition) directly in server-rendered
# HTML — no need to follow through to individual /catalog/item/ product pages,
# which robots.txt disallows anyway.
#
# It's Cloudflare-fronted and now issues a full Managed Challenge
# (cf-mitigated: challenge) to plain httpx on every request — this used to
# not be the case (a plain GET with a realistic User-Agent used to sail
# through), so this is presumably a tightening on Cloudflare's/Card
# Kingdom's end rather than anything we did. Chrome impersonation via
# curl_cffi clears it, same fix as MTGMate needed.
#
# Results are split across separate tabs (filter[tab]) rather than being one
# combined listing: "mtg_card" (Singles/nonfoil) and "mtg_foil" (Foils). A
# card with both finishes shows up as two entirely separate result sets, and
# the Foils tab often has no "Foil" text in the title at all (e.g. plain
# "Ragavan, Nimble Pilferer" is the foil listing on that tab) — so foil status
# must come from which tab a block was fetched from, not just title text.
# Title text still matters for foil-only promo prints (e.g. "Prerelease
# Foil") that live on the Singles tab because they have no nonfoil version.
_TABS = ["mtg_card", "mtg_foil"]

_PRICE_RE = re.compile(r"([\d,]+\.\d{2})")
_RARITY_SUFFIX_RE = re.compile(r"\s*\([A-Z]\)\s*$")
_NON_CONDITION_CLASSES = {"itemAddToCart", "active", "disabled", ""}


def _parse_price(text: str) -> float | None:
    m = _PRICE_RE.search(text or "")
    return float(m.group(1).replace(",", "")) if m else None


def _parse_qty(text: str) -> int | None:
    m = re.search(r"(\d+)", text or "")
    return int(m.group(1)) if m else None


class CardKingdomScraper(BaseScraper):
    store_name = "Card Kingdom"
    applies_gst = True

    def __init__(self, proxy_url: str = ""):
        self.client = AsyncSession(
            impersonate="chrome124",
            timeout=15.0,
            allow_redirects=True,
            **({"proxy": proxy_url} if proxy_url else {}),
        )

    async def close(self):
        await self.client.close()

    async def search(self, query: str) -> list[SearchResult]:
        responses = await asyncio.gather(*(self._fetch_tab(query, tab) for tab in _TABS))

        results: list[SearchResult] = []
        for tab, response in zip(_TABS, responses):
            soup = BeautifulSoup(response.text, "lxml")
            force_foil = tab == "mtg_foil"
            for block in soup.select("div.productItemWrapper.productCardWrapper"):
                results.extend(self._parse_product_block(block, force_foil=force_foil))
        return results

    async def _fetch_tab(self, query: str, tab: str):
        response = await self.client.get(
            SEARCH_URL,
            params={"search": "header", "filter[name]": query, "filter[tab]": tab},
        )
        response.raise_for_status()
        return response

    def _parse_product_block(self, block, force_foil: bool = False) -> list[SearchResult]:
        title_el = block.select_one(".productDetailTitle a")
        if not title_el:
            return []

        full_title = title_el.get_text(strip=True)
        card_name = full_title.split(" (", 1)[0].strip()

        set_el = block.select_one(".productDetailSet > a")
        set_name = None
        if set_el:
            set_text = set_el.get_text(" ", strip=True)
            set_name = _RARITY_SUFFIX_RE.sub("", set_text).strip() or None

        collector_el = block.select_one(".collector-number")
        collector_number = None
        if collector_el:
            collector_number = collector_el.get_text(strip=True).replace("Collector #:", "").strip() or None

        # "foil" in full_title.lower() alone false-positives on "(Non-Foil)"/
        # "(Nonfoil)" titles (e.g. Secret Lair prints that spell out the
        # finish) — "foil" is literally a substring of "non-foil". Strip
        # those out first so only a genuine foil mention counts.
        title_lower = full_title.lower()
        for non_foil_phrase in ("non-foil", "non foil", "nonfoil"):
            title_lower = title_lower.replace(non_foil_phrase, "")
        foil = force_foil or "foil" in title_lower

        image_el = block.find("mtg-card-image")
        image_url = image_el.get("src") if image_el else None

        product_url = urljoin(BASE_URL, title_el.get("href", ""))

        common = dict(
            card_name=card_name,
            set_name=set_name,
            collector_number=collector_number,
            foil=foil,
            image_url=image_url,
            product_url=product_url,
            store_name=self.store_name,
            currency="USD",
        )

        results: list[SearchResult] = []

        condition_items = block.select("ul.addToCartByType li.itemAddToCart")
        if condition_items:
            for li in condition_items:
                classes = li.get("class", [])
                condition = next((c for c in classes if c not in _NON_CONDITION_CLASSES), None)
                if not condition:
                    continue
                price = _parse_price((li.select_one(".stylePrice") or li).get_text())
                if price is None:
                    continue
                # A price is shown for every condition a printing has, even ones
                # with zero current stock — CK only renders a .styleQty span for
                # conditions that actually have inventory. A missing qty therefore
                # means unavailable, not "in stock but uncounted".
                qty_el = li.select_one(".styleQty")
                qty = _parse_qty(qty_el.get_text()) if qty_el else None
                in_stock = "disabled" not in classes and qty is not None and qty > 0
                results.append(SearchResult(
                    condition=condition,
                    price=price,
                    in_stock=in_stock,
                    quantity_available=qty,
                    **common,
                ))
        else:
            # Single-price listing with no condition dropdown (e.g. out of stock).
            price_el = block.select_one(".amtAndPrice .stylePrice")
            price = _parse_price(price_el.get_text()) if price_el else None
            if price is not None:
                out_of_stock = block.select_one(".outOfStockNotice") is not None
                results.append(SearchResult(
                    condition="NM",
                    price=price,
                    in_stock=not out_of_stock,
                    quantity_available=None,
                    **common,
                ))

        return results
