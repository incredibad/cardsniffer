# Claude Code Instructions

## Versioning

**Always bump the version in `frontend/package.json` before every commit.** (The backend is Python and has no `package.json` — the single source of version truth is the frontend package.)

- Bug fixes and visual/UI changes → patch bump (0.x.**Y**)
- New features or behaviour changes → minor bump (0.**Y**.0)

This is non-negotiable — no commit should go out without a version increment in `frontend/package.json`.

## Changelog

**Always update `CHANGELOG.md` before every commit.** Add an entry under the correct version heading (create one if it doesn't exist, using the format `## [x.y.z] — YYYY-MM-DD`) that describes the change concisely. Use `### Added`, `### Changed`, or `### Fixed` sub-sections to match the existing style.

This is non-negotiable — no commit should go out without a changelog entry.

## Committing

**Always commit after every change.** After rebuilding and verifying the container, create a git commit on `dev` with a descriptive message. Do not wait to be asked.

## Pushing

**Do not push to GitHub proactively.** Only push to the remote repository when the user explicitly asks you to.

## Troubleshooting

**When the user reports a bug or error, ask targeted questions before analysing code.** Don't spend time reading through files and speculating about root causes when a single question would narrow it down in seconds.

## Branching workflow

- **`dev`** is the active development branch. All commits go here.
- **`main`** is stable and release-tagged. Only merge `dev` → `main` when the user confirms changes are tested and ready to ship.
- When the user asks to "push changes", push to `dev`.
- When the user asks to cut a release, merge `dev` into `main`, push `main`, then tag the release.

## Architecture notes

- Port: **6870**
- Data volume: `cardsniffer_data` mounted at `/data`
- Database: SQLite at `/data/cardsniffer.db`
- Log: rotating file at `/data/cardsniffer.log` (daily rotation, 7 backups) + an in-memory ring buffer for the live log viewer
- Backend: Python 3.12 / FastAPI / SQLAlchemy / uvicorn
- Frontend: React 18 / Vite / Tailwind CSS / Lucide icons
- Container: single container, uvicorn serves both API and built static files
- **Auth**: user accounts with admin/regular roles (`backend/auth.py`, `backend/routers/auth.py`, `backend/routers/users.py`). Session-based via an HttpOnly cookie backed by a server-side `auth_sessions` table (not a JWT — revocable on logout/deletion). First load with no accounts prompts to create the initial admin (Settings → Admin tab). Search and the theme toggle are fully public/unauthenticated; Stores, VPN Proxy, Logs, and Users management are admin-only.
- **No bundled VPN sidecar** — this host already runs `tightarse-gluetun` (HTTP proxy on host port 8888). Cardsniffer routes scraper requests through it via the `vpn_proxy_url` setting (Settings → General) rather than running its own gluetun container.

## Scraper sources

- **Card Kingdom** (https://www.cardkingdom.com) — first store, live/on-demand search, no persistence of search results beyond the `search_logs` observability table.
- More stores will be added regularly — each as its own module in `backend/scrapers/`, registered in `backend/scrapers/__init__.py`'s `SCRAPERS` dict. See the docstring at the top of `backend/scrapers/base.py` for the checklist.
