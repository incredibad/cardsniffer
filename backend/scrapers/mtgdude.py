import html
import json
from urllib.parse import urljoin

from .base import BaseScraper, SearchResult

BASE_URL = "https://mtgdb.timhedley.com"
STORE_URL = "https://www.mtgmate.com.au"

# MTGDude is a personal tool (Tim's own) that scrapes MTG Mate (an Australian
# store, mtgmate.com.au) and re-serves the results. It's rate-limited to
# 1000 requests/month on their end — one search here is one request there,
# so don't add retries, pagination follow-up requests, or anything else that
# multiplies calls per search.
#
# The page embeds its data as a React component's props: a `data-react-props`
# attribute holding JSON, HTML-entity-escaped. That JSON is itself
# double-escaped (a bug on the mtgdude side, confirmed and left as-is per
# Tim) — decode entities twice to get real JSON.
#
# The props shape is a normalized/deduped structure: `cards` is the result
# list (quantity, colour, card type, set name, finish per row) but its
# uuid/variant/name/price/rarity fields are all just the same lookup key,
# not literal values — the actual name/price/image/link/condition live in
# `uuid`, a dict keyed by that same id. `condition` has only ever been seen
# as "Regular" (mapped to NM below); `finish` is Nonfoil/Foil/Etched, with
# Etched treated as foil like the other scrapers' etched/surge-foil variants.
# `price` is in AUD cents. No pagination cap observed in this HTML mode
# (unlike the tool's earlier markdown mode, which capped at 20 rows/page).
_CONDITIONS = {"Regular": "NM"}


def _extract_props(html_text: str) -> dict:
    once = html.unescape(html_text)
    marker = 'data-react-props="'
    start = once.index(marker) + len(marker)
    raw = html.unescape(once[start:])
    data, _ = json.JSONDecoder().raw_decode(raw)
    return data


class MtgDudeScraper(BaseScraper):
    store_name = "MTGDude"

    async def search(self, query: str) -> list[SearchResult]:
        response = await self.client.get(BASE_URL, params={"q": query})
        response.raise_for_status()

        try:
            data = _extract_props(response.text)
        except ValueError:
            return []

        lookup = data.get("uuid", {})
        results: list[SearchResult] = []
        for card in data.get("cards", []):
            detail = lookup.get(card.get("uuid"))
            if detail is None:
                continue
            results.append(self._parse_card(card, detail))
        return results

    def _parse_card(self, card: dict, detail: dict) -> SearchResult:
        link_path = detail.get("link_path", "")
        collector_number = link_path.rsplit("/", 1)[-1].split(":", 1)[0] or None

        quantity = int(card.get("quantity") or 0)
        price_cents = detail.get("price") or 0

        return SearchResult(
            card_name=detail.get("name", ""),
            set_name=card.get("set") or detail.get("set_name"),
            collector_number=collector_number,
            foil=detail.get("finish") != "Nonfoil",
            condition=_CONDITIONS.get(detail.get("condition", ""), "NM"),
            price=round(price_cents / 100, 2),
            currency="AUD",
            in_stock=quantity > 0,
            quantity_available=quantity or None,
            image_url=detail.get("image") or None,
            product_url=urljoin(STORE_URL, link_path),
            store_name=self.store_name,
        )
