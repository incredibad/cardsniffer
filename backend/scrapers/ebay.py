import base64
import re
import time

from .base import BaseScraper, SearchResult
from .foil_treatment import extract_foil_treatment

TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token"
SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search"
OAUTH_SCOPE = "https://api.ebay.com/oauth/api_scope"

# Application access tokens (client-credentials grant) are valid ~2h and
# aren't tied to any one search — cached at module level (keyed by app_id)
# so every search doesn't cost an extra round trip, and to stay well clear
# of eBay's token-endpoint rate limit. 60s safety margin against clock skew.
_token_cache: dict[str, tuple[str, float]] = {}

# The Browse API's own `condition`/`conditionId` fields come back as
# "Ungraded"/4000 for essentially every MTG single regardless of actual
# condition — sellers put the real grade as free text in the title instead
# (same as everywhere else on eBay's Trading Card Games category), so it has
# to be parsed out the same way foil treatments are.
_CONDITIONS = {
    "nm": "NM",
    "near mint": "NM",
    "mint": "NM",
    "lp": "LP",
    "lightly played": "LP",
    "mp": "MP",
    "moderately played": "MP",
    "played": "MP",
    "hp": "HP",
    "heavily played": "HP",
    "dmg": "DMG",
    "damaged": "DMG",
    "poor": "DMG",
}
_CONDITION_RE = re.compile(
    r"\b(near mint|lightly played|moderately played|heavily played|damaged|nm|lp|mp|hp|dmg|mint|played|poor)\b",
    re.I,
)

# eBay's own "CCG Individual Cards" category — the one reliable structural
# signal that a listing is a single card rather than a lot/pin/playmat/other
# accessory that merely mentions a card name in its title.
_SINGLE_CARD_CATEGORY_ID = "183454"

# Category filtering alone isn't enough — sellers sometimes mis-categorize
# lot/bundle listings under "CCG Individual Cards" too (confirmed live: a
# "Pin & Accessory Collection Lot" listing sat in that category), so titles
# are also screened for bundle language as a second defense.
_NON_SINGLE_RE = re.compile(r"\b(lot|bundle|collection)\b", re.I)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip().lower()


class EbayScraper(BaseScraper):
    store_name = "eBay"

    def __init__(self, proxy_url: str = "", app_id: str = "", cert_id: str = ""):
        super().__init__(proxy_url=proxy_url)
        self.app_id = app_id
        self.cert_id = cert_id

    async def _get_token(self) -> str:
        if not self.app_id or not self.cert_id:
            raise RuntimeError("eBay App ID / Cert ID not configured (Settings → General)")

        cached = _token_cache.get(self.app_id)
        if cached and cached[1] > time.monotonic():
            return cached[0]

        credentials = base64.b64encode(f"{self.app_id}:{self.cert_id}".encode()).decode()
        response = await self.client.post(
            TOKEN_URL,
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials", "scope": OAUTH_SCOPE},
        )
        response.raise_for_status()
        data = response.json()
        token = data["access_token"]
        _token_cache[self.app_id] = (token, time.monotonic() + data.get("expires_in", 7200) - 60)
        return token

    async def search(self, query: str) -> list[SearchResult]:
        token = await self._get_token()

        response = await self.client.get(
            SEARCH_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "X-EBAY-C-MARKETPLACE-ID": "EBAY_AU",
            },
            params={
                # "MTG" appended to cut down false positives from unrelated
                # items merely sharing a card's name (matches the user's own
                # manual eBay search habit).
                "q": f"{query} MTG",
                # Buyer requirements agreed up front: Australian listings only
                # (not just AU postage — the item's actual location) and Buy
                # It Now only. FIXED_PRICE is already the default buying
                # option (AUCTION is excluded unless explicitly requested),
                # but it's listed explicitly rather than relied on implicitly.
                "filter": "itemLocationCountry:AU,buyingOptions:{FIXED_PRICE}",
                "limit": "200",
            },
        )
        response.raise_for_status()
        items = response.json().get("itemSummaries", [])

        # Same defense as Card Kingdom/GUF/Good Games: eBay's search matches
        # anywhere in the title, so a query can pull in items that only
        # happen to mention the card name in passing. Keep only titles that
        # actually contain it.
        needle = _normalize(query)
        results = []
        for item in items:
            title = item.get("title", "")
            if needle not in _normalize(title):
                continue
            if _NON_SINGLE_RE.search(title):
                continue
            category_ids = {c.get("categoryId") for c in item.get("categories", [])}
            if _SINGLE_CARD_CATEGORY_ID not in category_ids:
                continue
            result = self._parse_item(query, item)
            if result is not None:
                results.append(result)
        return results

    def _parse_item(self, query: str, item: dict) -> SearchResult | None:
        price_info = item.get("price") or {}
        price = price_info.get("value")
        if price is None:
            return None

        title = item.get("title", "")

        foil_treatment = extract_foil_treatment(title)
        foil = foil_treatment is not None or bool(re.search(r"\bfoil\b", title, re.I))

        condition_match = _CONDITION_RE.search(title)
        condition = _CONDITIONS.get(condition_match.group(1).lower(), "NM") if condition_match else "NM"

        seller = item.get("seller") or {}
        seller_username = seller.get("username")

        return SearchResult(
            card_name=query.strip(),
            # eBay listing titles are free text with no reliable name/set
            # split (unlike Card Kingdom's consistent "Name (Descriptor)"
            # pattern) — the full title is carried in set_name instead so
            # none of that context (set, promo, seller's own condition note)
            # is lost, even though it isn't a clean set name.
            set_name=f"{title} · {seller_username}" if seller_username else title,
            collector_number=None,
            foil=foil,
            foil_treatment=foil_treatment if foil else None,
            condition=condition,
            price=float(price),
            currency=price_info.get("currency", "AUD"),
            in_stock=True,
            quantity_available=None,
            image_url=(item.get("image") or {}).get("imageUrl"),
            product_url=item.get("itemWebUrl", ""),
            store_name=self.store_name,
        )
