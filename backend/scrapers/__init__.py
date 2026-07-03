from .base import BaseScraper, SearchResult
from .card_kingdom import CardKingdomScraper
from .mtgmintcard import MtgMintCardScraper

SCRAPERS: dict[str, type[BaseScraper]] = {
    "card_kingdom": CardKingdomScraper,
    "mtgmintcard": MtgMintCardScraper,
}


def get_scraper(key: str, **kwargs) -> BaseScraper:
    cls = SCRAPERS.get(key)
    if cls is None:
        raise ValueError(f"Unknown scraper: {key}")
    return cls(**kwargs)
