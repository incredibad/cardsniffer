export function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// For the app's own account/system timestamps (Last Seen, search history,
// etc.) rather than store-sourced dates like listed_at/delivery_by above.
// Those come from external stores as proper "Z"-suffixed instants and are
// shown in the viewer's own browser time; these come from the backend as
// naive UTC (datetime.utcnow(), no offset — see backend/database.py) and are
// shown in the admin-configured display timezone (Settings → Admin →
// System) instead, so every user sees the same wall-clock time regardless
// of their own browser's timezone.
export function formatAccountDateTime(isoString, timezone) {
  if (!isoString) return null;
  const hasZone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(isoString);
  const date = new Date(hasZone ? isoString : `${isoString}Z`);
  if (Number.isNaN(date.getTime())) return isoString;
  try {
    return date.toLocaleString(undefined, { timeZone: timezone || "UTC" });
  } catch {
    return date.toLocaleString();
  }
}

// Estimated-delivery-by dates are day-granularity (the time component isn't
// meaningful), unlike listed_at's actual listing timestamp.
export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, { dateStyle: "medium" });
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function relativeAgo(elapsedMs) {
  if (elapsedMs < HOUR_MS) {
    const minutes = Math.max(1, Math.floor(elapsedMs / MINUTE_MS));
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (elapsedMs < 48 * HOUR_MS) {
    const hours = Math.floor(elapsedMs / HOUR_MS);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(elapsedMs / DAY_MS);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Hardcoded rather than Intl's month: "short" — that's locale-dependent and
// not reliably 3 letters (e.g. en-AU gives "Sept", not "Sep").
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// No year, always-3-letter month ("4 Jul, 12:48") — the "ago" suffix already
// carries how recent it is, so the year would just be redundant clutter here.
function formatShortDateTime(isoString) {
  const date = new Date(isoString);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}, ${time}`;
}

// "4 Jul, 12:48 (4 hours ago)" — minutes under an hour, hours under 48h, then
// days, incrementing indefinitely (most eBay listings surfaced here are only
// ever a few weeks old at most, so there's no point capping it).
export function formatListedAt(isoString) {
  const date = new Date(isoString);
  const elapsedMs = Date.now() - date.getTime();
  const absolute = formatShortDateTime(isoString);
  if (elapsedMs < 0) return absolute;
  return `${absolute} (${relativeAgo(elapsedMs)})`;
}
