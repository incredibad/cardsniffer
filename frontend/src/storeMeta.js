// Short code + brand colour per store, for compact badges in results.
// Keyed by the scraper's `store_name` (backend/scrapers/*.py), not the
// underlying site name — e.g. GUF's search API is branded "GUF", not "Guf".
export const STORE_META = {
  "MTGMate": { code: "MTGM8", color: "#F9A72B" },
  "MTGMintCard": { code: "MTGMC", color: "#428BCA" },
  "Good Games TCG": { code: "GG", color: "#1D345E" },
  "Card Kingdom": { code: "CK", color: "#2D5174" },
  "GUF": { code: "GUF", color: "#351675" },
  "Hareruya": { code: "HARE", color: "#E60012" },
  "Card Stars": { code: "CS", color: "#0E1D34" },
};

const FALLBACK_COLOR = "#57534e";

export function getStoreMeta(storeName) {
  return (
    STORE_META[storeName] || {
      code: (storeName || "?").slice(0, 4).toUpperCase(),
      color: FALLBACK_COLOR,
    }
  );
}
