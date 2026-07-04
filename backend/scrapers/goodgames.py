import asyncio
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .base import BaseScraper, SearchResult
from .foil_treatment import extract_foil_treatment

BASE_URL = "https://tcg.goodgames.com.au"
SUGGEST_URL = f"{BASE_URL}/search/suggest.json"

# Shopify store (Australian). The theme has swapped native search results
# (/search) for a third-party widget (SearchTap) that's fully
# client-rendered — its API needs an auth token we couldn't recover from the
# bundled JS. Shopify's own built-in predictive-search AJAX endpoint
# (/search/suggest.json) is still live underneath the theme swap though, so
# that's what this hits instead.
#
# That endpoint is capped at 10 results (a Shopify platform limit on this
# endpoint, not something a bigger `limit` param can raise) and does
# broader-than-exact-name matching — a single common word can match on SET
# name rather than card name (e.g. "Throne" alone pulled in the entire
# "Throne of Eldraine" set via unrelated cards) — so, same defense as GUF,
# results are kept only if the query is a substring of the title, plus
# type == "MTG Single" to exclude other games this store carries.
#
# Predictive search doesn't expose per-variant price/stock, just a price
# range, so each matched product needs a follow-up request to its
# /products/<handle>.js endpoint for that. Each product has one variant per
# condition x foil combo (Near Mint/Lightly Played/Moderately
# Played/Heavily Played/Damaged, each foil and nonfoil) with an `available`
# boolean (no exact quantity exposed).
_MAX_PRODUCTS = 10

_SET_RE = re.compile(r"Set:\s*(.*?)\s*(?:Type:|$)", re.S)
_SET_BRACKET_RE = re.compile(r"\s*\[[^\[\]]*\]\s*$")
_TREATMENT_RE = re.compile(r"\(([^()]*)\)")
_FOIL_SUFFIX_RE = re.compile(r"\s*foil\s*$", re.I)
_CONDITIONS = {
    "near mint": "NM",
    "lightly played": "LP",
    "moderately played": "MP",
    "heavily played": "HP",
    "damaged": "DMG",
}


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip().lower()


class GoodGamesScraper(BaseScraper):
    store_name = "Good Games TCG"

    async def search(self, query: str) -> list[SearchResult]:
        response = await self.client.get(
            SUGGEST_URL,
            params={"q": query, "resources[type]": "product", "resources[limit]": _MAX_PRODUCTS},
        )
        response.raise_for_status()
        data = response.json()
        products = data.get("resources", {}).get("results", {}).get("products", [])

        needle = _normalize(query)
        matches = [
            p for p in products
            if p.get("type") == "MTG Single" and needle in _normalize(p.get("title", ""))
        ]

        variant_lists = await asyncio.gather(*(self._fetch_variants(p) for p in matches))

        results: list[SearchResult] = []
        for product, variants in zip(matches, variant_lists):
            results.extend(self._parse_product(product, variants))
        return results

    async def _fetch_variants(self, product: dict) -> list[dict]:
        try:
            response = await self.client.get(f"{BASE_URL}/products/{product['handle']}.js")
            response.raise_for_status()
            return response.json().get("variants", [])
        except Exception:
            return []

    def _parse_product(self, product: dict, variants: list[dict]) -> list[SearchResult]:
        title = product.get("title", "")
        image_url = product.get("image")
        product_url = urljoin(BASE_URL, product.get("url", "").split("?", 1)[0])

        desc_text = BeautifulSoup(product.get("body", ""), "lxml").get_text(" ", strip=True)
        set_match = _SET_RE.search(desc_text)
        set_name = set_match.group(1).strip() if set_match else None

        card_name = _SET_BRACKET_RE.sub("", title)
        treatment_match = _TREATMENT_RE.search(card_name)
        foil_treatment = extract_foil_treatment(treatment_match.group(1)) if treatment_match else None
        card_name = _TREATMENT_RE.sub("", card_name).strip()
        if set_name and treatment_match:
            set_name = f"{set_name} — {treatment_match.group(1)}"

        results: list[SearchResult] = []
        for variant in variants:
            price = variant.get("price")
            if price is None:
                continue

            variant_title = (variant.get("title") or "").strip()
            foil = bool(_FOIL_SUFFIX_RE.search(variant_title))
            condition_text = _normalize(_FOIL_SUFFIX_RE.sub("", variant_title))
            condition = _CONDITIONS.get(condition_text, condition_text.upper() or "NM")

            results.append(SearchResult(
                card_name=card_name,
                set_name=set_name,
                collector_number=None,
                foil=foil,
                foil_treatment=foil_treatment if foil else None,
                condition=condition,
                price=round(price / 100, 2),
                currency="AUD",
                in_stock=bool(variant.get("available")),
                quantity_available=None,
                image_url=image_url,
                product_url=product_url,
                store_name=self.store_name,
            ))
        return results
