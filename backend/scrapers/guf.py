import asyncio
import json
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .base import BaseScraper, SearchResult
from .foil_treatment import extract_foil_treatment

BASE_URL = "https://guf.com.au"
SEARCH_URL = f"{BASE_URL}/search"

# Shopify store (Australian — GUF operates physical branches in Bendigo,
# Geelong, Ballarat, Werribee and a Warehouse, all VIC). No bot protection
# observed (plain Cloudflare-fronted, 6/6 plain requests succeeded); see
# card_kingdom.py's history for why that could change later.
#
# Shopify's native search (?type=product) does fuzzy/approximate matching
# with no official "exact only" toggle, and this store also carries non-MTG
# merch (Warhammer, board games, ...) that can surface on a card-name query
# purely from incidental word overlap — e.g. searching "Roaming Throne" also
# returns "Sigil of the Empty Throne" and a Warhammer magazine ("White
# Dwarf"). There's no structural "fuzzy match" marker in the DOM to key off,
# so a result is kept only if the query is a substring of its title —
# cheap, and it catches all the observed noise without over-filtering
# legitimate variant prints (which repeat the full card name in their
# title, e.g. "Roaming Throne (Promo Pack) [...]").
#
# Each card is one product with one variant per (branch) x (foil/nonfoil)
# combo, e.g. "Bendigo", "Geelong Foil" — which physical branch has stock
# isn't something we care about, so same-foil variants collapse into one
# result: in_stock if *any* branch variant is available, price from the
# (consistent) per-finish price. No real per-copy quantity is exposed
# publicly, so quantity_available stays None even when in stock.
#
# Results paginate 10/page; capped at _MAX_PAGES to avoid firing a burst of
# concurrent requests at a single Cloudflare-fronted host for a
# heavily-reprinted staple's search (Sol Ring alone is 17 pages).
_MAX_PAGES = 5

_SET_RE = re.compile(r"Set:\s*(.*?)\s*(?:Type:|$)", re.S)
_SET_BRACKET_RE = re.compile(r"\s*\[[^\[\]]*\]\s*$")
_TREATMENT_RE = re.compile(r"\(([^()]*)\)")


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip().lower()


class GufScraper(BaseScraper):
    store_name = "GUF"

    async def search(self, query: str) -> list[SearchResult]:
        first_page = await self._fetch_page(query, 1)
        first_soup = BeautifulSoup(first_page.text, "lxml")
        total_pages = min(self._total_pages(first_soup), _MAX_PAGES)

        soups = [first_soup]
        if total_pages > 1:
            extra_responses = await asyncio.gather(
                *(self._fetch_page(query, p) for p in range(2, total_pages + 1))
            )
            soups.extend(BeautifulSoup(r.text, "lxml") for r in extra_responses)

        needle = _normalize(query)
        results: list[SearchResult] = []
        for soup in soups:
            for card in soup.select(".product-card-list2"):
                results.extend(self._parse_card(card, needle))
        return results

    async def _fetch_page(self, query: str, page: int):
        response = await self.client.get(
            SEARCH_URL,
            params={"type": "product", "options[prefix]": "last", "q": query, "page": page},
        )
        response.raise_for_status()
        return response

    def _total_pages(self, soup: BeautifulSoup) -> int:
        pagination = soup.select_one(".pagination_collection")
        if not pagination:
            return 1
        page_numbers = [
            int(a.get_text(strip=True))
            for a in pagination.select("a.item")
            if a.get_text(strip=True).isdigit()
        ]
        return max(page_numbers) if page_numbers else 1

    def _parse_card(self, card, needle: str) -> list[SearchResult]:
        title_el = card.select_one(".grid-view-item__title")
        link_el = card.select_one("a[href]")
        variant_select = card.select_one("select.product-form__variants")
        price_el = card.select_one(".product-price[variants]")
        if not title_el or not link_el or not variant_select or not price_el:
            return []

        title = title_el.get_text(strip=True)
        if needle not in _normalize(title):
            return []

        try:
            variant_prices = json.loads(price_el["variants"])
        except (ValueError, TypeError):
            return []

        product_url = urljoin(BASE_URL, link_el["href"].split("?", 1)[0])

        image_el = card.select_one(".grid-view-item__image")
        image_src = image_el.get("src") if image_el else None
        image_url = f"https:{image_src}" if image_src and image_src.startswith("//") else image_src

        desc_el = card.select_one(".product-desc")
        set_match = _SET_RE.search(desc_el.get_text(" ", strip=True)) if desc_el else None
        set_name = set_match.group(1).strip() if set_match else None

        # A title can carry multiple parenthetical descriptors at once (set
        # frame, treatment, language, ...), so keep all of them for display
        # rather than just the first.
        card_name = _SET_BRACKET_RE.sub("", title)
        treatment_groups = _TREATMENT_RE.findall(card_name)
        foil_treatment = extract_foil_treatment(title)
        card_name = _TREATMENT_RE.sub("", card_name).strip()
        if set_name and treatment_groups:
            set_name = " — ".join([set_name, *treatment_groups])

        # Group per-branch variants by finish; branch itself doesn't matter to us.
        groups: dict[bool, list[tuple[str, bool]]] = {False: [], True: []}
        for opt in variant_select.select("option"):
            variant_id = opt.get("value")
            if not variant_id:
                continue
            foil = opt.get_text(strip=True).lower().endswith("foil")
            available = opt.get("data-available") == "1"
            groups[foil].append((variant_id, available))

        results: list[SearchResult] = []
        for foil, variants in groups.items():
            if not variants:
                continue
            in_stock = any(available for _, available in variants)
            variant_id = next((vid for vid, available in variants if available), variants[0][0])
            price_cents = variant_prices.get(variant_id, {}).get("price")
            if price_cents is None:
                continue
            results.append(SearchResult(
                card_name=card_name,
                set_name=set_name,
                collector_number=None,
                foil=foil,
                foil_treatment=foil_treatment if foil else None,
                condition="NM",
                price=round(float(price_cents) / 100, 2),
                currency="AUD",
                in_stock=in_stock,
                quantity_available=None,
                image_url=image_url,
                product_url=product_url,
                store_name=self.store_name,
            ))
        return results
