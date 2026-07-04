export function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// Estimated-delivery-by dates are day-granularity (the time component isn't
// meaningful), unlike listed_at's actual listing timestamp.
export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, { dateStyle: "medium" });
}
