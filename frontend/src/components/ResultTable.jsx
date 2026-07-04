import { Sparkles, ExternalLink } from "lucide-react";
import { getStoreMeta } from "../storeMeta";

function formatPrice(price, currency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
}

export default function ResultTable({ results }) {
  return (
    <div className="card-frame overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gold-700/30 text-left">
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
            return (
            <tr
              key={`${r.product_url}-${r.condition}-${i}`}
              className="border-b border-gold-700/10 last:border-0 hover:bg-ink-900/60 transition-colors"
            >
              <td className="p-2">
                <div className="w-10 h-14 rounded overflow-hidden bg-ink-950 shrink-0">
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
                <div className="font-display font-semibold text-gold-200 leading-snug">
                  {r.card_name}
                </div>
                {r.set_name && (
                  <div className="text-xs text-stone-500 mt-0.5">
                    {r.set_name}
                    {r.collector_number && ` · #${r.collector_number}`}
                  </div>
                )}
              </td>
              <td className="p-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="chip bg-gold-500/15 text-gold-300 uppercase">{r.condition}</span>
                  {r.foil && (
                    <span className="chip bg-violet-500/15 text-violet-300 inline-flex items-center gap-1">
                      <Sparkles size={11} /> Foil
                    </span>
                  )}
                </div>
              </td>
              <td className="p-3 text-right">
                <div className="text-stone-100 font-semibold">{formatPrice(r.price, r.currency)}</div>
                {r.quantity_available != null && (
                  <div className="text-xs text-stone-500">{r.quantity_available} in stock</div>
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
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gold-600 hover:bg-gold-500 text-ink-950 font-semibold transition-colors whitespace-nowrap"
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
