# Changelog

All notable changes to this project will be documented here.

## [0.78.0] - 2026-07-30

### Added
- Export button on both the Cart popout and the Cart page — pick a store (or All Stores), then either copy a plain-text list to the clipboard in one of three formats ("1x Grim Hireling" / "1 Grim Hireling" / "Grim Hireling") or download a full CSV (quantity, name, set, collector number, foil, condition, price, currency, store, product URL) regardless of the text format chosen.

## [0.77.3] - 2026-07-30

### Fixed
- eBay art-only listings (e.g. "Witch Enchanter 16/54 Art Series MH3", "Witch Enchanter Art Card") were showing up regardless of the "show art cards" filter — the search router's art check inspects `set_name`, but eBay repurposes that field for the seller's username rather than any set info, so the check never actually saw the title. eBay now flags these itself from the title text ("Art Series"/"Art Card").

## [0.77.2] - 2026-07-30

### Fixed
- eBay listings titled "Non-Foil"/"Non Foil" were incorrectly flagged as foil — the fallback `\bfoil\b` regex matched "Foil" inside those titles too, since the hyphen/space isn't a word character. Now excludes a preceding "non" (with or without a separator).

## [0.77.1] - 2026-07-30

### Changed
- The "Use Proxy" checkboxes in Settings → Admin → Stores now check in amber instead of the usual indigo, to visually distinguish them from the "Enabled" column at a glance

## [0.77.0] - 2026-07-30

### Added
- Per-store "Use Proxy" toggle in Settings → Admin → Stores, next to the existing enable/disable checkbox — lets a store bypass the configured VPN proxy and connect directly (on by default for every store). The column only shows when a proxy URL is actually set in Settings → Network.

## [0.76.3] - 2026-07-15

### Fixed
- Sticky search/filter bar spacing: 5px gap between the search bar and filters, and 5px bottom padding so content doesn't scroll flush against the filter row

## [0.76.2] - 2026-07-15

### Changed
- The filter/sort/view bar on the Search page now sticks to the top of the screen alongside the search bar when scrolling; store error banners moved below the sticky area

## [0.76.1] - 2026-07-12

