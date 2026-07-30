# Cardsniffer

> [!WARNING]
> This project was built with AI assistance. Review carefully before deploying in sensitive environments.

Search a Magic: The Gathering card and see prices/listings across retailer sites, aggregated in one place. Currently scrapes Card Kingdom; more stores will be added over time.

## Features

- Search by card name — live scrape, no stored history beyond basic search logs
- Results show set/printing, condition, foil status, price, stock, and a direct buy link per store
- Settings page: enable/disable individual stores, configure an optional VPN proxy for scraper requests, view live application logs

## Running

### Docker (recommended)

```
docker compose up -d --build
```

App available at http://localhost:6870

### Local dev

Backend:
```
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 6870
```

Frontend:
```
cd frontend
npm install
npm run dev
```

## Roadmap

- Search multiple cards at once (decksearch)
- Save searches as persistent lists
- Group list items by store, so a whole list can be bought from one retailer
