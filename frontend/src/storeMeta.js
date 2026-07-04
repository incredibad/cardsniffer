// Short code + brand colour + home country/currency per store, for compact
// badges in results. Keyed by the scraper's `store_name`
// (backend/scrapers/*.py), not the underlying site name — e.g. GUF's search
// API is branded "GUF", not "Guf". country/currency mirror what each
// scraper's SearchResult.currency actually is (see backend/scrapers/*.py).
//
// foilOverlay: whether our own rainbow foil sheen (FoilOverlay) should be
// drawn over this store's images. Off for stores whose own photography
// already shows genuine foil shine, so we don't double up on it.
export const STORE_META = {
  "MTGMate": { code: "MTGM8", color: "#F9A72B", country: "AU", currency: "AUD", foilOverlay: false },
  "MTGMintCard": { code: "MTGMC", color: "#428BCA", country: "US", currency: "USD", foilOverlay: false },
  "Good Games TCG": { code: "GG", color: "#1D345E", country: "AU", currency: "AUD", foilOverlay: true },
  "Card Kingdom": { code: "CK", color: "#2D5174", country: "US", currency: "USD", foilOverlay: true },
  "GUF": { code: "GUF", color: "#351675", country: "AU", currency: "AUD", foilOverlay: true },
  "Hareruya": { code: "HARE", color: "#E60012", country: "JP", currency: "JPY", foilOverlay: true },
  "Card Stars": { code: "CS", color: "#0E1D34", country: "AU", currency: "AUD", foilOverlay: true },
};

const FALLBACK_COLOR = "#57534e";

export function getStoreMeta(storeName) {
  return (
    STORE_META[storeName] || {
      code: (storeName || "?").slice(0, 4).toUpperCase(),
      color: FALLBACK_COLOR,
      country: null,
      currency: null,
      foilOverlay: true,
    }
  );
}
