import re
from urllib.parse import urlencode

from bs4 import BeautifulSoup

from .base import BaseScraper, SearchResult
from .foil_treatment import extract_foil_treatment

BASE_URL = "https://www.hareruyamtg.com"
SEARCH_API_URL = f"{BASE_URL}/en/products/search/unisearch_api"
LAZY_URL = f"{BASE_URL}/en/products/search/unisearch/lazy"
DETAIL_URL = f"{BASE_URL}/en/products/detail"

# Hareruya's search page is a JS-driven SPA — the server-rendered HTML has an
# empty result list that gets filled in by an AJAX call to this Solr-backed
# JSON endpoint (see the page's inline `getUnisearchApi` / unisearch_api
# calls). Hitting it directly skips the site's own follow-up AJAX call
# (unisearch/lazy) that turns this JSON into the actual result markup —
# except we still need that step too, since it's also the only place the
# real per-listing stock count is exposed (see _fetch_accurate_stock below).
# Not disallowed by robots.txt (only /en/products/search?*page=*&sort=*&order=*
# is).
#
# rows has no documented cap — 1000 was observed to return a full 760-result
# set for "Sol Ring" without truncation — so one request covers even the most
# heavily-reprinted staples.
_ROWS = 1000

_STOCK_RE = re.compile(r"Stock:(\d+)")
_PRICE_RE = re.compile(r"[\d,]+")

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

# card_condition on the unisearch_api doc itself is always "1" (NM) for
# regular catalog items — but the site does stock SP/MP/HP for the same
# product behind a per-product "Show All Conditions" table (see
# _fetch_stock_and_conditions below), so this only maps the one condition
# Solr happens to index as the doc's own. Secondhand "Consignment Item"
# listings are the one case where the doc's own card_condition itself varies.
_CONDITIONS = {"1": "NM", "2": "SP", "3": "MP", "4": "HP"}


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip().lower()


