// Short code + brand colour + home country/currency per store, for compact
// badges in results. Keyed by the scraper's `store_name`
// (backend/scrapers/*.py), not the underlying site name — e.g. GUF's search
// API is branded "GUF", not "Guf". country/currency mirror what each
// scraper's SearchResult.currency actually is (see backend/scrapers/*.py).
//
// foilOverlay: whether our own rainbow foil sheen (FoilOverlay) should be
// drawn over this store's images. Off for stores whose own photography
// already shows genuine foil shine, so we don't double up on it.
//
// logo: standardized (trimmed + resized to a common height, see scratchpad
// notes) brand mark in public/logos/, shown directly on the card's own
// background instead of the color+code chip — no pill/background of its
// own. logoInvert is for logos that are a plain white silhouette (Card
// Kingdom's crest, Hareruya's wordmark+mascot) — inverted to black in light
// mode via CSS, left alone (white) in dark mode, so one asset reads on both.
// Multi-color logos (GUF, Good Games, MTGMate, ...) are shown as-is; a few
// of those are genuinely low-contrast in dark mode (GUF's black wordmark,
// Good Games' navy) or in light mode (MTGMate's white "MATE") since they
// were only ever designed for one of the two themes — no fix for those
// short of a differently-colored source asset, which none of these stores
// publish.
export const STORE_META = {
  "MTGMate": { code: "MTGM8", color: "#F9A72B", country: "AU", currency: "AUD", foilOverlay: false, logo: "/logos/mtgmate.png" },
  "MTGMintCard": { code: "MTGMC", color: "#428BCA", country: "US", currency: "USD", foilOverlay: false, logo: "/logos/mtgmintcard.png" },
  "Good Games TCG": { code: "GG", color: "#1D345E", country: "AU", currency: "AUD", foilOverlay: true, logo: "/logos/goodgames.png" },
  "Card Kingdom": { code: "CK", color: "#2D5174", country: "US", currency: "USD", foilOverlay: true, logo: "/logos/card_kingdom.png", logoInvert: true },
  "GUF": { code: "GUF", color: "#351675", country: "AU", currency: "AUD", foilOverlay: true, logo: "/logos/guf.png" },
  "Hareruya": { code: "HARE", color: "#E60012", country: "JP", currency: "JPY", foilOverlay: true, logo: "/logos/hareruya.png", logoInvert: true },
  "Card Stars": { code: "CS", color: "#0E1D34", country: "AU", currency: "AUD", foilOverlay: true, logo: "/logos/cardstars.png" },
  "eBay": { code: "EBAY", color: "#FFBD14", country: "AU", currency: "AUD", foilOverlay: false, logo: "/logos/ebay.png" },
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
