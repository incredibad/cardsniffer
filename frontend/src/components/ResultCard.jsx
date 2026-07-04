import { ExternalLink } from "lucide-react";
import { getStoreMeta } from "../storeMeta";
import { formatQty } from "../formatQty";
import { formatPrice } from "../formatPrice";
import TruncatedTooltip from "./TruncatedTooltip";
import FoilOverlay from "./FoilOverlay";

export default function ResultCard({ result, pricingMode = "aud" }) {
  const {
    card_name,
    set_name,
    collector_number,
    foil,
    foil_treatment,
    condition,
    price,
    currency,
    price_original,
    currency_original,
    quantity_available,
    image_url,
    product_url,
    store_name,
  } = result;
  const storeMeta = getStoreMeta(store_name);
  const displayPrice = pricingMode === "original" ? price_original : price;
  const displayCurrency = pricingMode === "original" ? currency_original : currency;

  return (
    <div className="card-frame flex flex-col overflow-hidden">
      <div className="relative aspect-[5/7] rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800">
        {image_url ? (
          <img
            src={image_url}
            alt={card_name}
            loading="lazy"
            className="w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-zinc-600 text-sm">
            No image
          </div>
        )}
        {foil && storeMeta.foilOverlay && <FoilOverlay />}
        {foil && (
          // No intermediate clip box — that nested overflow-hidden was the
          // source of the visible seam/"clipping lines" (a hard edge where
          // shadow-sm got abruptly cut off), and needed exact diagonal math
          // to avoid gaps. Simpler and more robust: make the ribbon far
          // bigger than any card could be and let the *image's own*
          // rounded-2xl overflow-hidden (one boundary, already there) do the
          // only clipping. top-6 right-6 + translate-x-1/2/-translate-y-1/2
          // centers it on that point regardless of its own size, so 1-line
          // vs 2-line wrapped text (different heights) both stay centered.
          <div
            className="absolute top-6 right-6 translate-x-1/2 -translate-y-1/2 w-40 sm:w-56 rotate-45 text-center pointer-events-none"
            title={foil_treatment || "Foil"}
          >
            <span className="block w-full break-words bg-violet-600 text-white font-semibold uppercase text-[7px] sm:text-[9px] leading-tight py-1">
              {foil_treatment || "Foil"}
            </span>
          </div>
        )}
      </div>

      <div className="p-2 sm:p-3.5 flex flex-col gap-1.5 sm:gap-2.5 flex-1 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
        <div>
          <TruncatedTooltip
            as="h3"
            text={card_name}
            className="font-semibold text-slate-900 dark:text-zinc-50 text-xs sm:text-sm leading-snug"
          />
          {set_name && (
            <TruncatedTooltip
              as="p"
              text={`${set_name}${collector_number ? ` · #${collector_number}` : ""}`}
              className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-500 mt-0.5"
            />
          )}
        </div>

        <div className="mt-auto grid grid-cols-2 items-center gap-x-1.5 gap-y-1 sm:gap-x-2 sm:gap-y-1.5 pt-1">
          <span className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-500">
            <span className="font-semibold text-slate-700 dark:text-zinc-300 uppercase">{condition}</span>
            {" · "}Qty: {formatQty(quantity_available)}
          </span>
          <span
            className="chip shrink-0 font-semibold text-white w-fit justify-self-end"
            style={{ backgroundColor: storeMeta.color }}
            title={store_name}
          >
            {storeMeta.code}
          </span>
          <div
            className={`text-base sm:text-xl font-semibold leading-tight ${
              displayCurrency === "AUD"
                ? "text-slate-900 dark:text-zinc-50"
                : "text-amber-700 dark:text-amber-400"
            }`}
          >
            {formatPrice(displayPrice, displayCurrency)}
          </div>
          <a
            href={product_url}
            target="_blank"
            rel="noreferrer"
            className="justify-self-end shrink-0 inline-flex items-center gap-1 text-[11px] sm:text-xs px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            Buy <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