def _parse_title(title: str, card_name: str) -> tuple[str | None, str | None, list[str]]:
    """Returns (set_name, collector_number, treatments) parsed from product_name_en.

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
    return set_name, collector_number, treatments


class HareruyaScraper(BaseScraper):
    store_name = "Hareruya"

    async def search(self, query: str) -> list[SearchResult]:
        response = await self.client.get(
            SEARCH_API_URL,
            params={"kw": query, "rows": _ROWS, "page": 1},
        )
        response.raise_for_status()
        data = response.json()
        docs = data.get("response", {}).get("docs", [])

        # Hareruya's Solr-backed search matches on set name and artist as
        # well as card name — confirmed live: "Kang Dynasty" hits "Lizard
        # Blades" because "Kang" is that card's artist and "Dynasty" is part
        # of the Kamigawa: Neon Dynasty set name, and the same happens
        # searching directly on their own site. Filtered down to actual
        # card-name matches only, same defense as Card Kingdom/GUF/Good
        # Games/eBay.
        needle = _normalize(query)
        docs = [d for d in docs if needle in _normalize(d.get("card_name", ""))]

        stock_info = await self._fetch_stock_and_conditions(docs)

        results: list[SearchResult] = []
        for doc, info in zip(docs, stock_info):
            result = self._parse_doc(doc, info["stock"])
            if result is not None:
                results.append(result)
            for other in info["other_conditions"]:
                other_result = self._parse_doc(
                    doc,
                    other["stock"],
                    condition_override=other["condition"],
                    price_override=other["price"],
                    product_class_override=other["product_class"],
                )
                if other_result is not None:
                    results.append(other_result)
        return results

    async def _fetch_stock_and_conditions(self, docs: list[dict]) -> list[dict]:
        """The unisearch_api response's own `stock` field is a decoy (see
        _parse_doc) — the real per-listing count, and any *other* condition
        this same product is separately stocked in, only show up in the
        rendered markup from the site's own second-stage AJAX call, which
        takes the very same docs and server-renders them (batching every doc
        from a search into one call here — confirmed this holds even for
        Sol Ring's 760-listing case, ~7s but correct and in the same order
        as the input docs, so results zip back up by index).

        A regular catalog item isn't NM-only the way the doc's own
        card_condition implies — confirmed live: product 14844 class 110065
        (Anointed Procession) is indexed as NM, but its own "Show All
        Conditions" table lists SP/MP/HP with real, separate stock. That
        table (.tableHere.product, hidden until clicked) is already present
        in this same rendered response, so it's parsed here for free rather
        than needing a per-product detail-page fetch."""
        empty = [{"stock": None, "other_conditions": []} for _ in docs]
        if not docs:
            return []

        form = {}
        for i, doc in enumerate(docs):
            for key, value in doc.items():
                form[f"docs[{i}][{key}]"] = value
        form["css"] = "itemList"

        try:
            response = await self.client.post(
                LAZY_URL,
                data=form,
                headers={"X-Requested-With": "XMLHttpRequest"},
            )
            response.raise_for_status()
        except Exception:
            return empty

        soup = BeautifulSoup(response.text, "lxml")
        items = soup.select("li.itemList")

        # If the rendered count doesn't line up 1:1 with what was sent,
        # bail out to "unknown for everything" rather than risk mis-zipping
        # a result onto the wrong listing.
        if len(items) != len(docs):
            return empty

        results: list[dict] = []
        for item, doc in zip(items, docs):
            stock_el = item.select_one(".itemDetail__stock")
            match = _STOCK_RE.search(stock_el.get_text()) if stock_el else None
            stock = int(match.group(1)) if match else None

            own_class = doc.get("product_class")
            other_conditions = []
            table = item.select_one("div.tableHere.product")
            for row in (table.find_all("div", class_="row", recursive=False) if table else []):
                cells = row.find_all("div", recursive=False)
                if len(cells) < 3:
                    continue
                condition_el = cells[0].find("strong")
                class_el = row.select_one("[data-productclass]")
                product_class = class_el.get("data-productclass") if class_el else None
                price_match = _PRICE_RE.search(cells[1].get_text())
                stock_match = re.search(r"\d+", cells[2].get_text())
                if not condition_el or not product_class or product_class == own_class:
                    continue
                if not price_match or not stock_match:
                    continue
                row_stock = int(stock_match.group())
                if row_stock <= 0:
                    continue
                other_conditions.append({
                    "condition": condition_el.get_text(strip=True),
                    "price": float(price_match.group().replace(",", "")),
                    "stock": row_stock,
                    "product_class": product_class,
                })

            results.append({"stock": stock, "other_conditions": other_conditions})
        return results

    def _parse_doc(
        self,
        doc: dict,
        accurate_stock: int | None = None,
        *,
        condition_override: str | None = None,
        price_override: float | None = None,
        product_class_override: str | None = None,
    ) -> SearchResult | None:
        price = price_override if price_override is not None else doc.get("price")
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

        set_name, collector_number, treatments = _parse_title(doc.get("product_name_en", ""), card_name)
        foil = doc.get("foil_flg") == "1"
        foil_treatment = extract_foil_treatment(*treatments) if foil else None

        lang_code = _LANGUAGES.get(doc.get("language", ""))
        product_class = product_class_override or doc.get("product_class", "")
        product_url = (
            f"{DETAIL_URL}/{doc.get('product', '')}?"
            + urlencode({"lang": lang_code or "EN", "class": product_class})
        )

        # `stock` on the doc itself is a decoy — cross-checked against the
        # real per-listing count (only exposed by the site's second-stage
        # render, see _fetch_stock_and_conditions), it's inflated by a factor
        # that varies per listing (6x-24x, not fixed), while zero-vs-nonzero
        # matched the real figure in every case. So it's only used as a
        # fallback if fetching the accurate count failed outright.
        if accurate_stock is not None:
            in_stock = accurate_stock > 0
            quantity_available = accurate_stock
        else:
            in_stock = int(doc.get("stock") or 0) > 0
            quantity_available = None

        condition = condition_override or _CONDITIONS.get(doc.get("card_condition", ""), "NM")

        return SearchResult(
            card_name=card_name,
            set_name=set_name,
            collector_number=collector_number,
            foil=foil,
            foil_treatment=foil_treatment,
            condition=condition,
            price=float(price),
            currency="JPY",
            in_stock=in_stock,
            quantity_available=quantity_available,
            image_url=doc.get("image_url") or None,
            product_url=product_url,
            store_name=self.store_name,
            is_art=is_art,
            foreign=foreign,
        )
