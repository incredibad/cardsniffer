# Changelog

All notable changes to this project will be documented here.

## [0.10.0] - 2026-07-04

### Added
- GUF scraper (fifth store) — an Australian Shopify store with branches in Bendigo, Geelong, Ballarat, Werribee and a Warehouse. Per-branch variants are collapsed into one in-stock/foil result per printing (branch location isn't tracked). Shopify's native search does fuzzy/approximate matching with no exact-only toggle and this store also carries non-MTG merch, so results are kept only when the query is a literal substring of the listing title — otherwise unrelated matches (a same-named enchantment, a Warhammer magazine, a board game) leak in purely from incidental word overlap. Already AUD, no GST (domestic store)

## [0.9.1] - 2026-07-04

### Fixed
- Card Kingdom searches were failing with 403 Forbidden on every request — Cloudflare now issues a full Managed Challenge to plain httpx where it previously let realistic-looking requests through. Switched to curl_cffi with Chrome impersonation, the same fix already applied to MTGMate

## [0.9.0] - 2026-07-04

### Added
- Scryfall autocomplete on the search box — suggestions appear as you type (debounced, 2+ characters), navigable with arrow keys/Enter, selecting one runs the search immediately. Calls Scryfall's public autocomplete endpoint directly from the browser (no backend involved), matching how Scryfall's own API is meant to be used for this

## [0.8.1] - 2026-07-04

### Fixed
- MTGMintCard was badly under-reporting foils by guessing from title text. The listing actually carries an explicit finish badge (Regular / Variants / Foil / Foil Variants / Prerelease) that reliably encodes it — confirmed against product URLs, which independently encode -reg-/-foil- and always agree. The scraper's selector for this badge was matching the wrong element (a same-classed language badge sitting right next to it), which is why an earlier version fell back to unreliable title-text guessing instead of fixing the selector

## [0.8.0] - 2026-07-04

### Added
- Price sort control (low-to-high / high-to-low) above the results grid/table. The selection persists across sessions via localStorage, defaulting to low-to-high

## [0.7.2] - 2026-07-04

### Changed
- Renamed the fourth store from "MTGDude" to "MTGMate" in Settings and search results — MTGDude is the personal tool that fetches the data, but MTG Mate is the actual store it's sourced from, which is the more useful label to compare against the other stores

## [0.7.1] - 2026-07-04

### Fixed
- MTGDude requests were failing outright (connection-level, not an HTTP error) on roughly a quarter of attempts — its Cloudflare front-end appears to be reacting to plain httpx's TLS fingerprint, since manual browser refreshes don't see this. Switched to curl_cffi with Chrome impersonation, matching the pattern already documented for exactly this case in `scrapers/base.py`

## [0.7.0] - 2026-07-04

### Added
- MTGDude scraper (fourth store) — a personal tool that re-serves MTG Mate (an Australian store) results. Parses the embedded React component props (double-HTML-entity-escaped JSON, a known quirk of the source site) rather than following pagination, since the underlying API has a 1000 requests/month cap and this endpoint returns the full unpaginated result set in one call. Already AUD, no GST applied (domestic store)

## [0.6.0] - 2026-07-04

### Added
- Australian GST (10%) is now added to prices from US stores (Card Kingdom, MTGMintCard) after currency conversion, so displayed prices reflect the actual landed cost of importing from overseas. Marked per-scraper via a new `applies_gst` flag on `BaseScraper` so future stores opt in individually

## [0.5.0] - 2026-07-04

### Added
- Hareruya scraper (third store) — queries its Solr-backed search JSON directly. Japanese-language prints and non-playable "Art Card" listings are excluded, keeping only English/other-language playable singles
- All search results are now converted to AUD before being returned, using live exchange rates (cached for 6 hours) — previously each store's results kept their native currency (USD, and now JPY) with no conversion, which made cross-store price comparison meaningless

### Fixed
- Result card/table price formatting used a hardcoded "$" for USD and a raw currency-code prefix otherwise, with two forced decimal places even for zero-decimal currencies like JPY — now uses locale-aware `Intl.NumberFormat` formatting
- Hareruya's search index reports a "stock" count that's inflated by an inconsistent multiplier (varies 6x-24x versus the real per-listing count shown on its own product page) — quantity is no longer surfaced from this store since it can't be trusted, though in-stock/out-of-stock status itself checked out accurate

## [0.4.1] - 2026-07-04

### Fixed
- MTGMintCard scraper was under-reporting results: each row is actually a single, standalone listing rather than an aggregation, and the "Variants" finish badge is unreliable — a card's foil status is now read from its title text (e.g. "Surge Foil", "Chocobo Track Foil") instead, and no rows are skipped anymore. Also fixed a second class-name variant ("lv-spec-pre", used on prerelease rows) that the old selector didn't match at all
- Treatment/printing descriptors (Extended Art, Surge Foil, etc.) are now folded into the displayed set name instead of being silently discarded

## [0.4.0] - 2026-07-04

### Added
- MTGMintCard scraper (second store) — results now aggregate across Card Kingdom and MTGMintCard. "Variants" listings (rows folding multiple foil/nonfoil sub-printings behind one link) are skipped for now since resolving them needs a follow-up request per row

## [0.3.0] - 2026-07-04

### Added
- Grid/table view switcher on the search results — click to toggle between the existing card grid and a new compact table view

## [0.2.4] - 2026-07-04

### Fixed
- Card border color changed from a dark muddy gold that read as reddish to a cleaner, lighter gold tone
- Card images now sit in their own inset, fully-rounded frame instead of bleeding edge-to-edge with only the top corners rounded

## [0.2.3] - 2026-07-04

### Changed
- Cleaned up result card visual design: single thinner outer border instead of a stacked border/divider/badge-border look, borderless tinted "chip" badges for condition and foil, a distinct violet accent for foil instead of a near-identical shade of gold, better card/page background contrast, and more breathing room in the grid (capped at 4 columns, wider gaps)
- Removed the out-of-stock badge from result cards — dead UI now that the search endpoint filters those out server-side

## [0.2.2] - 2026-07-03

### Fixed
- Card Kingdom scraper's in-stock detection was backwards: a condition with no displayed quantity was previously treated as available by default. CK only renders a quantity for conditions it actually has in stock, so those are now correctly excluded — the out-of-stock filter added in 0.2.0 wasn't catching them because they were mislabelled as in-stock upstream

## [0.2.1] - 2026-07-03

### Fixed
- Card Kingdom scraper now queries both the "Singles" and "Foils" tabs — foil listings were previously missing entirely for any card whose foil printing has no "Foil" text in its title (i.e. most regular foils, as opposed to foil-locked promos)

## [0.2.0] - 2026-07-03

### Changed
- Search results no longer include out-of-stock listings

## [0.1.0] - 2026-07-03

### Added
- Initial project scaffold: FastAPI backend, React/Vite frontend, Docker deployment
- Card search page — search by card name, results aggregated across registered scrapers
- Card Kingdom scraper (first store)
- Settings page — per-store enable/disable toggles, VPN proxy URL + connectivity test, live log viewer, app version + GitHub link
- SQLite scaffold with `search_logs` (observability) and `settings` (global key/value) tables
