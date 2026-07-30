"""Process-wide display timezone, admin-configurable (Settings → Admin →
System). All timestamps stay stored in UTC in the database — this only
affects how they're rendered: API responses still return naive UTC and let
the frontend convert, but server-side log lines are formatted here, so a
plain module-level cache (rather than a DB read per log line) is what makes
that cheap. Updated in-place by routers/settings.py whenever the setting
changes, and loaded once from the database at startup (main.py)."""

from zoneinfo import ZoneInfo

_current_tz = "UTC"


def set_timezone(name: str):
    global _current_tz
    ZoneInfo(name)  # raises ZoneInfoNotFoundError if invalid, before we commit to it
    _current_tz = name


def get_timezone() -> str:
    return _current_tz


def get_zoneinfo() -> ZoneInfo:
    return ZoneInfo(_current_tz)
