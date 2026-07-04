// Short code + brand colour + home country/currency per store, for compact
// badges in results. Keyed by the scraper's `store_name`
// (backend/scrapers/*.py), not the underlying site name — e.g. GUF's search
// API is branded "GUF", not "Guf". country/currency mirror what each
// scraper's SearchResult.currency actually is (see backend/scrapers/*.py).
export const STORE_META = {
  "MTGMate": { code: "MTGM8", color: "#F9A72B", country: "AU", currency: "AUD" },
  "MTGMintCard": { code: "MTGMC", color: "#428BCA", country: "US", currency: "USD" },
  "Good Games TCG": { code: "GG", color: "#1D345E", country: "AU", currency: "AUD" },
  "Card Kingdom": { code: "CK", color: "#2D5174", country: "US", currency: "USD" },
  "GUF": { code: "GUF", color: "#351675", country: "AU", currency: "AUD" },
  "Hareruya": { code: "HARE", color: "#E60012", country: "JP", currency: "JPY" },
  "Card Stars": { code: "CS", color: "#0E1D34", country: "AU", currency: "AUD" },
};

const FALLBACK_COLOR = "#57534e";

export function getStoreMeta(storeName) {
  return (
    STORE_META[storeName] || {
      code: (storeName || "?").slice(0, 4).toUpperCase(),
      color: FALLBACK_COLOR,
      country: null,
      currency: null,
    }
  );
}
