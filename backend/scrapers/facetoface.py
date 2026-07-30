import asyncio
import re
from urllib.parse import quote

from .base import BaseScraper, SearchResult
from .foil_treatment import extract_foil_treatment

BASE_URL = "https://facetofacegames.com"
# Shopify storefront, but search goes through a Shopify app proxy to their
# own Elasticsearch product indexer — raw ES hits (hits.hits[]._source)
# with the full structured card record plus every Shopify variant
# (condition/price/inventory) inlined. No auth, plain JSON GET. Parameters
# are path segments, not a query string; this mirrors the site's own
# buildFetchUrl() in the search page's inline JS.
API_PATH = "/apps/prod-indexer/search"

# The API clamps pageSize to 100 (asking for 200 returns 100).
_PAGE_SIZE = 100
_MAX_PAGES = 3

# The app proxy intermittently throttles with a Cloudflare 503 + Retry-After
# — observed even on the first request of a burst, and an immediate retry
# a second later succeeds despite Retry-After claiming minutes, so the
# header isn't worth honoring. A short fixed backoff clears it in practice.
_MAX_ATTEMPTS = 3
_RETRY_DELAY = 1.5


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip().lower()


def _scalar(src: dict, key: str):
    """ES source fields are scalars on some documents and single-element
    arrays on others (same field, varies per document) — unwrap either."""
    value = src.get(key)
    if isinstance(value, list):
        return value[0] if value else None
    return value


def _foil_treatment(finish: str) -> str | None:
    """Finish beyond plain Non-Foil/Foil names a specific treatment
    ("Etched Foil", ...) — canonicalized against the known-treatment list,
    falling back to F2F's own label verbatim."""
    if finish in ("", "Non-Foil", "Foil"):
        return None
    return extract_foil_treatment(finish) or finish


class FaceToFaceScraper(BaseScraper):
    store_name = "Face to Face Games"
    applies_gst = True

    async def search(self, query: str) -> list[SearchResult]:
        first = await self._fetch_page(query, 1)
        total = (first.get("hits", {}).get("total") or {}).get("value", 0)
        pages = [first]
        nof_pages = -(-total // _PAGE_SIZE)
        if nof_pages > 1:
            pages += await asyncio.gather(
                *(self._fetch_page(query, page) for page in range(2, min(nof_pages, _MAX_PAGES) + 1))
            )

        results: list[SearchResult] = []
        for page in pages:
            for hit in page.get("hits", {}).get("hits", []):
                results.extend(self._parse_hit(hit.get("_source", {})))

        # ES matches across card text and other fields too — same client-side
        # name filter as the other stores.
        needle = _normalize(query)
        return [r for r in results if needle in _normalize(r.card_name)]

    async def _fetch_page(self, query: str, page: int) -> dict:
        # Their own JS double-encodes the keyword (the app proxy decodes one
        # layer before it reaches the indexer) but single-encodes the Game
        # Type segment — match both quirks exactly.
        url = (
            f"{BASE_URL}{API_PATH}"
            f"/{quote('Game Type')}/{quote('Magic: The Gathering')}"
            f"/withFacets/false/pageSize/{_PAGE_SIZE}/page/{page}"
            f"/minimum_price/0.01"
            f"/keyword/{quote(quote(query, safe=''), safe='')}"
        )
        for attempt in range(_MAX_ATTEMPTS):
            response = await self.client.get(url, headers={"Referer": f"{BASE_URL}/"})
            if response.status_code == 503 and attempt < _MAX_ATTEMPTS - 1:
                await asyncio.sleep(_RETRY_DELAY)
                continue
            response.raise_for_status()
            return response.json()

    def _parse_hit(self, src: dict) -> list[SearchResult]:
        card_name = _scalar(src, "Card Name")
        handle = _scalar(src, "handle")
        if not card_name or not handle:
            return []
        # Game Type is already filtered server-side; this guards against
        # MTG-branded non-singles (sealed, supplies).
        if _scalar(src, "product_type") != "Singles":
            return []

        finish = _scalar(src, "Finish") or ""
        language = _scalar(src, "Language") or "English"
        media = src.get("media") or []
        product_image = media[0].get("url") if media else None

        common = dict(
            card_name=card_name,
            set_name=_scalar(src, "Set") or _scalar(src, "MTG_Set_Name") or None,
            collector_number=str(_scalar(src, "Collector Number") or "") or None,
            foil=finish not in ("", "Non-Foil"),
            foil_treatment=_foil_treatment(finish),
            product_url=f"{BASE_URL}/products/{handle}",
            store_name=self.store_name,
            currency="CAD",
            foreign=language != "English",
        )

        results: list[SearchResult] = []
        for variant in src.get("variants") or []:
            condition = next(
                (o.get("value") for o in variant.get("selectedOptions") or [] if o.get("name") == "Condition"),
                None,
            )
            price = variant.get("price")
            if not condition or not isinstance(price, (int, float)):
                continue
            # Out-of-stock variants stay in the index with inventoryQuantity 0
            # — keep them, priced, as in_stock=False. F2F grades NM/PL/HP,
            # already short codes.
            qty = variant.get("inventoryQuantity") or 0
            variant_image = (variant.get("image") or {}).get("url")
            results.append(SearchResult(
                condition=condition,
                price=float(price),
                in_stock=qty > 0,
                quantity_available=qty,
                image_url=variant_image or product_image,
                **common,
            ))
        return results
