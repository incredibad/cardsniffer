import datetime
import logging
import os
from contextlib import asynccontextmanager
from logging.handlers import TimedRotatingFileHandler
from zoneinfo import ZoneInfoNotFoundError

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

import tz
from database import SessionLocal, get_setting, init_db, set_setting
from routers import auth as auth_router, search, settings, logs as logs_router, users as users_router, stores as stores_router
from log_buffer import LogBufferHandler

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")

logging.basicConfig(level=logging.INFO)
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)


class _TzFormatter(logging.Formatter):
    """Renders each line in the admin-configured display timezone (tz.py)
    rather than the container's own local time — read fresh per line so a
    timezone change (Settings → Admin → System) takes effect immediately,
    without needing to recreate the handlers."""

    def formatTime(self, record, datefmt=None):
        ts = datetime.datetime.fromtimestamp(record.created, tz=tz.get_zoneinfo())
        return ts.strftime(datefmt or "%Y-%m-%d %H:%M:%S")


_LOG_FMT = _TzFormatter("%(asctime)s %(levelname)s %(name)s: %(message)s", datefmt="%Y-%m-%d %H:%M:%S")

_buf_handler = LogBufferHandler()
_buf_handler.setFormatter(_LOG_FMT)
logging.getLogger().addHandler(_buf_handler)

_LOG_FILE = "/data/cardsniffer.log"
os.makedirs(os.path.dirname(_LOG_FILE), exist_ok=True)
_file_handler = TimedRotatingFileHandler(_LOG_FILE, when="midnight", backupCount=7, encoding="utf-8")
_file_handler.setFormatter(_LOG_FMT)
logging.getLogger().addHandler(_file_handler)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initialising database…")
    init_db()
    db = SessionLocal()
    try:
        configured = get_setting(db, "timezone", "")
        if configured:
            # An admin has set this in Settings → Admin → System before —
            # that always wins over the container's TZ env var from here on.
            tz.set_timezone(configured)
        else:
            # Nothing set yet — fall back to the docker-compose TZ env var
            # (defaults to UTC if that isn't set either), and persist it so
            # Settings shows the real effective value from first boot.
            env_tz = os.environ.get("TZ", "UTC")
            try:
                tz.set_timezone(env_tz)
            except ZoneInfoNotFoundError:
                logger.warning(f"Invalid TZ env var {env_tz!r}, falling back to UTC")
                env_tz = "UTC"
                tz.set_timezone(env_tz)
            set_setting(db, "timezone", env_tz)
            db.commit()

        # Same seed-once pattern as timezone above: VPN_PROXY_URL only fills
        # in vpn_proxy_url if nothing's configured yet — an admin's own edit
        # in Settings → Admin → Network always wins after that, so this only
        # matters for getting a fresh install working without opening the UI.
        if not get_setting(db, "vpn_proxy_url", "") and os.environ.get("VPN_PROXY_URL"):
            set_setting(db, "vpn_proxy_url", os.environ["VPN_PROXY_URL"])
            db.commit()

        # Same pattern again — MTGMATE_RELAY_URL only matters for whoever
        # already has a personal relay to point at; a fresh install with
        # nothing set here just leaves MTGMate force-disabled.
        if not get_setting(db, "mtgmate_relay_url", "") and os.environ.get("MTGMATE_RELAY_URL"):
            set_setting(db, "mtgmate_relay_url", os.environ["MTGMATE_RELAY_URL"])
            db.commit()
    finally:
        db.close()
    yield
    logger.info("Shutting down…")


app = FastAPI(title="Cardsniffer", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")
api.include_router(auth_router.router)
api.include_router(users_router.router)
api.include_router(search.router)
api.include_router(stores_router.router)
api.include_router(settings.router)
api.include_router(logs_router.router)
app.include_router(api)


@app.get("/health")
def health():
    return {"status": "ok"}


# Serve frontend static files if built into the image
if os.path.isdir(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
