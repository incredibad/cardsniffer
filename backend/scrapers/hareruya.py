import re
from urllib.parse import urlencode

from .base import BaseScraper, SearchResult

BASE_URL = "https://www.hareruyamtg.com"
SEARCH_API_URL = f"{BASE_URL}/en/products/search/unisearch_api"
DETAIL_URL = f"{BASE_URL}/en/products/detail"

# Hareruya's search page is a JS-driven SPA — the server-rendered HTML has an
# empty result list that gets filled in by an AJAX call to this Solr-backed
# JSON endpoint (see the page's inline `getUnisearchApi` / unisearch_api
# calls). Hitting it directly skips two more AJAX round-trips the site itself
# makes to turn the JSON into HTML (unisearch -> unisearch/lazy), which exist
# only to render markup we'd have to re-parse anyway. Not disallowed by
# robots.txt (only /en/products/search?*page=*&sort=*&order=* is).
#
# rows has no documented cap — 1000 was observed to return a full 760-result
# set for "Sol Ring" without truncation — so one request covers even the most
# heavily-reprinted staples.
_ROWS = 1000

# language codes from the site's own `languages` JS map; only ones actually
# seen in results matter for the product URL's `lang` query param.
_LANGUAGES = {
    "1": "JP", "2": "EN", "3": "CS", "4": "CT", "5": "FR", "6": "DE",
    "7": "IT", "8": "KO", "9": "PT", "10": "RU", "11": "ES", "12": "AG",
}

# product_name_en looks like: "【Foil】(021)■Borderless■《Ragavan, Nimble
# Pilferer》[MUL]". 【...】 and ■...■ are treatment tags (Foil, Borderless,
# Showcase, Surge・Foil, ...), (...) is a collector number (usually before the
# card name, but occasionally after the set code instead — e.g.
# "《Sol Ring》[40K](250)"), and [...] is the set/product code. foil_flg is the
# authoritative foil signal (unlike Card Kingdom/MTGMintCard, no need to infer
# it from title text). Secondhand "Consignment Item" listings additionally
# tack on free-text grading/condition notes after the set code (e.g.
# "[LEB] SP", "[2ED] BGS5.5") — condition itself comes from card_condition,
# so a trailing fragment that's just a known condition abbreviation is
# dropped rather than doubling up in set_name.
_SET_CODE_RE = re.compile(r"\[([^\[\]]*)\]")
_CARD_NAME_RE = re.compile(r"《[^《》]*》")
_COLLECTOR_RE = re.compile(r"\(([^()]+)\)")
_TREATMENT_TAG_RE = re.compile(r"【([^【】]*)】|■([^■]*)■")
_CONDITION_ABBRS = {"nm", "sp", "sp+", "mp", "mp+", "hp", "hp+", "poor", "ex"}

# card_condition on regular catalog items is always "1" (Hareruya only stocks
# NM new singles), but secondhand "Consignment Item" listings genuinely vary
# across this scale.
_CONDITIONS = {"1": "NM", "2": "SP", "3": "MP", "4": "HP"}


def _parse_title(title: str, card_name: str) -> tuple[str | None, str | None]:
    """Returns (set_name, collector_number) parsed from product_name_en.

    card_name pins down which 《...》 group is the actual card — split-card/
    modal-DFC titles like "《Zidane Tribal》//《Ragavan, Nimble Pilferer》"
    contain more than one, and the API's card_name tells us which face this
    listing/search hit is for.
    """
    card_match = re.search(re.escape(f"《{card_name}》"), title) or _CARD_NAME_RE.search(title)
    prefix = title[: card_match.start()] if card_match else title
    suffix = title[card_match.end():] if card_match else ""

    collector_match_suffix = _COLLECTOR_RE.search(suffix)
    collector_match = _COLLECTOR_RE.search(prefix) or collector_match_suffix
    collector_number = collector_match.group(1).strip() if collector_match else None

    set_match_suffix = _SET_CODE_RE.search(suffix)
    set_match = set_match_suffix or _SET_CODE_RE.search(prefix)
    set_code = set_match.group(1).strip() if set_match else None

    treatments = [g1 or g2 for g1, g2 in _TREATMENT_TAG_RE.findall(prefix + suffix)]

    # Strip whichever of the set-code/collector-number spans were found in
    # the suffix, so what's left is genuinely unaccounted-for text (grading
    # notes, artist-proof markers, ...).
    consumed_spans = [m.span() for m in (set_match_suffix, collector_match_suffix) if m]
    leftover = "".join(
        ch for i, ch in enumerate(suffix)
        if not any(start <= i < end for start, end in consumed_spans)
    )
    leftover = _TREATMENT_TAG_RE.sub("", leftover).strip().lstrip("※").strip()
    if leftover and leftover.lower() not in _CONDITION_ABBRS:
        treatments.append(leftover)

    treatment = " · ".join(dict.fromkeys(t for t in treatments if t))
    set_name = f"{set_code} — {treatment}" if set_code and treatment else set_code
    return set_name, collector_number


class HareruyaScraper(BaseScraper):
    store_name = "Hareruya"

    async def search(self, query: str) -> list[SearchResult]:
        response = await self.client.get(
            SEARCH_API_URL,
            params={"kw": query, "rows": _ROWS, "page": 1},
        )
        response.raise_for_status()
        data = response.json()

        results: list[SearchResult] = []
        for doc in data.get("response", {}).get("docs", []):
            result = self._parse_doc(doc)
            if result is not None:
                results.append(result)
        return results

    def _parse_doc(self, doc: dict) -> SearchResult | None:
        price = doc.get("price")
        if price is None:
            return None

        # language "2" is English; anything else (JP, CS, CT, FR, DE, IT, KO,
        # PT, RU, ES, AG) is a foreign-language print. card_name carries a
        # "【Art Card】" prefix for the non-playable MOM-style Art Series.
        # Neither is dropped here — flagged instead, so the search router's
        # "show foreign cards"/"show art cards" options can decide.
        foreign = doc.get("language") != "2"

        card_name = doc.get("card_name", "")
        is_art = card_name.startswith("【Art Card】")

        set_name, collector_number = _parse_title(doc.get("product_name_en", ""), card_name)

        lang_code = _LANGUAGES.get(doc.get("language", ""))
        product_url = (
            f"{DETAIL_URL}/{doc.get('product', '')}?"
            + urlencode({"lang": lang_code or "EN", "class": doc.get("product_class", "")})
        )

        # `stock` here is not the real per-listing count — cross-checked
        # against the product detail page's own "Stock" column across a
        # dozen listings, the search index's number was inflated by a
        # factor that varies per listing (6x-24x, not a fixed multiplier),
        # while zero-vs-nonzero matched the real figure in every case. So
        # the boolean is trustworthy but the count isn't — report presence,
        # not a fabricated quantity.
        stock = int(doc.get("stock") or 0)

        return SearchResult(
            card_name=card_name,
            set_name=set_name,
            collector_number=collector_number,
            foil=doc.get("foil_flg") == "1",
            condition=_CONDITIONS.get(doc.get("card_condition", ""), "NM"),
            price=float(price),
            currency="JPY",
            in_stock=stock > 0,
            quantity_available=None,
            image_url=doc.get("image_url") or None,
            product_url=product_url,
            store_name=self.store_name,
            is_art=is_art,
            foreign=foreign,
        )
