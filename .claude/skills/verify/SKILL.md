---
name: verify
description: How to build, run, and drive cardsniffer end-to-end to verify a change.
---

# Verifying cardsniffer changes

## Build & run

```bash
docker compose build && docker compose up -d   # from repo root
docker logs cardsniffer --tail 15              # expect "Uvicorn running on http://0.0.0.0:6870"
```

The single container serves both the API (`/api/...`) and the built frontend
on port **6870**. `docker compose build` also runs the vite frontend build,
so a successful build proves the JSX compiles.

## Driving the authenticated API

Everything is behind session auth (HttpOnly cookie `cardsniffer_session`
backed by the `auth_sessions` table). No test credentials exist — mint a
throwaway user + session straight into the DB inside the container:

```bash
docker exec cardsniffer python -c "
import sqlite3
from datetime import datetime, timedelta
db = sqlite3.connect('/data/cardsniffer.db')
db.execute(\"INSERT INTO users (username, password_hash, is_admin, is_active, created_at) VALUES ('__verify_tmp__', 'x', 0, 1, ?)\", (datetime.utcnow(),))
uid = db.execute(\"SELECT id FROM users WHERE username='__verify_tmp__'\").fetchone()[0]
db.execute('INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)', ('verify-tmp-token', uid, datetime.utcnow(), datetime.utcnow()+timedelta(hours=1)))
db.commit()"
```

Then drive with `curl -b "cardsniffer_session=verify-tmp-token" ...`.
Set `is_admin=1` if the change under test is admin-gated (stores, settings,
users, logs).

**Always clean up afterwards** (FKs are ON — children first):

```bash
docker exec cardsniffer python -c "
import sqlite3
db = sqlite3.connect('/data/cardsniffer.db')
uid = db.execute(\"SELECT id FROM users WHERE username='__verify_tmp__'\").fetchone()[0]
for t in ('cart_items','auth_sessions','search_logs'):
    db.execute(f'DELETE FROM {t} WHERE user_id=?', (uid,))
db.execute('DELETE FROM users WHERE id=?', (uid,))
db.commit()"
```

## Useful flows

- Live single-store search (real scrape, ~1–2s for Card Kingdom):
  `GET /api/search?q=Lightning%20Bolt&store=card_kingdom`
- Cart: `POST /api/cart` with a search-result payload, `POST /api/cart/refresh`,
  `DELETE /api/cart`.
- To simulate store-side changes for cart items (price drift, delisting),
  UPDATE the `cart_items` row directly in the DB, then hit the endpoint.

## Gotchas

- The DB is the **production** SQLite at `/data/cardsniffer.db` in the
  `cardsniffer_data` volume — only touch rows belonging to the temp user.
- Do NOT install Playwright or other browser automation; the user verifies
  the UI visually themselves. Verify at the API surface.
- An unauthenticated request returns 401 — useful to prove a new route is
  registered (404 would mean it isn't).
