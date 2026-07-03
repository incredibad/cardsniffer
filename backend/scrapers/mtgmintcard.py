import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .base import BaseScraper, SearchResult

BASE_URL = "https://www.mtgmintcard.com"
SEARCH_URL = f"{BASE_URL}/mtg/singles/search"

# Classic osCommerce/Zen Cart table listing — no bot protection observed
# (plain Apache/CloudFront, no Cloudflare challenge), robots.txt doesn't
# disallow the search path. Plain httpx is fine here.
#
# Each result row's "finish" label is one of Regular / Foil / Variants.
# "Variants" means the row folds multiple foil/nonfoil sub-listings behind
# one link, with no price/stock/foil breakdown on the search page itself —
# resolving it would mean an extra request per Variants row (an N+1 pattern
# that doesn't scale well for a live search). Those rows are skipped for now;
# only rows with an unambiguous Regular/Foil label are returned.

_PRICE_RE = re.compile(r"([\d,]+\.\d{2})")


def _parse_price(text: str) -> float | None:
    m = _PRICE_RE.search(text or "")
    return float(m.group(1).replace(",", "")) if m else None


class MtgMintCardScraper(BaseScraper):
    store_name = "MTGMintCard"

    async def search(self, query: str) -> list[SearchResult]:
        response = await self.client.get(
            SEARCH_URL,
            params={"keywords": query, "action": "normal_search"},
        )
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "lxml")

        results: list[SearchResult] = []
        for row in soup.select("tr#product_list_content"):
            result = self._parse_row(row)
            if result is not None:
                results.append(result)
        return results

    def _parse_row(self, row) -> SearchResult | None:
        finish_el = row.select_one(".label-primary.lv-spec")
        finish = finish_el.get_text(strip=True) if finish_el else None
        if finish not in ("Regular", "Foil"):
            return None  # skip "Variants" rows and anything unrecognized

        name_el = row.select_one(".card-name a")
        if not name_el:
            return None
        full_title = name_el.get_text(strip=True)
        card_name = full_title.split(" (", 1)[0].strip()
        product_url = urljoin(BASE_URL, name_el.get("href", ""))

        set_el = row.select_one('td[align="center"] img')
        set_name = set_el.get("title", "").strip() or set_el.get("alt", "").strip() if set_el else None

        image_el = row.select_one(".lv-image img")
        image_url = urljoin(BASE_URL, image_el.get("src", "")) if image_el else None

        condition_el = row.select_one("td.text-left div.text-left")
        condition = condition_el.get_text(strip=True) if condition_el else "NM"

        price_el = row.select_one('[id^="lv-"][id$="-price"] strong')
        price = _parse_price(price_el.get_text()) if price_el else None
        if price is None:
            return None

        # The qty <ol> lists selectable quantities as li *text* (0, 1, 2, ...) —
        # the li's `value` attribute is just the product's internal ID, repeated
        # on every option, not a quantity. Max selectable text value = stock count.
        qty_el = row.select_one('[id^="lv-"][id$="-qty"]')
        in_stock = False
        quantity_available = None
        if qty_el and qty_el.select_one("a.addToCart"):
            qty_values = [
                int(text)
                for li in qty_el.select("ol#selectable li[value]")
                if (text := li.get_text(strip=True)).isdigit()
            ]
            quantity_available = max(qty_values) if qty_values else None
            in_stock = bool(quantity_available)

        return SearchResult(
            card_name=card_name,
            set_name=set_name or None,
            collector_number=None,
            foil=finish == "Foil",
            condition=condition,
            price=price,
            currency="USD",
            in_stock=in_stock,
            quantity_available=quantity_available,
            image_url=image_url,
            product_url=product_url,
            store_name=self.store_name,
        )
