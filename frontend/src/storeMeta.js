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
// own. MTGMintCard has no "worded" logo — its own site uses an icon-only
// mark (dice-and-sparkle) with the store name set as plain text next to it,
// not baked into an image — so its `logo` is that icon as-is, not a
// substitute we chose. Card Kingdom's is a recreation of its site header:
// crest (ck-header-logo.png) left of wordmark (ck-header-title.png),
// vertically centered with a 10px gap at native scale, composed into one
// asset (both sources are white silhouettes, so the result stays tintable).
// logoTint is for logos published only as a plain white silhouette with no
// colored version anywhere (Card Kingdom's crest+wordmark, Hareruya's
// wordmark+mascot) — recolored to `color` via a CSS mask so they still read
// as that store's actual brand color rather than a flat black/white shape.
// logoAspect (only needed alongside logoTint) is the processed PNG's own
// width/height ratio — a masked <span> has no intrinsic size the way an
// <img> does, so without an explicit aspect-ratio it collapses to 0×0
// inside the badge's shrink-to-fit box.
// Multi-color logos (GUF, Good Games, MTGMate, ...) are shown as-is; a few
// of those are genuinely low-contrast in dark mode (GUF's black wordmark,
// Good Games' navy, MTGMintCard's pale icon) or in light mode (MTGMate's
// white "MATE") since they were only ever designed for one of the two
// themes — no fix for those short of a differently-colored source asset,
// which none of these stores publish.
export const STORE_META = {
  "MTGMate": { code: "MTGM8", color: "#F9A72B", country: "AU", currency: "AUD", foilOverlay: false, logo: "/logos/mtgmate.png" },
  "MTGMintCard": { code: "MTGMC", color: "#428BCA", country: "US", currency: "USD", foilOverlay: false, logo: "/logos/mtgmintcard.png" },
  "Good Games TCG": { code: "GG", color: "#1D345E", country: "AU", currency: "AUD", foilOverlay: true, logo: "/logos/goodgames.png" },
  "Card Kingdom": { code: "CK", color: "#2D5174", country: "US", currency: "USD", foilOverlay: true, logo: "/logos/card_kingdom.png", logoTint: true, logoAspect: "1697 / 240" },
  "GUF": { code: "GUF", color: "#351675", country: "AU", currency: "AUD", foilOverlay: true, logo: "/logos/guf.png" },
  "Hareruya": { code: "HARE", color: "#E60012", country: "JP", currency: "JPY", foilOverlay: true, logo: "/logos/hareruya.png", logoTint: true, logoAspect: "1867 / 240" },
  "Card Stars": { code: "CS", color: "#0E1D34", country: "AU", currency: "AUD", foilOverlay: true, logo: "/logos/cardstars.svg" },
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
