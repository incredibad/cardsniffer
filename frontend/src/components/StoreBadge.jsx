import { getStoreMeta } from "../storeMeta";
import Tooltip from "./Tooltip";
import EbayListingTooltipContent from "./EbayListingTooltipContent";

// Store identifier shown on every result — the real brand logo where we
// have one (see storeMeta.js), sitting directly on the card's own
// background (no pill), falling back to the color+code chip for anything
// without a logo yet. Bounded to a fixed box (height-capped, width-capped)
// so icon-shaped and wordmark-shaped logos still line up next to each
// other despite wildly different native aspect ratios. eBay Snipe results
// (result.listed_at set) get an extra hover tooltip with the raw listing
// details, in which case `className` (e.g. grid positioning) goes on the
// Tooltip's wrapper instead of the badge itself so the hover target still
// lines up.
// maxWidthClass is a prop (not baked in) so call sites in %-sized layouts
// (ResultCard's grid row) can swap the default px cap for a relative one
// without two conflicting max-w-* utilities landing on the same span.
export default function StoreBadge({
  result,
  className = "",
  maxWidthClass = "max-w-[72px] sm:max-w-[92px]",
}) {
  const storeMeta = getStoreMeta(result.store_name);
  const isTooltip = Boolean(result.listed_at);
  const badgeClassName = ["shrink-0 w-fit", isTooltip && "cursor-help", !isTooltip && className]
    .filter(Boolean)
    .join(" ");

  const content = storeMeta.logo ? (
    <span
      className={`inline-flex items-center h-5 sm:h-6 ${maxWidthClass} ${badgeClassName}`}
      title={result.store_name}
    >
      {storeMeta.logoTint ? (
        // Plain white-silhouette source asset (no brand-colored version
        // published) — recolored to the brand color via a CSS mask instead
        // of shown as a flat white/black shape, so it still reads as *that
        // store's* mark rather than a generic icon. max-w-full because the
        // explicit aspect-ratio + h-full otherwise ignores the outer span's
        // width cap entirely — a wide wordmark (Hareruya, Card Kingdom)
        // would render at its full aspect width and clip out of the card;
        // mask-size: contain rescales the mark inside the clamped box.
        <span
          className="h-full max-w-full"
          style={{
            aspectRatio: storeMeta.logoAspect,
            backgroundColor: storeMeta.color,
            WebkitMaskImage: `url(${storeMeta.logo})`,
            maskImage: `url(${storeMeta.logo})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
      ) : (
        <img src={storeMeta.logo} alt={result.store_name} className="h-full w-full object-contain" />
      )}
    </span>
  ) : (
    <span
      className={`chip font-semibold text-white ${badgeClassName}`}
      style={{ backgroundColor: storeMeta.color }}
      title={result.store_name}
    >
      {storeMeta.code}
    </span>
  );

  if (!isTooltip) return content;

  return (
    <Tooltip className={className} content={<EbayListingTooltipContent result={result} />}>
      {content}
    </Tooltip>
  );
}
