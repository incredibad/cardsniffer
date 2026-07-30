import asyncio
import re

from .base import BaseScraper, SearchResult
from .foil_treatment import extract_foil_treatment

BASE_URL = "https://starcitygames.com"
# SCG's storefront is BigCommerce, but search is Hawksearch proxied through
# their own domain (so the endpoint never appears in the page HTML — it's
# only visible in the browser's network tab). Plain JSON POST, no auth, no
# bot challenge; plain httpx gets through fine.
API_URL = "https://ajax.starcitygames.com/hawksearch/searchapi/api/v2/search"

# 96 is the site's own maximum page size (its request uses MaxPerPage: 96;
# asking for more, e.g. 100, silently falls back to the 24 default rather
# than clamping). Variant.MaxPerPage controls the *nested* per-condition
# variant list, which is otherwise paginated to a single item per product —
# 32 is what the site itself asks for, far above the realistic ceiling of
# conditions x languages on one printing.
_PAGE_SIZE = 96
_VARIANT_PAGE_SIZE = 32
_MAX_PAGES = 3

# SCG's own condition scale — just NM/PL/HP, no LP/MP distinction.
_CONDITIONS = {"Near Mint": "NM", "Played": "PL", "Heavily Played": "HP"}


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip().lower()


def _first(doc: dict, key: str, default=None):
    """Every Document field is a single-element list; unwrap it."""
    value = doc.get(key)
    if isinstance(value, list):
        return value[0] if value else default
    return value if value is not None else default


def _foil_treatment(finish: str) -> str | None:
    """finish beyond plain Non-foil/Foil names a specific treatment
    ("Foil Etched", "Rainbow Foil", "Pool Party Foil"). Cross-reference the
    known-treatment list for a canonical name, falling back to SCG's own
    label verbatim for treatments the list doesn't know yet."""
    if finish in ("", "Non-foil", "Foil"):
        return None
    return extract_foil_treatment(finish) or finish


class StarCityGamesScraper(BaseScraper):
    store_name = "Star City Games"
    applies_gst = True

    async def search(self, query: str) -> list[SearchResult]:
        first = await self._fetch_page(query, 1)
        pages = [first]
        nof_pages = first.get("Pagination", {}).get("NofPages", 1)
        if nof_pages > 1:
            pages += await asyncio.gather(
                *(self._fetch_page(query, page) for page in range(2, min(nof_pages, _MAX_PAGES) + 1))
            )

        results: list[SearchResult] = []
        for page in pages:
            for hit in page.get("Results", []):
                results.extend(self._parse_document(hit.get("Document", {})))

        # Hawksearch matches on stemmed words across several fields, so e.g.
        # "black lotus" also returns Blacker Lotus. Same client-side name
        # filter as Card Kingdom: keep only results whose actual card name
        # contains the query.
        needle = _normalize(query)
        return [r for r in results if needle in _normalize(r.card_name)]

    async def _fetch_page(self, query: str, page: int) -> dict:
        response = await self.client.post(
            API_URL,
            json={
                "Keyword": query,
                "PageNo": page,
                "MaxPerPage": _PAGE_SIZE,
                "Variant": {"MaxPerPage": _VARIANT_PAGE_SIZE, "PageNo": 1},
                # SCG also sells Flesh and Blood, Lorcana, sealed product etc.
                "FacetSelections": {"game": ["Magic: The Gathering"]},
            },
            headers={"Origin": BASE_URL, "Referer": f"{BASE_URL}/"},
        )
        response.raise_for_status()
        return response.json()

    def _parse_document(self, doc: dict) -> list[SearchResult]:
        card_name = _first(doc, "card_name") or _first(doc, "product_name")
        url_detail = _first(doc, "url_detail")
        if not card_name or not url_detail:
            return []
        # The game facet already excludes other games; product_type guards
        # against MTG-branded non-singles (sealed, accessories) sneaking in.
        if _first(doc, "product_type") != "Singles":
            return []

        finish = _first(doc, "finish") or ""
        parent_language = _first(doc, "language") or "English"

        common = dict(
            card_name=card_name,
            set_name=_first(doc, "set"),
            collector_number=str(_first(doc, "collector_number") or "") or None,
            foil=finish not in ("", "Non-foil"),
            foil_treatment=_foil_treatment(finish),
            image_url=_first(doc, "image"),
            product_url=f"{BASE_URL}{url_detail}",
            store_name=self.store_name,
            currency="USD",
        )

        results: list[SearchResult] = []
        for hits in doc.get("hawk_child_attributes_hits") or []:
            for item in hits.get("Items") or []:
                price_text = _first(item, "calculated_price") or _first(item, "price")
                try:
                    price = float(price_text)
                except (TypeError, ValueError):
                    continue
                condition_raw = _first(item, "condition") or ""
                qty = _first(item, "qty") or 0
                language = _first(item, "variant_language") or parent_language
                # Out-of-stock variants are returned with qty 0 (e.g. every
                # Alpha/Beta Black Lotus) — keep them, priced, as in_stock=False.
                results.append(SearchResult(
                    condition=_CONDITIONS.get(condition_raw, condition_raw or "NM"),
                    price=price,
                    in_stock=qty > 0 and not _first(item, "purchasing_disabled", False),
                    quantity_available=qty,
                    foreign=language != "English",
                    **common,
                ))
        return results
