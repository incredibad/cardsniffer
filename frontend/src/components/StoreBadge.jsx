import { getStoreMeta } from "../storeMeta";
import Tooltip from "./Tooltip";
import EbayListingTooltipContent from "./EbayListingTooltipContent";

// Store identifier shown on every result — a standardized brand-logo pill
// where we have one (see storeMeta.js), falling back to the color+code chip
// for anything without a logo yet. eBay Snipe results (result.listed_at set)
// get an extra hover tooltip with the raw listing details, in which case
// `className` (e.g. grid positioning) goes on the Tooltip's wrapper instead
// of the badge itself so the hover target still lines up.
export default function StoreBadge({ result, className = "" }) {
  const storeMeta = getStoreMeta(result.store_name);
  const isTooltip = Boolean(result.listed_at);
  const badgeClassName = ["shrink-0 w-fit", isTooltip && "cursor-help", !isTooltip && className]
    .filter(Boolean)
    .join(" ");

  const content = storeMeta.logo ? (
    <span
      className={`chip inline-flex items-center px-1.5 py-1 ${
        storeMeta.logoBg === "dark" ? "bg-zinc-900" : "bg-white border border-slate-200 dark:border-transparent"
      } ${badgeClassName}`}
      title={result.store_name}
    >
      <img src={storeMeta.logo} alt={result.store_name} className="h-3 sm:h-3.5 w-auto object-contain" />
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
