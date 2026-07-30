import html
import json
from urllib.parse import urljoin

from curl_cffi.requests import AsyncSession

from .base import BaseScraper, SearchResult

STORE_URL = "https://www.mtgmate.com.au"

# This scraper doesn't talk to MTGMate directly — it hits a personal relay
# tool (base_url, Settings → Admin → Stores → MTGMate Relay) that scrapes MTG
# Mate (an Australian store, mtgmate.com.au) and re-serves the results in its
# own specific format (see _extract_props below). That format is unique to
# this one relay, not a generic MTGMate integration, so there's no fallback
# for scraping the store directly if base_url isn't configured — the store
# is force-disabled system-wide instead (database.is_store_globally_enabled).
# The relay is rate-limited to 1000 requests/month on its own end — one
# search here is one request there, so don't add retries, pagination
# follow-up requests, or anything else that multiplies calls per search.
#
# It's Cloudflare-fronted and plain httpx connections to it fail outright
# (not an HTTP error — the connection itself is refused/dropped) on roughly
# a quarter of requests, apparently on TLS fingerprint rather than rate —
# manual browser refreshes don't see this. Chrome impersonation via
# curl_cffi clears it up almost entirely.
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
# as "Regular" (mapped to NM below). `finish` is Nonfoil/Foil for the plain
# cases, but MTGMate carries other named treatments too (seen: "Etched";
# reported: "Mana Foil", not yet confirmed against a live in-stock listing
# since testing would burn the 1000/month limit chasing it) — so any finish
# beyond plain Nonfoil/Foil is treated as a specific treatment name rather
# than assuming an exhaustive fixed set (see _foil_treatment below).
# `price` is in AUD cents. No pagination cap observed in this HTML mode
# (unlike the tool's earlier markdown mode, which capped at 20 rows/page).
_CONDITIONS = {"Regular": "NM"}


def _foil_treatment(finish: str) -> str | None:
    """finish beyond plain Nonfoil/Foil names a specific treatment. Used
    verbatim if it already reads as one ("Mana Foil"); "Foil" is appended
    for a bare treatment word that doesn't already say it ("Etched" ->
    "Foil Etched", matching WotC's own naming for that treatment)."""
    if finish in ("", "Nonfoil", "Foil"):
        return None
    if "foil" in finish.lower():
        return finish
    return f"Foil {finish}"


def _extract_props(html_text: str) -> dict:
    once = html.unescape(html_text)
    marker = 'data-react-props="'
    start = once.index(marker) + len(marker)
    raw = html.unescape(once[start:])
    data, _ = json.JSONDecoder().raw_decode(raw)
    return data


class MtgMateScraper(BaseScraper):
    store_name = "MTGMate"

    def __init__(self, proxy_url: str = "", base_url: str = ""):
        self.base_url = base_url
        self.client = AsyncSession(
            impersonate="chrome124",
            timeout=15.0,
            allow_redirects=True,
            **({"proxy": proxy_url} if proxy_url else {}),
        )

    async def close(self):
        await self.client.close()

    async def search(self, query: str) -> list[SearchResult]:
        if not self.base_url:
            raise RuntimeError("MTGMate relay URL not configured (Settings → Admin → Stores)")

        response = await self.client.get(self.base_url, params={"q": query})
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

        foil_treatment = _foil_treatment(detail.get("finish") or "")

        return SearchResult(
            card_name=detail.get("name", ""),
            set_name=card.get("set") or detail.get("set_name"),
            collector_number=collector_number,
            foil=detail.get("finish") != "Nonfoil",
            foil_treatment=foil_treatment,
            condition=_CONDITIONS.get(detail.get("condition", ""), "NM"),
            price=round(price_cents / 100, 2),
            currency="AUD",
            in_stock=quantity > 0,
            quantity_available=quantity or None,
            image_url=detail.get("image") or None,
            product_url=urljoin(STORE_URL, link_path),
            store_name=self.store_name,
        )
