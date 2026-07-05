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
        # empty for v1 — append here as the schema evolves
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass
