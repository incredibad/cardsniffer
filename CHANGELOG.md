# Changelog

All notable changes to this project will be documented here.

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
