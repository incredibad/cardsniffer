from datetime import datetime, timedelta

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, ForeignKey, event, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.engine import Engine
from sqlalchemy.pool import NullPool

DATABASE_URL = "sqlite:////data/cardsniffer.db"

# NullPool: SQLite is file-based — connection pooling adds no benefit and
# causes pool exhaustion when many concurrent async tasks each hold a session.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=NullPool,
)


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class SearchLog(Base):
    __tablename__ = "search_logs"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(String, nullable=False)
    result_count = Column(Integer, nullable=False, default=0)
    searched_at = Column(DateTime, default=datetime.utcnow)
    # Null for anonymous searches (the app itself stays usable without an
    # account) — only set when a logged-in user's session made the request,
    # so their Account tab can show their own recent search history.
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    # "search" (normal, all enabled stores) or "ebay_snipe" (eBay-only, exact
    # query) — mirrors the frontend's own searchMode values (Search.jsx).
    search_type = Column(String, nullable=False, default="search")


class EbayApiCall(Base):
    """One row per outbound request to eBay's API (OAuth token fetch or Browse
    search) — powers the rolling 24h call count shown to admins in Settings."""

    __tablename__ = "ebay_api_calls"

    id = Column(Integer, primary_key=True, index=True)
    called_at = Column(DateTime, default=datetime.utcnow, index=True)


class Setting(Base):
    """Global key/value settings — vpn_proxy_url, store_<key>_enabled flags, etc."""

    __tablename__ = "settings"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=True)


class User(Base):
    """An account. is_admin gates store/proxy/log settings and user
    management; the app itself (search, theme) stays public/unauthenticated.
    General user structure now so saved lists etc. have somewhere to hang
    off later, not just a single admin flag."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, nullable=True)


class UserStoreSetting(Base):
    """Per-user store enable/disable — layered on top of (and can only
    narrow) the global toggles in Setting. A store disabled globally stays
    disabled for every user regardless of this table; this only lets a user
    additionally opt out of a store that's globally enabled. Absence of a
    row means enabled, same default-on convention as the global toggles."""

    __tablename__ = "user_store_settings"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    store_key = Column(String, primary_key=True)
    enabled = Column(Boolean, nullable=False, default=True)


class AuthSession(Base):
    """Server-side session — an opaque bearer token set as an HttpOnly
    cookie, not a JWT, so a session can be revoked (logout, user deleted)
    just by deleting this row."""

    __tablename__ = "auth_sessions"

    token = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_setting(db, key: str, default: str = "") -> str:
    row = db.query(Setting).filter(Setting.key == key).first()
    return row.value if row and row.value is not None else default


def get_user_store_enabled(db, user_id: int, store_key: str) -> bool:
    row = db.query(UserStoreSetting).filter(
        UserStoreSetting.user_id == user_id, UserStoreSetting.store_key == store_key
    ).first()
    return row.enabled if row else True


def set_user_store_enabled(db, user_id: int, store_key: str, enabled: bool):
    row = db.query(UserStoreSetting).filter(
        UserStoreSetting.user_id == user_id, UserStoreSetting.store_key == store_key
    ).first()
    if row:
        row.enabled = enabled
    else:
        db.add(UserStoreSetting(user_id=user_id, store_key=store_key, enabled=enabled))


def record_ebay_api_call(db):
    """Called once per actual outbound request to eBay (token fetch or
    search), not per user search — a cached token means a search can make
    zero eBay requests. Prunes rows older than the rolling window on every
    write so the table never grows unbounded."""
    db.add(EbayApiCall())
    db.query(EbayApiCall).filter(
        EbayApiCall.called_at < datetime.utcnow() - timedelta(hours=24)
    ).delete()
    db.commit()


def count_ebay_api_calls_24h(db) -> int:
    cutoff = datetime.utcnow() - timedelta(hours=24)
    return db.query(EbayApiCall).filter(EbayApiCall.called_at >= cutoff).count()


def init_db():
    Base.metadata.create_all(bind=engine)
    _migrate_db()


def _migrate_db():
    """Idempotent list of ALTER/CREATE statements for schema changes made after
    the initial release. Each is wrapped in try/except so already-applied
    migrations silently no-op — mirrors the tightarse pattern."""
    migrations: list[str] = [
        "ALTER TABLE search_logs ADD COLUMN user_id INTEGER REFERENCES users(id)",
        "ALTER TABLE search_logs ADD COLUMN search_type VARCHAR NOT NULL DEFAULT 'search'",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass
