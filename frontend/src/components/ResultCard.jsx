import { Sparkles, ExternalLink } from "lucide-react";
import { getStoreMeta } from "../storeMeta";

function formatPrice(price, currency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
}

export default function ResultCard({ result }) {
  const {
    card_name,
    set_name,
    collector_number,
    foil,
    condition,
    price,
    currency,
    quantity_available,
    image_url,
    product_url,
    store_name,
  } = result;
  const storeMeta = getStoreMeta(store_name);

  return (
    <div className="card-frame flex flex-col overflow-hidden">
      <div className="aspect-[5/7] rounded-t-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800">
        {image_url ? (
          <img
            src={image_url}
            alt={card_name}
            loading="lazy"
            className="w-full h-full object-cover rounded-t-2xl"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-zinc-600 text-sm">
            No image
          </div>
        )}
      </div>

      <div className="p-3.5 flex flex-col gap-2.5 flex-1 rounded-b-2xl overflow-hidden bg-white dark:bg-zinc-900">
        <div>
          <h3
            className="font-semibold text-slate-900 dark:text-zinc-50 text-sm leading-snug truncate"
            title={card_name}
          >
            {card_name}
          </h3>
          {set_name && (
            <p className="text-xs text-slate-500 dark:text-zinc-500 truncate mt-0.5">
              {set_name}
              {collector_number && ` · #${collector_number}`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="chip bg-slate-100 text-slate-600 uppercase dark:bg-zinc-800 dark:text-zinc-300">
            {condition}
          </span>
          {foil && (
            <span className="chip bg-violet-100 text-violet-700 inline-flex items-center gap-1 dark:bg-violet-500/15 dark:text-violet-300">
              <Sparkles size={11} /> Foil
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            <div className="text-lg font-semibold text-slate-900 dark:text-zinc-50 leading-tight">
              {formatPrice(price, currency)}
            </div>
            <div className="text-xs text-slate-500 dark:text-zinc-500 truncate flex items-center gap-1.5">
              <span
                className="chip shrink-0 font-semibold text-white"
                style={{ backgroundColor: storeMeta.color }}
                title={store_name}
              >
                {storeMeta.code}
              </span>
              {quantity_available != null && <span>{quantity_available} in stock</span>}
            </div>
          </div>
          <a
            href={product_url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            Buy <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
