# Changelog

All notable changes to this project will be documented here.

## [0.22.0] - 2026-07-04

### Added
- User accounts with admin/regular roles, ahead of future multi-user features like saved lists — not just a single admin flag, proper `users` + `auth_sessions` tables
- First load with no accounts prompts to create the initial admin account (Settings → Admin tab); once one exists, the same tab shows a login form instead
- Admin-only: Stores, VPN Proxy, and Logs sections in Settings, plus a new Users panel (create/delete users, grant or revoke admin, see each user's last-seen time). Guards against deleting or demoting the last remaining admin
- Session-based auth via an HttpOnly cookie (server-side session table, not a JWT, so logout/deletion actually revokes it) — passwords hashed with PBKDF2-SHA256 (600k iterations), no new dependency needed
- Search and the dark/light theme toggle remain fully public/unauthenticated, as does the About section (version + GitHub link) in Settings

## [0.21.2] - 2026-07-04

### Fixed
- Image preview and truncated-text tooltips could render off the top of the screen for rows near the top of the viewport — they always anchored above the trigger regardless of available space. Both now flip below when there isn't enough room above, and clamp their own size to whichever space is actually available

## [0.21.1] - 2026-07-04

### Fixed
- Truncated-text tooltips and the table-view image preview were being clipped by their container's own `overflow-hidden` (needed for corner rounding) — both now render into a portal on `document.body`, positioned from the trigger's own bounding rect, so they escape any ancestor clipping entirely
- Image preview enlarged well past any on-page rendering (up to 28rem, capped at 85% of viewport width so it never overflows on small screens)
- Autocomplete could still reopen after a search completed, even with the input unfocused — a debounced fetch scheduled from typing earlier could still resolve afterward and repopulate the list. Now cancelled (both the pending timer and any in-flight request) the moment a search starts

## [0.21.0] - 2026-07-04

### Added
- Truncated card name/set fields (grid and table view) now reveal a styled tooltip with the full value on tap or hover, instead of relying on the browser's native title tooltip — only appears when the text is actually overflowing, measured per-field
- Tapping/hovering a thumbnail in table/list view shows a much larger preview of the same image in a styled popover above it; tapping elsewhere closes it

### Changed
- Mobile table view: store pill moved back to row 2, right-aligned (sitting above the Buy button); Qty moved to row 3 in the spot the store pill vacated, next to the Buy button

## [0.20.6] - 2026-07-04

### Changed
- Mobile table view: bigger price font, "X in stock" shortened to "Qty: X" to save space, and the store pill moved to sit between the price and Buy button

## [0.20.5] - 2026-07-04

### Changed
- Mobile table view rebuilt to a simple explicit spec: column A is the image alone, column B is three stacked rows — name/set (full width), condition + store pill, then price + Buy button

## [0.20.4] - 2026-07-04

### Fixed
- Mobile table view row was ballooning in height and scattering the condition chip and price/store/buy block into disconnected floating positions — caused by the thumbnail having no definite height (relying on stretch with no `aspect-ratio` to anchor it), which let it balloon and drag the whole row tall. Given a fixed `aspect-[5/7]` box again, with everything in that row now vertically centered and tightly grouped instead of stretched to fill artificial space

## [0.20.3] - 2026-07-04

### Fixed
- Mobile table view thumbnail was ballooning to take up the full row width — deriving its width from `aspect-ratio` off a stretched height turned out unreliable in practice. Given a fixed width instead, with height still stretching to match the row and `object-cover` cropping it cleanly

## [0.20.2] - 2026-07-04

### Changed
- Mobile table view restructured again: image is now its own full-height column (width follows from its aspect ratio), name/set take the full width of the second column, and condition/price/store/buy form two columns underneath that

### Fixed
- Autocomplete suggestions could reappear after a completed search — the stale list was never cleared (only closed), so refocusing the input brought back results from before the search. Now cleared alongside closing it

## [0.20.1] - 2026-07-04

### Changed
- Mobile table view: name/set now get the full row width on their own line instead of being squeezed beside the thumbnail (which left a dead gap next to short names). Image and the rest of the details (condition, price, store, buy) form a two-column row underneath, with the thumbnail sized up now that it isn't competing with the text for width

## [0.20.0] - 2026-07-04

### Changed
- Rebuilt mobile table view — it was one flex row that reflowed organically based on how much fit, so the wrap point shifted per row (long vs short card names) and produced a staggered, off-centre look. Replaced with a deliberate mobile layout mirroring grid view's own card design: a larger portrait thumbnail beside stacked info, with price/store/buy pinned to the bottom — consistent row-to-row and makes proper use of the vertical space. Desktop keeps its single-line table-style row

## [0.19.2] - 2026-07-04

### Changed
- Search button shows just an icon (magnifying glass, or spinner while loading) on mobile instead of icon + "Search" text, saving space next to the input — desktop keeps the text label

## [0.19.1] - 2026-07-04

### Fixed
- Autocomplete suggestions dropdown was being clipped by the search bar's own container — the `overflow-hidden` added to round the Search Options bar's tinted background was also cutting off the dropdown, since it's absolutely positioned inside that same container. Removed the outer `overflow-hidden` and rounded the Search Options header/content directly instead (the same fix already used for card corners a few versions back)

## [0.19.0] - 2026-07-04

### Added
- Search input is focused automatically on page load, and blurred as soon as a search starts (closes the mobile keyboard immediately rather than waiting for results)

### Changed
- Table view no longer uses a rigid `<table>` — it's now a wrapping flex row per result, so on narrow screens the price/store/buy group drops to its own line below the card name instead of forcing the row off the right edge of the screen. Card art is a bit larger too, since portrait art has vertical room to work with once the row wraps
- Removed the "(N hidden)" note from the results count — it read as an error/warning for something that's just the Search Options toggles doing their job

## [0.18.2] - 2026-07-04

### Changed
- Removed the "Search for a card" heading and description above the search box — the search bar is self-explanatory
- Search Options: the checkbox/pricing row now has its own distinct tint from the header row above it, with even top/bottom padding instead of sitting flush against the header

## [0.18.1] - 2026-07-04

### Changed
- Search Options bar made more compact: shorter header row, tighter padding on the checkboxes/pricing toggle below, and a slightly tinted background distinguishing it from the search box above it

### Fixed
- Grid/table view mode wasn't actually remembered across visits (unlike sort order, which already was) — now persisted per-browser like the rest of the search settings

## [0.18.0] - 2026-07-04

### Changed
- Search Options is now a collapsible bar adjoined directly to the bottom of the search box, forming one bordered element instead of two separate pieces — click the header to expand/collapse it (remembered per-browser)
- Search button now shares the same rounded corners as the search input

## [0.17.0] - 2026-07-04

### Added
- Search Options: AUD/Original pricing toggle, with an (i) icon (hover or tap) explaining that GST is added on top of the AUD figure for stores where it isn't already included. The API now returns both the original store price/currency and the converted AUD figure on every result, so switching is instant with no re-search — same pattern as the art/foreign toggles

## [0.16.0] - 2026-07-04

### Added
- Search Options: "Show art cards" and "Show foreign cards" toggles above results, both off by default and remembered per-browser. Every search still fetches everything from every store — the toggles just show/hide already-fetched results instantly, no re-search needed when you flip them

### Changed
- Backend no longer discards art-only or foreign-language listings before they reach the app — Hareruya (and, for foreign, MTGMintCard's language badge) now tag them instead, and the "Art Series" set-name check from 0.15.0 tags rather than drops. This broadens "foreign" on Hareruya from Japanese-only to any non-English printing, since the new toggle is framed as an English/foreign switch

### Fixed
- MTGMintCard listings in a language other than English were previously shown unmarked (no filtering existed for that store at all) — now flagged via its language badge like everything else

## [0.15.0] - 2026-07-04

### Added
- Art Series listings (non-playable card-sized art prints, no rules text) are now filtered out of results from every store, not just Hareruya — detected by "Art Series" appearing in the set field, checked centrally in the search endpoint so new scrapers get this for free

## [0.14.5] - 2026-07-04

### Fixed
- Grid card image/content corners: use full `rounded-2xl` (all four corners) as a plain Tailwind class on both the image and content divs, replacing the previous top-only/bottom-only inline-style attempt

## [0.14.4] - 2026-07-04

### Fixed
- Grid card image/content corners really were still square in some browsers — the `rounded-t-2xl`/`rounded-b-2xl` Tailwind classes on those two divs weren't taking effect despite being present in the built CSS, but an inline `border-radius` style does. Switched both to inline styles, which take precedence over any conflicting rule regardless of cascade order

## [0.14.3] - 2026-07-04

### Fixed
- Grid card bottom corners were still square — the content area was relying on the outer card's clip instead of rounding itself, unlike the image area above it. Gave it its own background + `overflow-hidden` so it clips its own bottom corners independently, the same fix already applied to the image on top

## [0.14.2] - 2026-07-04

### Fixed
- Grid card corners could render square instead of rounded on some cards — the outer card's `overflow-hidden` clip wasn't reliably rounding the image and content areas at the exact corner pixels in every browser, so the matching radius is now also set directly on the image and content elements themselves

## [0.14.1] - 2026-07-04

### Fixed
- Grid view card images now bleed to the card's edges instead of sitting in a padded inset

## [0.14.0] - 2026-07-04

### Changed
- Replaced the dark gold/ink medieval theme with a clean Material-style look: Inter font, indigo accent, slate/zinc neutrals, rounded surfaces and pill-shaped buttons/chips
- Added a light/dark mode switch (Settings → General → Appearance). The choice is stored per-browser (localStorage) and applied before first paint to avoid a flash of the wrong theme; if nothing's been chosen yet it follows the OS preference

## [0.13.1] - 2026-07-04

### Added
- App logo (a white nose mark, transparent background) in the nav bar and as the browser favicon. The favicon version is composited onto the app's dark ink background since the source mark is white-on-transparent and would be invisible in a light browser chrome

## [0.13.0] - 2026-07-04

### Added
- Each store now gets a short code and brand colour (e.g. Card Kingdom → "CK" in dark teal, Good Games TCG → "GG" in navy) shown as a compact badge on results, in place of the plain store name — makes it much faster to scan a crowded grid/table for a specific store

## [0.12.0] - 2026-07-04

### Added
- Good Games TCG scraper (seventh store) — an Australian Shopify store. Its theme replaces native search results with a third-party client-rendered widget whose API needs an auth token we couldn't recover, but Shopify's own built-in predictive-search endpoint is still live underneath it and untouched by the theme swap, so that's what this uses instead (capped at 10 matched printings, a platform limit on that endpoint — each printing then needs a follow-up request for per-condition/foil price and stock, since predictive search only gives a price range). Full condition grading (NM/LP/MP/HP/DMG), not just NM. Already AUD, no GST (domestic store)

## [0.11.0] - 2026-07-04

### Added
- Card Stars scraper (sixth store) — an Australian multi-seller MTG marketplace built as a client-rendered React SPA with no server-rendered HTML, so this calls its backing JSON API directly (found via its bundled JS) rather than scraping markup. Each result is one seller's live listing (price, condition, quantity) for one printing/finish; catalog entries with no active seller are excluded same as any other out-of-stock result. Already AUD, no GST (domestic store)

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
