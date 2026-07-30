import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .base import BaseScraper, SearchResult
from .foil_treatment import extract_foil_treatment

BASE_URL = "https://www.mtgmintcard.com"
SEARCH_URL = f"{BASE_URL}/mtg/singles/search"

# Classic osCommerce/Zen Cart table listing — no bot protection observed
# (plain Apache/CloudFront, no Cloudflare challenge), robots.txt doesn't
# disallow the search path. Plain httpx is fine here.
#
# Each row is a single, standalone listing (one product ID, one price, one
# stock count) — NOT an aggregation of multiple sub-listings, despite what
# the "finish" badge (Regular / Variants / Foil / Foil Variants / Prerelease)
# might suggest.
#
# That badge (span.label-primary, class lv-spec or lv-spec-pre on prerelease
# rows) IS the authoritative foil signal — cross-checked against product
# URLs, which independently encode -reg-/-foil- in the path and always
# agree with it. Two rows can share an identical title differing only by
# this badge (a plain "Ragavan, Nimble Pilferer" row can be either Regular
# or Foil), so title text is NOT a reliable foil signal on its own — a
# previous version of this scraper used it as one because of a selector
# bug: the badge sits right next to a same-classed language badge
# (span.label-success, "ENG"/"JP") and an unqualified `.lv-spec` selector
# matched that one first instead. That same language badge is also the
# signal for non-English listings — flagged via SearchResult.foreign rather
# than dropped, so the search router's "show foreign cards" option decides.

_PRICE_RE = re.compile(r"([\d,]+\.\d{2})")
_BRACKET_RE = re.compile(r"\(([^()]*)\)")


def _parse_price(text: str) -> float | None:
    m = _PRICE_RE.search(text or "")
    return float(m.group(1).replace(",", "")) if m else None


class MtgMintCardScraper(BaseScraper):
    store_name = "MTGMintCard"
    applies_gst = True

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
        name_el = row.select_one(".card-name a")
        if not name_el:
            return None
        full_title = name_el.get_text(strip=True)
        # card_name is the base name; each "(...)" group is a treatment/
        # printing descriptor, e.g. "(Extended Art)", "(Surge Foil)", "(466)".
        card_name = _BRACKET_RE.sub("", full_title).strip()
        bracket_texts = _BRACKET_RE.findall(full_title)
        treatment = " · ".join(bracket_texts)
        product_url = urljoin(BASE_URL, name_el.get("href", ""))

        finish_badge = row.select_one(".label-primary.lv-spec, .label-primary.lv-spec-pre")
        foil = "foil" in finish_badge.get_text(strip=True).lower() if finish_badge else False
        foil_treatment = extract_foil_treatment(full_title) if foil else None

        lang_badge = row.select_one(".label-success")
        foreign = bool(lang_badge) and lang_badge.get_text(strip=True).upper() not in ("", "ENG")

        set_el = row.select_one('td[align="center"] img')
        edition = set_el.get("title", "").strip() or set_el.get("alt", "").strip() if set_el else None
        set_name = f"{edition} — {treatment}" if edition and treatment else (edition or treatment or None)

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
            set_name=set_name,
            collector_number=None,
            foil=foil,
            foil_treatment=foil_treatment,
            condition=condition,
            price=price,
            currency="USD",
            in_stock=in_stock,
            quantity_available=quantity_available,
            image_url=image_url,
            product_url=product_url,
            store_name=self.store_name,
            foreign=foreign,
        )
