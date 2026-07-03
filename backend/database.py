from datetime import datetime

from sqlalchemy import create_engine, Column, Integer, String, DateTime, event, text
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


class Setting(Base):
    """Global key/value settings — vpn_proxy_url, store_<key>_enabled flags, etc."""

    __tablename__ = "settings"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_setting(db, key: str, default: str = "") -> str:
    row = db.query(Setting).filter(Setting.key == key).first()
    return row.value if row and row.value is not None else default


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
