import base64
import re
import time

from database import SessionLocal, record_ebay_api_call

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


def _log_api_call():
    """Scrapers aren't handed the request-scoped db session, so this opens
    its own short-lived one — same tradeoff as SearchLog, just per-store
    instead of per-user-search."""
    db = SessionLocal()
    try:
        record_ebay_api_call(db)
    finally:
        db.close()


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
        _log_api_call()
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

    async def search(self, query: str, exact: bool = False) -> list[SearchResult]:
        """`exact=True` is the "eBay Snipe" mode: the raw query text is sent
        to eBay verbatim (no "MTG" appended, no card-name substring check
        against the title) so a free-text term search like "Marvel Foil"
        isn't narrowed down as if it were a specific card name. AU-only,
        Buy-It-Now-only, single-card-category, and lot/bundle exclusion still
        apply — same noise filtering as a normal search, just without the two
        defenses that assume the query names one specific card.
        """
        token = await self._get_token()

        _log_api_call()
        response = await self.client.get(
            SEARCH_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "X-EBAY-C-MARKETPLACE-ID": "EBAY_AU",
            },
            params={
                # "MTG" appended to cut down false positives from unrelated
                # items merely sharing a card's name (matches the user's own
                # manual eBay search habit) — skipped in exact mode, where the
                # query is already a deliberate free-text term.
                "q": query if exact else f"{query} MTG",
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
        # actually contain it — skipped in exact mode, since there's no
        # single card name to check the title against.
        needle = _normalize(query)
        results = []
        for item in items:
            title = item.get("title", "")
            if not exact and needle not in _normalize(title):
                continue
            if _NON_SINGLE_RE.search(title):
                continue
            category_ids = {c.get("categoryId") for c in item.get("categories", [])}
            if _SINGLE_CARD_CATEGORY_ID not in category_ids:
                continue
            result = self._parse_item(item)
            if result is not None:
                results.append(result)
        return results

    def _parse_item(self, item: dict) -> SearchResult | None:
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
        seller_feedback_score = seller.get("feedbackScore")
        seller_feedback_percentage = seller.get("feedbackPercentage")

        shipping_options = item.get("shippingOptions") or []
        shipping_option = shipping_options[0] if shipping_options else {}
        shipping_cost = shipping_option.get("shippingCost") or {}
        shipping_price = shipping_cost.get("value")
        shipping_type = shipping_option.get("shippingCostType")
        delivery_by = shipping_option.get("maxEstimatedDeliveryDate")

        return SearchResult(
            # eBay listing titles are free text with no reliable name/set
            # split (unlike Card Kingdom's consistent "Name (Descriptor)"
            # pattern), so there's no clean way to extract "just the card
            # name" — doing that properly would mean cross-referencing every
            # title against a full card-name database (e.g. Scryfall's
            # ~30k names), well beyond what this scraper does. The raw title
            # is shown as card_name instead: accurate and unique per listing,
            # unlike defaulting to the search query (which is actively wrong
            # in eBay Snipe mode, where the query is a free-text term like
            # "Marvel Foil" rather than any one card's name).
            card_name=title,
            set_name=seller_username,
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
            shipping_price=float(shipping_price) if shipping_price is not None else None,
            listed_at=item.get("itemCreationDate"),
            seller_username=seller_username,
            seller_feedback_score=int(seller_feedback_score) if seller_feedback_score is not None else None,
            seller_feedback_percentage=float(seller_feedback_percentage) if seller_feedback_percentage is not None else None,
            shipping_type=shipping_type,
            delivery_by=delivery_by,
        )
