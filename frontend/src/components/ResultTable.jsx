import { Sparkles, ExternalLink } from "lucide-react";
import { getStoreMeta } from "../storeMeta";

function formatPrice(price, currency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
}

// A flex row that wraps rather than a rigid <table> — card art is portrait,
// so on narrow screens the price/store/buy group drops to its own line
// below the name instead of forcing horizontal overflow.
export default function ResultTable({ results, pricingMode = "aud" }) {
  return (
    <div className="card-frame overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800/60">
      {results.map((r, i) => {
        const storeMeta = getStoreMeta(r.store_name);
        const displayPrice = pricingMode === "original" ? r.price_original : r.price;
        const displayCurrency = pricingMode === "original" ? r.currency_original : r.currency;
        return (
          <div
            key={`${r.product_url}-${r.condition}-${i}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
          >
            <div className="w-16 aspect-[5/7] rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0">
              {r.image_url ? (
                <img
                  src={r.image_url}
                  alt={r.card_name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>

            <div className="flex-1 min-w-[10rem]">
              <div className="font-semibold text-slate-900 dark:text-zinc-50 leading-snug truncate">
                {r.card_name}
              </div>
              {r.set_name && (
                <div className="text-xs text-slate-500 dark:text-zinc-500 truncate">
                  {r.set_name}
                  {r.collector_number && ` · #${r.collector_number}`}
                </div>
              )}
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <span className="chip bg-slate-100 text-slate-600 uppercase dark:bg-zinc-800 dark:text-zinc-300">
                  {r.condition}
                </span>
                {r.foil && (
                  <span className="chip bg-violet-100 text-violet-700 inline-flex items-center gap-1 dark:bg-violet-500/15 dark:text-violet-300">
                    <Sparkles size={11} /> Foil
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <div className="text-right">
                <div className="text-slate-900 dark:text-zinc-50 font-semibold whitespace-nowrap">
                  {formatPrice(displayPrice, displayCurrency)}
                </div>
                {r.quantity_available != null && (
                  <div className="text-xs text-slate-500 dark:text-zinc-500 whitespace-nowrap">
                    {r.quantity_available} in stock
                  </div>
                )}
              </div>
              <span
                className="chip shrink-0 font-semibold text-white"
                style={{ backgroundColor: storeMeta.color }}
                title={r.store_name}
              >
                {storeMeta.code}
              </span>
              <a
                href={r.product_url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors whitespace-nowrap dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Buy <ExternalLink size={12} />
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
