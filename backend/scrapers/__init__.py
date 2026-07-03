from .base import BaseScraper, SearchResult
from .card_kingdom import CardKingdomScraper

SCRAPERS: dict[str, type[BaseScraper]] = {
    "card_kingdom": CardKingdomScraper,
}


def get_scraper(key: str, **kwargs) -> BaseScraper:
    cls = SCRAPERS.get(key)
    if cls is None:
        raise ValueError(f"Unknown scraper: {key}")
    return cls(**kwargs)
