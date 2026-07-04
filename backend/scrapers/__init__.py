from .base import BaseScraper, SearchResult
from .card_kingdom import CardKingdomScraper
from .cardstars import CardStarsScraper
from .ebay import EbayScraper
from .goodgames import GoodGamesScraper
from .guf import GufScraper
from .hareruya import HareruyaScraper
from .mtgmate import MtgMateScraper
from .mtgmintcard import MtgMintCardScraper

SCRAPERS: dict[str, type[BaseScraper]] = {
    "card_kingdom": CardKingdomScraper,
    "mtgmintcard": MtgMintCardScraper,
    "hareruya": HareruyaScraper,
    "mtgmate": MtgMateScraper,
    "guf": GufScraper,
    "cardstars": CardStarsScraper,
    "goodgames": GoodGamesScraper,
    "ebay": EbayScraper,
}


def get_scraper(key: str, **kwargs) -> BaseScraper:
    cls = SCRAPERS.get(key)
    if cls is None:
        raise ValueError(f"Unknown scraper: {key}")
    return cls(**kwargs)
