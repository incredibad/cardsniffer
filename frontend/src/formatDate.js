export function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// Estimated-delivery-by dates are day-granularity (the time component isn't
// meaningful), unlike listed_at's actual listing timestamp.
export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, { dateStyle: "medium" });
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const TWO_WEEKS_MS = 14 * DAY_MS;

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

// "4 Jul 2026, 12:48 (4 hours ago)" — minutes under an hour, hours under 48h,
// then days. Beyond 2 weeks the "(... ago)" suffix is dropped entirely (just
// the absolute date/time), since relative time stops being useful that far out.
export function formatListedAt(isoString) {
  const date = new Date(isoString);
  const elapsedMs = Date.now() - date.getTime();
  const absolute = formatDateTime(isoString);
  if (elapsedMs < 0 || elapsedMs > TWO_WEEKS_MS) return absolute;
  return `${absolute} (${relativeAgo(elapsedMs)})`;
}
