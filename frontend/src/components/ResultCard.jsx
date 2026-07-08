import { Sparkles } from "lucide-react";
import { getStoreMeta } from "../storeMeta";
import { formatQty } from "../formatQty";
import { formatPrice } from "../formatPrice";
import { formatListedAt } from "../formatDate";
import TruncatedTooltip from "./TruncatedTooltip";
import FoilOverlay from "./FoilOverlay";
import StoreBadge from "./StoreBadge";
import CartBuyButtons from "./CartBuyButtons";

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
    shipping_price,
    listed_at,
  } = result;
  const storeMeta = getStoreMeta(store_name);
  const displayPrice = pricingMode === "original" ? price_original : price;
  const displayCurrency = pricingMode === "original" ? currency_original : currency;
  // eBay has no set code to show here (its "set_name" is the seller
  // username, already surfaced in the badge tooltip) — the creation date is
  // far more useful in this slot, especially for eBay Snipe results.
  const subtitleText = listed_at
    ? formatListedAt(listed_at)
    : set_name
    ? `${set_name}${collector_number ? ` · #${collector_number}` : ""}`
    : null;

  return (
    <div className="card-frame flex flex-col overflow-hidden">
      <a
        href={product_url}
        target="_blank"
        rel="noreferrer"
        className="relative block aspect-[5/7] rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800"
      >
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
        {/* Corner-ribbon attempt for the foil badge didn't pan out (text
            centering never landed right across iterations) — abandoned in
            favor of a plain badge under the set name below. Left here
            disabled rather than deleted in case it's worth revisiting.
        {foil && (
          <div
            className="absolute top-4 -right-10 sm:top-5 sm:-right-12 w-40 sm:w-48 h-6 sm:h-7 rotate-45 flex items-center justify-center bg-violet-600 text-white pointer-events-none"
            title={foil_treatment || "Foil"}
          >
            <span className="line-clamp-2 w-full text-center text-[8px] sm:text-[9px] font-semibold uppercase leading-tight px-1">
              {foil_treatment || "Foil"}
            </span>
          </div>
        )}
        */}
      </a>

      <div className="p-2 sm:p-3.5 flex flex-col gap-1.5 sm:gap-2.5 flex-1 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
        <div>
          <TruncatedTooltip
            as="h3"
            text={card_name}
            className="font-semibold text-slate-900 dark:text-zinc-50 text-xs sm:text-sm leading-snug"
          />
          {subtitleText && (
            <TruncatedTooltip
              as="p"
              text={subtitleText}
              className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-500 mt-0.5"
            />
          )}
          {foil && (
            <span className="chip mt-1 bg-violet-100 text-violet-700 inline-flex items-center gap-1 w-fit dark:bg-violet-500/15 dark:text-violet-300">
              <Sparkles size={11} /> {foil_treatment || "Foil"}
            </span>
          )}
        </div>

        <div className="mt-auto grid grid-cols-2 items-center gap-x-1.5 gap-y-1 sm:gap-x-2 sm:gap-y-1.5 pt-1">
          {/* Each cell is half the row, so max-w-[90%] of a cell caps each
              span at 45% of the row — opposite-aligned, they can never
              touch (≥10% of the row stays clear between them). */}
          <span className="max-w-[90%] text-[11px] sm:text-xs text-slate-500 dark:text-zinc-500">
            <span className="font-semibold text-slate-700 dark:text-zinc-300 uppercase">{condition}</span>
            {" · "}Qty: {formatQty(quantity_available)}
          </span>
          <StoreBadge result={result} className="justify-self-end" maxWidthClass="max-w-[90%]" />
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className={`text-base sm:text-xl font-semibold leading-tight ${
                displayCurrency === "AUD"
                  ? "text-slate-900 dark:text-zinc-50"
                  : "text-amber-700 dark:text-amber-400"
              }`}
            >
              {formatPrice(displayPrice, displayCurrency)}
            </div>
            {shipping_price != null && (
              <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                +${shipping_price.toFixed(2)}
              </span>
            )}
          </div>
          <CartBuyButtons result={result} className="justify-self-end" />
        </div>
      </div>
    </div>
  );
}
