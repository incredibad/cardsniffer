import re

from .base import BaseScraper, SearchResult

API_URL = "https://mtg-marketplace-production-cca5.up.railway.app/api/cards/search"
CARD_URL = "https://www.cardstars.com.au/card/mtg"

# Card Stars is an Australian marketplace (many independent sellers, not a
# single store) — a fully client-rendered React SPA with no server-rendered
# HTML to scrape, so this hits its backing JSON API directly (found via the
# bundled JS: /api/cards/search?q=...&game_type=mtg). No bot protection
# observed (plain railway-hikari server, no Cloudflare, 4/4 plain requests
# succeeded).
#
# Each row already represents a single seller's listing for one specific
# printing+finish (id is "{scryfall_id}:{finish}") — cross-checked and every
# card+finish combo currently has at most one active seller
# (sellers_count <= 1 across two test queries), so unlike GUF there's no
# need to aggregate/collapse multiple listings per row here. `price_aud` is
# this listing's actual price; `lowest_listing_price` looked like it can be
# scoped to the wrong finish (a foil row showing its nonfoil sibling's
# price) so it's not used. inStock/availableQuantity are 0 for rows that
# are just catalog entries with no live listing, same as any other result
# with no stock — no separate filtering needed since search.py already
# drops non-in_stock results.
#
# Name-based search here only matches actual MTG cards (Scryfall-derived
# catalog), unlike GUF's storefront-wide fuzzy search — checked with a
# single common word ("Throne") and every one of the 22 distinct card names
# returned genuinely contained it, so no fuzzy-result filtering is needed.
#
# Detail-page URLs are cosmetic beyond the scryfall_id (SPA client routing
# does the real lookup from the ID segment), so the trailing name slug just
# needs to be reasonable, not pixel-identical to the site's own slugifier.
_SLUG_RE = re.compile(r"[^a-zA-Z0-9]+")


def _slugify(name: str) -> str:
    return _SLUG_RE.sub("-", name).strip("-")


class CardStarsScraper(BaseScraper):
    store_name = "Card Stars"

    async def search(self, query: str) -> list[SearchResult]:
        response = await self.client.get(
            API_URL,
            params={"q": query, "game_type": "mtg"},
        )
        response.raise_for_status()
        data = response.json()

        results: list[SearchResult] = []
        for card in data.get("cards", []):
            result = self._parse_card(card)
            if result is not None:
                results.append(result)
        return results

    def _parse_card(self, card: dict) -> SearchResult | None:
        scryfall_id = card.get("scryfall_id")
        price = card.get("price_aud")
        if not scryfall_id or price is None:
            return None

        quantity = card.get("availableQuantity")

        return SearchResult(
            card_name=card.get("name", ""),
            set_name=card.get("set_name"),
            collector_number=card.get("collector_number"),
            foil=card.get("finish") != "nonfoil",
            condition=card.get("condition") or "NM",
            price=float(price),
            currency="AUD",
            in_stock=bool(card.get("inStock")),
            quantity_available=quantity or None,
            image_url=card.get("image_url"),
            product_url=f"{CARD_URL}/{scryfall_id}/{_slugify(card.get('name', ''))}",
            store_name=self.store_name,
        )