### Changed
- Face to Face Games results now show the F2F brand logo (tinted to their orange, since the source asset's wordmark is white) instead of the fallback color+code chip

## [0.76.0] - 2026-07-12

### Added
- New store: Face to Face Games (facetofacegames.com, CAD, GST applied) — queries the Elasticsearch indexer behind their Shopify app proxy (JSON, 100 products/page) with per-condition variants (NM/PL/HP), finish-based foil treatment detection, out-of-stock listings kept with prices, and non-English printings flagged as foreign

## [0.75.1] - 2026-07-12

### Changed
- Star City Games results now show the SCG brand logo instead of the fallback color+code chip

## [0.75.0] - 2026-07-12

### Added
- New store: Star City Games (starcitygames.com, USD, GST applied) — searches their Hawksearch API directly (JSON, one request per 96 products) with per-condition variants (NM/PL/HP), foil treatment detection from the finish field (including SCG-specific labels like "Pool Party Foil"), out-of-stock listings with prices, and non-English printings flagged as foreign

## [0.74.2] - 2026-07-11

### Changed
- The "Not found at last check" chip (cart drawer and Cart page) is now a small amber ⚠ triangle next to the card name, with the full explanation in a styled tooltip on hover/tap

## [0.74.1] - 2026-07-11

### Changed
- Cart drawer rows now show the same detail as the Cart page: set name (and collector number) under the card name, plus condition, foil treatment, and "Not found" (missing at last price check) chips next to the store badge. Stores only expose set names, not short set codes, so the full set name is shown (truncated with a hover tooltip when long)

## [0.74.0] - 2026-07-11

### Added
- Refresh Prices button in the cart drawer (icon in the header) and on the Cart page — re-checks every carted listing at its store and updates the snapshot price, postage, and currency conversion in place. Rows show "checked X ago" instead of "added X ago" once refreshed; a listing no longer found in stock keeps its old price but gets an amber "Not found at last check" chip, and the toast summarises how many prices changed / went missing / failed to check

## [0.73.0] - 2026-07-09

### Added
- Cart drawer items can now be removed individually — a trash button on each row, same as the Cart page; a removed row deletes the whole entry (including stacked ×N quantities), and bulk clears remain on the full Cart page

## [0.72.1] - 2026-07-09

### Changed
- Grid view postage (eBay) moved from beside the price — where it squeezed the tight price/buttons row — to a very small "+$X.XX postage" line 2px under the price; the card's bottom padding shrinks when the line is present so it adds almost no card height

## [0.72.0] - 2026-07-09

### Added
- Each card in the cart drawer now has its own Buy button (under the price) linking to the store's product page; the art thumbnail still links there too, and the rest of the row is no longer one big link

## [0.71.0] - 2026-07-09

### Added
- Cart totals: the drawer shows a total at the bottom (following the store filter — one store's total when filtered, grand total on All stores), and each Cart page tab shows that store's total under its list. Quantity-weighted, summed per currency (mixed AUD/USD carts show "A$X + U$Y" rather than adding unlike currencies), card prices only — per-item postage is quoted too inconsistently across stores to sum meaningfully

## [0.70.0] - 2026-07-09

### Added
- Cart drawer: the header cart icon now slides a panel in from the right instead of navigating away — a quick-glance list of every carted card (art, name, store logo, price, ×N quantity) across all stores, with a store filter at the top and each row linking to the store's product page. The drawer header links through to the full Cart page for management (delete/clear); closes via X, backdrop click, or Escape

### Changed
- The Settings cog and username/logout moved into a hamburger menu on the far right of the header — the header is now just logo, cart, and menu, with room to grow

## [0.69.1] - 2026-07-09

### Changed
- The cart button's green is now a proper grass green (Tailwind green-600, kept at full strength in dark mode too) instead of the paler emerald

## [0.69.0] - 2026-07-09

### Changed
- Search results now persist when navigating away from the main page (to Cart, Settings, etc.) and back — the query, results, and any scraper errors stay until the next search replaces them. In-app navigation only: a full page reload still starts fresh, since results are live-scraped prices
- The Cart half of the result Cart/Buy button is now an icon-only green segment (tooltip "Add to cart") — visually distinct from the indigo Buy half instead of two same-colored labelled segments

## [0.68.2] - 2026-07-09

### Changed
- MTGMintCard's logo now includes the "mtgmintcard" wordmark, recreated from the store's own header: the dice-and-sparkle icon at its site-relative scale with the text self-rendered in Liberation Sans (metric stand-in for the site's Helvetica Neue stack), white per the site's own styling — like the icon itself, best suited to dark mode

## [0.68.1] - 2026-07-09

### Changed
- Card Stars now shows its real wordmark logo (from cardstars.com.au, full-color SVG) instead of the previous placeholder mark
- Card Kingdom's logo is now a recreation of its site header — crest left of the "Card Kingdom" wordmark, vertically centered with a 10px gap — still mask-tinted to CK navy (both source images are white silhouettes)

### Fixed
- Hareruya's (and any other wide) tinted logo no longer clips over the card edge — the masked span ignored its container's width cap entirely; it's now clamped (mask rescales inside the box) and the condition/store row's two spans are each capped at 45% of the row so they can never touch

## [0.68.0] - 2026-07-09

### Added
- Per-store carts: every result's Buy button is now a split Cart/Buy pair — Cart adds that listing (a snapshot of its price/condition/links at that moment) to the store's cart with a toast confirmation, Buy behaves exactly as before. A new cart icon in the header (with a live total-count badge) opens the Cart page: one tab per store showing its logo and item count, each listing its cards with a Buy button, per-item delete, an "added X ago" note (prices are snapshots, not live), and a Clear Cart button; a Clear all Carts button in the heading row (with confirmation) empties everything. Carts are stored server-side per user (`cart_items` table), so they follow your account across browsers; adding the identical listing again bumps a ×N quantity instead of duplicating the row

## [0.67.2] - 2026-07-07

### Fixed
- Card Kingdom and Hareruya's tinted logos weren't rendering at all — the masked `<span>` used to recolor them has no intrinsic size the way an `<img>` does, so it collapsed to 0×0 inside its shrink-to-fit box. Fixed with an explicit aspect-ratio matching each logo's actual pixel dimensions

## [0.67.1] - 2026-07-07

### Fixed
- Card Kingdom's crest and Hareruya's wordmark (both published only as plain white silhouettes) are now recolored to their real brand colors — Card Kingdom navy, Hareruya red — via a CSS mask, instead of a flat black/white invert that lost their actual brand identity

## [0.67.0] - 2026-07-07

### Changed
- Store logos no longer sit in a pill — they're shown directly on the card's own background, and use the real full wordmark instead of a crest/mascot where one exists (Hareruya now shows "HARERUYA" + mascot, not just the mascot). Card Kingdom and Hareruya's logos are plain white silhouettes, so they're inverted to black in light mode and left white in dark mode via CSS, giving correct contrast in both themes from a single asset. GUF, Good Games, and MTGMintCard are known to be low-contrast in dark mode (and MTGMintCard in light mode too) since those stores don't publish a differently-colored logo variant; MTGMate's logo similarly loses its white "MATE" text in light mode

## [0.66.0] - 2026-07-07

### Added
- Real store logos (sourced from each store's own site, trimmed and standardized to a common height) now replace the colored code chips on results — shown in a small pill, white-backed except MTGMate's which needs a dark pill for its white lettering to read; stores without a fetched logo still fall back to the old color+code chip

## [0.65.0] - 2026-07-06

### Changed
- The whole app now requires login — anonymous visitors are shown a full-page login (or initial admin setup) screen instead of Search, and `/search`/`/stores` now reject unauthenticated requests server-side too, closing the previous public/unauthenticated access to search

## [0.64.0] - 2026-07-05

### Fixed
- Hareruya only ever showed NM copies of a card, even when SP/MP/HP copies were genuinely in stock (e.g. a card whose search-indexed listing is NM still has separate stocked SP/MP/HP listings under the same product) — the site's own "Show All Conditions" table for each item was already present in a response we were fetching anyway (for accurate stock), just not parsed. Now parsed for free, no extra requests

## [0.63.1] - 2026-07-05

### Changed
- eBay results no longer get our synthetic rainbow foil sheen overlay — eBay listing photos are real seller photos that already show genuine foil shine, so it was doubling up

## [0.63.0] - 2026-07-05

### Added
- New "Playtest cards" option in the Show filter dropdown, hidden by default — catches eBay's unofficial Playtest-style proxy listings (detected by "Playtest" in the listing title) so they don't clutter results unless explicitly shown

## [0.62.0] - 2026-07-05

### Added
- MTGMate's relay URL (previously hardcoded) is now a Settings → Admin → Stores → MTGMate Relay field, seedable via the `MTGMATE_RELAY_URL` env var — MTGMate is force-disabled system-wide (in Global System Stores, per-account Stores, and search itself) whenever it's unset, since the relay's response format is specific to that one personal tool with no generic fallback

## [0.61.2] - 2026-07-05

### Changed
- Moved `PYTHONUNBUFFERED=1` into the Dockerfile (`ENV`) instead of `docker-compose.yml` — it's a fixed property of how this image runs Python, not a per-deployment setting like `TZ`/`VPN_PROXY_URL`

## [0.61.1] - 2026-07-05

### Changed
- Removed references to an unrelated personal project from code comments and docs; trimmed the `docker-compose.yml` comments down to be more succinct

## [0.61.0] - 2026-07-05

### Added
- `VPN_PROXY_URL` environment variable in `docker-compose.yml` to set the default scraper proxy without opening Settings — same seed-once-then-admin-wins pattern as `TZ`
- Commented-out gluetun sidecar service in `docker-compose.yml`, for a fresh install with no existing proxy to point at — uncomment, fill in provider credentials, and set `VPN_PROXY_URL=http://gluetun:8888` to wire it up automatically

## [0.60.0] - 2026-07-05

### Added
- `TZ` environment variable in `docker-compose.yml` to set the default system timezone (e.g. `Australia/Sydney`) without needing to open Settings — only seeds the timezone the first time (or whenever it's otherwise unset); once an admin sets it via Settings → Admin → System, that stored value wins from then on regardless of `TZ`. Also sets the container's own local time, so log rotation timing follows it too

## [0.59.0] - 2026-07-05

### Added
- Admins can now disable a user account (Settings → Admin → Users → cog icon → Account enabled) instead of only deleting it — a disabled account can't log in and any existing session is immediately kicked out. Protected the same way admin removal already was: can't disable your own account, can't disable the last remaining admin
- Admin-configurable system Timezone (Settings → Admin → System) — controls how Last Seen, search history, and log lines are displayed for every user, instead of each browser's own local timezone
- "Add User" is now a modal (previously an inline form at the bottom of the page), moved to a button at the top of the Users list
- Each user row now has a single cog icon opening a "Manage User" modal with admin toggle, enable/disable, password reset, and delete — replacing the previous per-row admin/delete icon pair

### Fixed
- "Last Seen" (and other account timestamps) were being parsed as browser-local time despite being UTC under the hood, silently showing the wrong time — timestamps are now correctly interpreted as UTC and rendered in the configured system timezone

## [0.58.0] - 2026-07-05

### Added
- Search history entries in Settings → Account now show whether each search was a regular Search or an eBay Snipe

### Fixed
- The search page's Store filter was a static list unrelated to actual store availability — it now fetches the real list of stores enabled for you (globally enabled, and not opted out of in your own account preference), so a disabled store can no longer appear as a checkbox that would never have any results

### Changed
- Settings → General → Stores no longer lists stores that are disabled system-wide; there's nothing for a per-account preference to do once the admin has turned a store off for everyone

## [0.57.0] - 2026-07-05

### Changed
- Settings → Admin now has its own sub-tabs: Stores (Global System Stores + eBay API), System (About + Logs, moved in from the old top-level System tab), Network (VPN Proxy), and Users (moved in from the old top-level Users tab)

## [0.56.1] - 2026-07-05

### Changed
- Settings → System tab is now admin-only (it was only ever About/version info plus admin-only Logs, so regular users had no reason to see it)

## [0.56.0] - 2026-07-05

### Added
- Settings → Account tab for any logged-in user: change your own password (requires current password), view your last 20 searches with timestamps and result counts, and sign out

## [0.55.0] - 2026-07-05

### Added
- Per-account store enable/disable in Settings → General ("Stores") — any logged-in user, including admins, can now opt their own searches out of individual stores without affecting other users
- Settings → Admin tab (admin-only), consolidating what used to sit under General: the store toggles (renamed "Global System Stores", with an explanation that disabling here overrides every user's own preference), VPN Proxy, and eBay API

### Changed
- The old system-wide store toggle list is now labelled "Global System Stores" and lives in the new Admin tab instead of General

## [0.54.1] - 2026-07-05

### Fixed
- Card Kingdom search intermittently failing with a TLS handshake error (curl error 35, "WRONG_VERSION_NUMBER") through the VPN proxy — retried once on a connection-level failure, since it's a dropped connection rather than an actual response from Card Kingdom/Cloudflare

## [0.54.0] - 2026-07-05

### Added
- Admin-only "API calls (last 24h)" count in Settings → General → eBay API, tracking actual outbound requests to eBay's API (OAuth token fetches and Browse searches) over a rolling 24h window

## [0.53.1] - 2026-07-05

### Changed
- Search button's mode (Search vs eBay Snipe) now persists across page reloads instead of always resetting to "Search" — same localStorage pattern as the other filter-bar settings

## [0.53.0] - 2026-07-05

### Added
- Lazy-render results in batches of 60 instead of mounting the entire filtered/sorted set at once — a large search (e.g. "Sol Ring" at 550+ results) was mounting hundreds of image-heavy cards simultaneously, which is what actually stresses a mobile device, not the fetch itself. More results reveal automatically as you scroll near the bottom (IntersectionObserver). Filters and sort still operate over the full result set as before; this only limits how much gets mounted to the DOM at a time, and resets back to the first batch whenever filters/sort/query change

## [0.52.3] - 2026-07-05

### Changed
- Scroll-to-top on search is now instant instead of smooth-animated — the animation felt slow after scrolling through a long results page

## [0.52.2] - 2026-07-05

### Fixed
- Card Kingdom: cards with no real foil printing (e.g. Sliver Queen — Stronghold predates Magic's foil program entirely) were false-flagging as foil, because CK's "Foils" tab search sometimes returns the exact same product page as the nonfoil tab rather than a distinct SKU. Deduplicated by `(product_url, condition)` — CK's own stable per-product identifier — rather than trusting which tab a result came from unconditionally

## [0.52.1] - 2026-07-05

### Fixed
- Running a search from the sticky search bar now scrolls back to the top of the page, instead of leaving you scrolled down mid-results
- Removed the sticky search bar's bottom padding, which showed as a visible dark strip under it in dark mode

## [0.52.0] - 2026-07-05

### Added
- Search bar is now sticky, staying pinned to the top of the viewport while scrolling through results
- "Back to top" button (bottom-right, appears after scrolling ~200px) on every page, via new `BackToTopButton.jsx`

## [0.51.2] - 2026-07-05

### Changed
- eBay listing date's "(... ago)" suffix no longer drops off after 2 weeks — it now just keeps incrementing in days indefinitely, since results here are practically never more than a few weeks old anyway

## [0.51.1] - 2026-07-05

### Changed
- eBay listing date shortened: no year, always-3-letter month ("4 Jul, 12:48" instead of "4 Jul 2026, 12:48"). Month abbreviations are now hardcoded rather than using `Intl`'s locale-dependent `month: "short"`, which isn't reliably 3 letters (en-AU renders September as "Sept")

## [0.51.0] - 2026-07-05

### Added
- eBay listing date now shows a human-readable "ago" suffix, e.g. "4 Jul 2026, 12:48 (4 hours ago)" — minutes under an hour, hours up to 48h, then days ("2 days ago" onward), dropping the suffix entirely beyond 2 weeks (just the absolute date/time). New `formatListedAt` in `formatDate.js`

## [0.50.3] - 2026-07-05

### Fixed
- "No listings found" was rendering above the always-visible filter bar instead of below it, inconsistent with the "hidden by filters" message which correctly sits below. Moved it to match

## [0.50.2] - 2026-07-05

### Changed
- eBay results: the subtitle line under the card name (where set code normally goes) now shows the listing's creation date/time instead of the seller username — more useful there, especially for eBay Snipe. Seller info is still available via the store-badge tooltip

## [0.50.1] - 2026-07-05

### Fixed
- eBay results all showed the search query as the card name (e.g. every result from an "eBay Snipe" search for "Marvel Foil" was labeled "Marvel Foil", regardless of which card it actually was). `card_name` now shows the actual listing title instead, with the seller username moved to the subtitle line. Note: "Exact match only" will now always hide eBay results when enabled, since a listing title is never literally equal to the plain query — that toggle doesn't really apply to freeform marketplace listings

## [0.50.0] - 2026-07-05

### Added
- "eBay Snipe": the Search button is now a split button with a dropdown for an alternate search mode. eBay Snipe searches eBay only, using the exact query text (no "MTG" appended, no card-name matching against the title — still AU-only/Buy-It-Now-only/single-card-category/no-lots), fetches up to 200 listings, and force-sorts them newest-first. The button turns eBay yellow while in this mode and stays that way (sticky across searches) until "Search" is chosen again from the dropdown or the page reloads
- Backend: `GET /search` accepts optional `store`/`exact` params to power this — `EbayScraper.search()` takes a new `exact` flag

## [0.49.0] - 2026-07-04

### Changed
- Store/Condition/Show/Sort/View filter bar is now always visible — before the first search, while one's in flight, and after — instead of only appearing once results exist, so filters can be set up ahead of time. The results count only shows once a search actually completes

## [0.48.0] - 2026-07-04

### Added
- eBay badge tooltip now also shows seller username + feedback score/percentage, postage type (Fixed/Calculated), and estimated delivery-by date, alongside the listing date already there. New `SearchResult` fields: `seller_username`, `seller_feedback_score`, `seller_feedback_percentage`, `shipping_type`, `delivery_by` — all eBay-only
- Tooltip content extracted into `EbayListingTooltipContent.jsx`, shared between grid and table views

## [0.47.0] - 2026-07-04

### Added
- Hovering/tapping the store badge on an eBay result now shows a tooltip with the listing's creation date/time (`SearchResult.listed_at`), in both grid and table views. Other stores keep the plain store-name tooltip, since none of them expose a listing date
- New `Tooltip.jsx` component: a generic hover/tap popover for wrapping arbitrary trigger content, portal-rendered so it isn't clipped by a card's `overflow-hidden`

## [0.46.0] - 2026-07-04

### Added
- Date sorting ("Date Asc"/"Date Desc"), alongside Price Asc/Desc, in a new Sort dropdown replacing the old asc/desc icon-button pair. Only eBay listings carry a date (`SearchResult.listed_at`, from the Browse API's `itemCreationDate`) — in Date mode, eBay results are sorted by date and always sit above everything else, which falls back to a price sort since it has no date of its own
- New `SelectDropdown.jsx` component: a single-select popover (auto-closes on pick) for the Sort control, distinct from `FilterDropdown`'s checkbox multi-select

## [0.45.0] - 2026-07-04

### Changed
- Store and Condition filter dropdowns are now static lists instead of being derived from the current search's results, so the option set no longer shrinks/grows between searches. Store options come from `storeMeta.js`'s registry (all 8 known stores); Condition options are a fixed best-to-worst list (NM, SP, LP, MP, HP, DMG)

## [0.44.0] - 2026-07-04

### Changed
- Card images now link to the same product URL as the Buy button, in both grid and table/list views
- Table/list view's thumbnail: replaced the click/hover-to-zoom preview with the plain buy link (couldn't do both on one click) — `ImageHoverPreview.jsx` removed as now-unused

## [0.43.1] - 2026-07-04

### Fixed
- Login form popover was rendering behind the results grid — `<header>`'s `backdrop-blur` creates its own stacking context, but the header had no `position`/`z-index` of its own, so it painted below `<main>` (later in DOM order) regardless of the popover's own `z-30`. Giving `<header>` `relative z-40` fixes it, since the fix has to raise the header's whole stacking context, not just the popover inside it

## [0.43.0] - 2026-07-04

### Fixed
- Store, Condition, and Foil filters now persist to localStorage and carry over between searches, matching the Show toggles — previously they were explicitly reset back to "nothing hidden"/"all" at the start of every new search, and weren't saved across page reloads at all

## [0.42.3] - 2026-07-04

### Fixed
- Hareruya scraper returned every raw hit from their Solr search unfiltered — since that search also matches on set name and artist (e.g. "Kang Dynasty" hit "Lizard Blades": "Kang" is that card's artist, "Dynasty" is part of the Kamigawa: Neon Dynasty set name), unrelated cards could show up. Filtered down to actual card-name matches, same defense Card Kingdom/GUF/Good Games/eBay already have

## [0.42.2] - 2026-07-04

### Changed
- Table view, mobile layout: Qty moved from the price row up to the condition/foil row (right of the foil badge), leaving the price row as just price+postage / Buy button

## [0.42.1] - 2026-07-04

### Fixed
- Price/postage/buy row (grid card and table view, desktop and mobile): the price+postage group used `items-baseline`, sinking the smaller postage text below the visual center of the larger price text. Switched to `items-center` throughout

## [0.42.0] - 2026-07-04

### Fixed
- The Store/Condition/Show filter bar no longer disappears when the active filters hide every result — it now stays visible (with a "hidden by filters" message plus a Reset link in place of the results grid) so individual filters can be adjusted instead of only offering a full reset

## [0.41.2] - 2026-07-04

### Changed
- eBay postage indicator simplified further: dropped the envelope icon and the "A" currency prefix (AU-only sellers, so it's always AUD) and shows "+$0.00" instead of "Free" — now just a bare "+$1.99"

## [0.41.1] - 2026-07-04

### Changed
- eBay postage indicator: dropped the word "postage" (now just "+A$1.99"/"Free") and stopped it wrapping to its own line — sits inline right next to the price

## [0.41.0] - 2026-07-04

### Added
- Postage cost shown next to the price for eBay listings (small muted text with an envelope icon, "Free postage" when $0). New `SearchResult.shipping_price` field, populated from the Browse API's `shippingOptions`, only ever set for eBay — deliberately excluded from GST/currency conversion and the orderable total, since it's informational only

## [0.40.0] - 2026-07-04

### Added
- "All"/"None" buttons in the results filter bar's Store, Condition, and Show dropdowns (`FilterDropdown.jsx`), so bulk-toggling a filter no longer takes one click per option
- The "Show" dropdown's toggles (art cards, foreign cards, exact match only) are now built from a data-driven list instead of three hardcoded checkboxes, so a future toggle only needs one new list entry and is automatically covered by All/None

## [0.39.1] - 2026-07-04

### Added
- Store badge colour/code for eBay (`#FFBD14`, "EBAY") in `storeMeta.js`

## [0.39.0] - 2026-07-04

### Added
- New store: **eBay**, via the Buy Browse API (`backend/scrapers/ebay.py`). Restricted to Australian-located listings and Buy It Now only (`itemLocationCountry:AU,buyingOptions:{FIXED_PRICE}`), with "MTG" appended to every query to cut false positives. OAuth application tokens (client-credentials grant) are cached in-process for their ~2h lifetime rather than re-fetched per search
- Condition (NM/LP/MP/HP/DMG) is parsed from listing title text, since eBay's own `condition` field comes back as "Ungraded" for essentially every MTG single
- Filters out non-single listings (lots, pins, playmats) using eBay's "CCG Individual Cards" category id plus a title keyword check, since some lot/bundle listings are mis-categorized as individual cards by the seller

### Changed
- `vpn_proxy_url`-style settings extended with `ebay_app_id`/`ebay_cert_id`: the Cert ID (Client Secret) is encrypted at rest (Fernet, via `backend/crypto.py`) rather than stored in plaintext, using a new `SECRET_KEY` env var kept out of the data volume

## [0.38.0] - 2026-07-04

### Added
- eBay API credentials (App ID + Cert ID) as admin-configurable settings, laying groundwork for the eBay Browse API scraper. The Cert ID is encrypted at rest with Fernet before being stored, using a `SECRET_KEY` sourced from a new env var (kept out of the data volume so a DB copy alone can't decrypt it) rather than stored in plaintext like `vpn_proxy_url`

## [0.37.0] - 2026-07-04

### Changed
- Gave up on the grid view foil corner-ribbon — text centering never landed right across several iterations. Reverted to a plain badge shown under the set name instead. The ribbon CSS is left in place (commented out) in case it's worth revisiting later

## [0.36.10] - 2026-07-04

### Fixed
- Grid view's foil ribbon text wasn't centering properly — the `line-clamp-2` span was shrink-wrapping to its content width instead of filling the ribbon, so `text-center` had nothing to center against. Added `w-full`

## [0.36.9] - 2026-07-04

### Changed
- Rebuilt grid view's foil ribbon using the standard "CSS corner ribbon" recipe instead of a bespoke approach: one rotated element with a fixed height (so 1-line vs 2-line text can't throw off centering) and flexbox-centered content, sitting directly in the card image's existing clip boundary with no extra wrapper, shadow, or precise diagonal math needed

## [0.36.8] - 2026-07-04

### Changed
- Grid view's foil ribbon no longer uses a nested clip box — that inner overflow-hidden (plus its shadow) was the source of visible seam/"clipping lines" and needed exact diagonal math to avoid gaps. Now it's one oversized ribbon (160px/224px) relying solely on the card image's own rounded corner clip to cut it off, guaranteeing full bleed with no extra boundary to cause artifacts

## [0.36.7] - 2026-07-04

### Fixed
- Grid view's foil ribbon width reduced (90px -> 80px desktop, scaled proportionally on mobile), and its clip box now overshoots past the card image's true corner slightly instead of sitting exactly flush with it, so the ribbon's background reliably bleeds all the way to the edge rather than leaving a hairline gap

## [0.36.6] - 2026-07-04

### Fixed
- Grid view's foil ribbon was still clipping the start/end of wrapped 2-line text (e.g. "Chocobo Track Foil" showing as "HOCOBO TRAC"/"FOIL") — the fixed pixel `top` offset centering it was tuned for single-line height, so taller 2-line text threw off the alignment between the ribbon and its clip window. Switched to CSS's `top-1/2 left-1/2` + `-translate-1/2` centering trick, which centers correctly regardless of how tall the wrapped text ends up being

## [0.36.5] - 2026-07-04

### Fixed
- Grid view's foil ribbon used fixed pixel dimensions sized for larger cards, disproportionately large on small cards (especially mobile's 2-column layout), making it look like it spilled past the card. Ribbon geometry is now responsive (smaller on mobile, larger on desktop), matching the rest of the card's own responsive sizing
- Also dropped the length-based font shrinking, which was counterproductive — smaller text made long names *more* likely to fit on one line, not wrap. A single, larger font size now wraps long names naturally

## [0.36.4] - 2026-07-04

### Fixed
- Grid view's foil ribbon was clipped by the whole image's rectangular bounds, which don't sit symmetrically around the diagonal the ribbon is drawn on for a non-square card image — this both threw off the text centering and cut long text off instead of wrapping. Now clipped by a dedicated small square wrapper centered on just the corner, matching the standard CSS corner-ribbon technique

## [0.36.3] - 2026-07-04

### Fixed
- Grid view's foil ribbon text looked visually off-center — `tracking-wide` (letter-spacing) adds space after the last character too, which biases centered text left. Removed it

## [0.36.2] - 2026-07-04

### Fixed
- Grid view's foil ribbon was truncating longer treatment names (e.g. "Chocobo Track Foil") to a single line — now wraps to two lines, with the font shrinking a size further for names over 12 characters so they still fit legibly

## [0.36.1] - 2026-07-04

### Changed
- Grid view's foil badge is now an actual diagonal corner ribbon (rotated 45°, cutting across the top-right corner) rather than a rounded pill sitting near the corner

## [0.36.0] - 2026-07-04

### Changed
- Grid view: condition (NM/EX/etc) now shows next to Qty instead of its own badge row above it
- Grid view: foil badge moved from that now-removed row to a small ribbon pinned to the top-right corner of the card art, showing the specific treatment name where known

## [0.35.1] - 2026-07-04

### Changed
- Card Kingdom now requests 100 results per page (its own hard server-side ceiling, confirmed by testing well past it) instead of the 25 default, and sorts alphabetically by name instead of "popularity" — both controlled via cookies rather than URL params on this site, not obvious from the request shape alone. Same number of requests, up to 4x more results per search (Sol Ring: 63 -> 155)

## [0.35.0] - 2026-07-04

### Fixed
- Card Kingdom's search matched the entire displayed title, descriptor included — not just the card name — so a query that's also a common treatment word (e.g. "Foil") pulled in thousands of unrelated results. Now filtered client-side to keep only results whose actual card name contains the query, same pattern GUF/Good Games already use

## [0.34.3] - 2026-07-04

### Fixed
- Corrected a comment in `card_kingdom.py` misidentifying "Foil" as an Unhinged joke card — it's a real Prophecy card with multiple reprints

## [0.34.2] - 2026-07-04

### Fixed
- Card Kingdom's generic "foil" text check scanned the *whole* title, including the card name — there's a real card literally named "Foil" (Unhinged) whose plain nonfoil printing would've been flagged as foil purely from its own name. Both the generic check and the known-treatment match now only look at the "(Descriptor)" portion after the name

## [0.34.1] - 2026-07-04

### Fixed
- Known-treatment matching required an exact-spaced substring, so store-specific spelling variants were silently missing: Hareruya's "SurgeFoil"/"RetroF" (Surge Foil/Retro Foil with no space or truncated) and MTGMintCard's "Foil-etched" (hyphenated) all fell through to a plain "Foil" badge. Each treatment now matches multiple known raw spellings, not just one

### Added
- Retro Foil, Silver Screen Foil, and Neon Ink to the known-treatment list, confirmed via live Hareruya/MTGMintCard title text. Also added Invisible Ink Foil and Ampersand Foil off general knowledge, unconfirmed against a live listing yet

## [0.34.0] - 2026-07-04

### Changed
- Foil treatment detection switched from generically parsing title text ("whichever parenthetical mentions foil") to cross-referencing a maintained list of known treatment names against the full raw title. The generic approach kept breaking on real-world title shapes — multiple parenthetical groups in one title (e.g. Good Games' "Traveling Chocobo (Borderless) (Chocobo Track Foil)" only ever checked the first group), frame descriptors glued onto the treatment name, etc. Trade-off: a treatment not yet in the list shows as a plain "Foil" badge until it's added, rather than auto-detecting anything containing "foil"

### Fixed
- Good Games TCG (and GUF, same underlying bug) only checked the first parenthetical group in a title for both the foil treatment and the set name — treatments in a later group ("Mana Foil", "Chocobo Track Foil") were silently missed, and titles with multiple descriptors (e.g. "(Showcase) (Japanese)") collapsed indistinguishably in the results list. Now considers every group

## [0.33.1] - 2026-07-04

### Fixed
- Card Kingdom's collector number can have its own descriptor before it in the title (e.g. "(Showcase 437 - Fracture Foil)", "(Borderless 49 - Textured Foil)"), which the previous fix didn't strip since it only matched a number at the very start. Now strips everything through the first "number - " wherever it appears, confirmed against several real examples (Solitude, Twinflame Tyrant, Niv-Mizzet Supreme)
- MTGMate's foil_treatment no longer assumes only "Etched" exists beyond plain Nonfoil/Foil — any other finish value is now treated as a specific treatment name generally (confirmed real via "Mana Foil" turning up on Card Kingdom too)

## [0.33.0] - 2026-07-04

### Added
- Specific foil treatments (e.g. "Foil Etched", "Galaxy Foil", "Surge Foil", "Dragonscale Foil") now show as the badge label in place of generic "Foil", wherever a store's own data names one. No hardcoded treatment list — each scraper derives it from whatever the store already exposes: title text fragments for Card Kingdom/MTGMintCard/Hareruya/GUF/Good Games TCG (shared `extract_foil_treatment` helper), Scryfall-style `promo_types`/`foil_type` fields for Card Stars (which turned out to mirror Scryfall's own schema), and MTGMate's 3-value `finish` field ("Etched" -> "Foil Etched", the one genuinely hardcoded case since that store exposes nothing more specific)

### Fixed
- Card Kingdom's title-parenthetical treatment text is actually "COLLECTOR# - Treatment" (e.g. "1494 - Galaxy Foil"), which the new extraction was initially capturing whole, including the collector number — stripped before use

## [0.32.1] - 2026-07-04

### Fixed
- Card Kingdom was flagging some non-foil listings (e.g. Secret Lair prints titled "(Non-Foil)") as foil — the title-text check for "foil" was matching the substring inside "non-foil". Non-foil phrasing is now stripped out before checking

## [0.32.0] - 2026-07-04

### Added
- "Exact match only" option under the Show menu — stores' own search matches on more than the exact card name (e.g. "Ponder" also pulling in "Pondering Mage"), so this filters results down to just the card name that was actually searched for, case-insensitive. Persisted per-browser like the other Show toggles

## [0.31.2] - 2026-07-04

### Changed
- Mobile grid view back to 2 columns, with the card's padding, gaps, and font sizes (name, set, Qty, price, Buy button) all reduced on mobile to fit that width comfortably — sm: breakpoint and up keep the previous, larger sizing

## [0.31.1] - 2026-07-04

### Changed
- Mobile grid view now shows 1 column instead of 2 — the cards were too cramped side-by-side on narrow screens

## [0.31.0] - 2026-07-04

### Changed
- Mobile results row rebuilt into 3 dedicated rows instead of one wrapping row: results count + sort/view (right-aligned) directly under the search bar, then Store/Condition/Show dropdowns stretched to fill the width, then Foil and Currency toggles stretched to fill the width. Desktop keeps the existing single-row layout unchanged
- `FilterDropdown` now accepts a `className` prop so it can stretch (`flex-1`) on mobile while staying content-sized on desktop

## [0.30.0] - 2026-07-04

### Removed
- Search Options panel entirely — its persisted store checklist was doing the same job as the live filter bar's Store filter, and everything else in it had somewhere better to go

### Added
- New "Show" menu in the live filter bar (Art cards / Foreign cards) — same persisted toggles as before, just relocated now that Search Options is gone

### Changed
- Filter bar and result-row controls tightened up for mobile (smaller padding/text on the filter/segmented buttons, tighter gaps, smaller grid gap)
- Results count + sort + view controls no longer risk breaking apart when wrapping on narrow screens — that cluster is now a single non-shrinking unit that wraps as a whole instead of internally fragmenting
- "Reset filters" (shown when everything's hidden) now also resets the Show menu's toggles, not just the ephemeral store/condition/foil filters

## [0.29.0] - 2026-07-04

### Added
- `foilOverlay` per-store flag in `storeMeta.js` — the rainbow foil sheen re-enabled, but only for stores whose own photography doesn't already show it (Card Kingdom, Good Games TCG, Hareruya, GUF, Card Stars). Left off for MTGMate and MTGMintCard, whose product photos already show genuine foil shine

## [0.28.1] - 2026-07-04

### Changed
- Prices not in AUD (Original pricing mode, non-AUD stores) now render in amber instead of the default text colour, reinforcing the existing "U$"/"A$" prefix with a visual cue rather than relying on reading the currency prefix alone

## [0.28.0] - 2026-07-04

### Added
- Results count now reads "7/14 results" when filters are actively hiding some of them, instead of just the filtered count with no indication anything's hidden
- Each store's metadata now also records its home country and currency (matching what its scraper actually returns), alongside the existing code/colour

### Fixed
- USD prices ("Original" pricing mode) rendered with a bare "$", identical to AUD — Intl's en-US locale only disambiguates non-home currencies (AUD shows "A$", JPY shows "¥", ...) and silently leaves USD alone. Now shown as "U$" explicitly so it can't be mistaken for AUD

## [0.27.0] - 2026-07-04

### Added
- Live results filter bar (Store, Condition, Foil/Nonfoil) in the results row, left-aligned — purely client-side, no re-search, and resets on every new search (unlike Search Options' own persisted store checklist, which this is intentionally independent from). Results count, sort, and view controls moved to the right side of the same row, in that order

### Changed
- AUD/Original pricing toggle moved out of Search Options into the new results-row filter bar

## [0.26.1] - 2026-07-04

### Changed
- Toned down the foil rainbow overlay slightly (gradient opacity 0.5 -> 0.38)

## [0.26.0] - 2026-07-04

### Added
- Foil results now get a diagonal rainbow sheen over the card image (grid view, table view thumbnails, and the enlarged table-view preview) — the standard CSS holo-card trick (rainbow gradient + `color-dodge` blend), since not every store's own photography actually shows foil shine. Applied uniformly regardless of whether the source photo already looks foil

## [0.25.0] - 2026-07-04

### Added
- Hareruya now reports real per-listing stock counts instead of "1+". The search API's own `stock` field turned out to be a decoy (confirmed by comparing it against the site's own rendered "NM Stock:N" text) — the real number only appears in a second-stage AJAX call the site itself makes to turn search results into markup, so the scraper now makes that same call (batching every result from a search into one request) and parses the rendered stock out of it. Adds a few seconds to searches for extremely reprinted staples (confirmed working for Sol Ring's 760-listing case, ~11s total) but every other search is effectively unaffected

## [0.24.3] - 2026-07-04

### Fixed
- Qty was blank for stores whose exact stock count isn't exposed or isn't trustworthy (Hareruya, GUF, Good Games, some MTGMintCard/Card Kingdom rows) — since every shown result is already confirmed in stock, these now show "1+" instead of nothing

## [0.24.2] - 2026-07-04

### Changed
- Grid card 2x2 footer: swapped Qty and store badge, so Qty is top-left and the store badge is top-right (above the Buy button)

## [0.24.1] - 2026-07-04

### Changed
- Grid card footer (below condition) is now a 2x2 layout: store badge top-left, Qty top-right, price bottom-left, Buy button bottom-right. Price font bumped up a size

## [0.24.0] - 2026-07-04

### Added
- Search Options: a store filter — checkboxes for every currently-enabled store, letting you hide specific stores' results without needing to re-search. Persisted per-browser, and backed by a new public `/api/stores` endpoint (since `/api/settings` is now admin-only) exposing just the enabled store list

## [0.23.0] - 2026-07-04

### Changed
- Login moved out of Settings entirely into a header control next to the gear icon — "Login" (or "Set Up Admin" on first run) when signed out, username + logout when signed in. No more "Admin" tab
- Non-admins (including logged-out visitors) no longer see any trace of the admin-only sections — Stores, VPN Proxy, Logs, and the new Users tab are fully absent, not just disabled or explained with a placeholder

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
