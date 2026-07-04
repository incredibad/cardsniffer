import { Sparkles, ExternalLink } from "lucide-react";
import { getStoreMeta } from "../storeMeta";
import { formatQty } from "../formatQty";
import { formatPrice } from "../formatPrice";
import TruncatedTooltip from "./TruncatedTooltip";
import ImageHoverPreview from "./ImageHoverPreview";

// Two deliberate layouts rather than one flex-wrap row reflowing organically —
// letting rows wrap based on available width made wrap points inconsistent
// row-to-row (long vs short names), which read as staggered/off-centre.
// Mobile mirrors ResultCard's own layout (image beside stacked info, price
// pinned to the bottom) so it feels consistent with grid view; desktop stays
// a single-line table-like row.
export default function ResultTable({ results, pricingMode = "aud" }) {
  return (
    <div className="card-frame overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800/60">
      {results.map((r, i) => {
        const storeMeta = getStoreMeta(r.store_name);
        const displayPrice = pricingMode === "original" ? r.price_original : r.price;
        const displayCurrency = pricingMode === "original" ? r.currency_original : r.currency;
        const priceColorClass =
          displayCurrency === "AUD"
            ? "text-slate-900 dark:text-zinc-50"
            : "text-amber-700 dark:text-amber-400";
        const setText = r.set_name
          ? `${r.set_name}${r.collector_number ? ` · #${r.collector_number}` : ""}`
          : null;

        const conditionChips = (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="chip bg-slate-100 text-slate-600 uppercase dark:bg-zinc-800 dark:text-zinc-300">
              {r.condition}
            </span>
            {r.foil && (
              <span className="chip bg-violet-100 text-violet-700 inline-flex items-center gap-1 dark:bg-violet-500/15 dark:text-violet-300">
                <Sparkles size={11} /> Foil
              </span>
            )}
          </div>
        );

        const storeBadge = (
          <span
            className="chip shrink-0 font-semibold text-white"
            style={{ backgroundColor: storeMeta.color }}
            title={r.store_name}
          >
            {storeMeta.code}
          </span>
        );

        const buyButton = (
          <a
            href={r.product_url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors whitespace-nowrap dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            Buy <ExternalLink size={12} />
          </a>
        );

        return (
          <div
            key={`${r.product_url}-${r.condition}-${i}`}
            className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
          >
            {/* Mobile: column A is the image alone; column B is 3 stacked rows —
                name/set (full width), condition + store (right-aligned), then
                price + qty + buy. */}
            <div className="flex sm:hidden gap-3 p-3">
              <ImageHoverPreview
                src={r.image_url}
                alt={r.card_name}
                foil={r.foil}
                className="w-20 aspect-[5/7] rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0 object-cover"
              />
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="min-w-0">
                  <TruncatedTooltip
                    text={r.card_name}
                    className="font-semibold text-slate-900 dark:text-zinc-50 leading-snug"
                  />
                  {setText && (
                    <TruncatedTooltip
                      text={setText}
                      className="text-xs text-slate-500 dark:text-zinc-500"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  {conditionChips}
                  {storeBadge}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className={`text-lg font-semibold ${priceColorClass}`}>
                    {formatPrice(displayPrice, displayCurrency)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-zinc-500">
                      Qty: {formatQty(r.quantity_available)}
                    </span>
                    {buyButton}
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: single-line table-like row */}
            <div className="hidden sm:flex items-center gap-3 p-3">
              <ImageHoverPreview
                src={r.image_url}
                alt={r.card_name}
                foil={r.foil}
                className="w-10 aspect-[5/7] rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0 object-cover"
              />
              <div className="flex-1 min-w-0">
                <TruncatedTooltip
                  text={r.card_name}
                  className="font-semibold text-slate-900 dark:text-zinc-50 leading-snug"
                />
                {setText && (
                  <TruncatedTooltip
                    text={setText}
                    className="text-xs text-slate-500 dark:text-zinc-500"
                  />
                )}
              </div>
              <div className="w-32 shrink-0">{conditionChips}</div>
              <div className="w-24 shrink-0 text-right">
                <div className={`font-semibold whitespace-nowrap ${priceColorClass}`}>
                  {formatPrice(displayPrice, displayCurrency)}
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-500 whitespace-nowrap">
                  {formatQty(r.quantity_available)} in stock
                </div>
              </div>
              <div className="w-16 shrink-0">{storeBadge}</div>
              {buyButton}
            </div>
          </div>
        );
      })}
    </div>
  );
}
