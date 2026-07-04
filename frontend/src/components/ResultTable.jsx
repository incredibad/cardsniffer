import { Sparkles, ExternalLink } from "lucide-react";
import { getStoreMeta } from "../storeMeta";

function formatPrice(price, currency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
}

export default function ResultTable({ results, pricingMode = "aud" }) {
  return (
    <div className="card-frame overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-zinc-800 text-left">
            <th className="p-3 w-14"></th>
            <th className="p-3 section-header font-normal">Card</th>
            <th className="p-3 section-header font-normal">Condition</th>
            <th className="p-3 section-header font-normal text-right">Price</th>
            <th className="p-3 section-header font-normal">Store</th>
            <th className="p-3 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const storeMeta = getStoreMeta(r.store_name);
            const displayPrice = pricingMode === "original" ? r.price_original : r.price;
            const displayCurrency = pricingMode === "original" ? r.currency_original : r.currency;
            return (
            <tr
              key={`${r.product_url}-${r.condition}-${i}`}
              className="border-b border-slate-100 dark:border-zinc-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <td className="p-2">
                <div className="w-10 h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0">
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt={r.card_name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
              </td>
              <td className="p-3">
                <div className="font-semibold text-slate-900 dark:text-zinc-50 leading-snug">
                  {r.card_name}
                </div>
                {r.set_name && (
                  <div className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">
                    {r.set_name}
                    {r.collector_number && ` · #${r.collector_number}`}
                  </div>
                )}
              </td>
              <td className="p-3">
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
              </td>
              <td className="p-3 text-right">
                <div className="text-slate-900 dark:text-zinc-50 font-semibold">
                  {formatPrice(displayPrice, displayCurrency)}
                </div>
                {r.quantity_available != null && (
                  <div className="text-xs text-slate-500 dark:text-zinc-500">
                    {r.quantity_available} in stock
                  </div>
                )}
              </td>
              <td className="p-3">
                <span
                  className="chip font-semibold text-white"
                  style={{ backgroundColor: storeMeta.color }}
                  title={r.store_name}
                >
                  {storeMeta.code}
                </span>
              </td>
              <td className="p-3">
                <a
                  href={r.product_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors whitespace-nowrap dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  Buy <ExternalLink size={12} />
                </a>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
