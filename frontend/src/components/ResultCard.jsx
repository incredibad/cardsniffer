import { Sparkles, ExternalLink, PackageX } from "lucide-react";

function formatPrice(price, currency) {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${price.toFixed(2)}`;
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
    in_stock,
    quantity_available,
    image_url,
    product_url,
    store_name,
  } = result;

  return (
    <div className="card-frame overflow-hidden flex flex-col">
      <div className="aspect-[5/7] bg-ink-950 flex items-center justify-center overflow-hidden">
        {image_url ? (
          <img
            src={image_url}
            alt={card_name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-stone-600 text-sm">No image</span>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="border-b border-gold-700/40 pb-2">
          <h3 className="font-display font-semibold text-gold-200 text-sm leading-tight truncate" title={card_name}>
            {card_name}
          </h3>
          {set_name && (
            <p className="text-xs text-stone-400 truncate">
              {set_name}
              {collector_number && ` · #${collector_number}`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="px-1.5 py-0.5 rounded border border-gold-600/60 text-gold-300 uppercase tracking-wide">
            {condition}
          </span>
          {foil && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-400/60 text-amber-300">
              <Sparkles size={12} /> Foil
            </span>
          )}
          {!in_stock && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-red-500/50 text-red-400">
              <PackageX size={12} /> Out of stock
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between pt-1">
          <div>
            <div className="text-lg font-semibold text-stone-100">{formatPrice(price, currency)}</div>
            <div className="text-xs text-stone-500">
              {store_name}
              {quantity_available != null && ` · ${quantity_available} available`}
            </div>
          </div>
          <a
            href={product_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gold-600/90 hover:bg-gold-500 text-ink-950 font-semibold transition-colors"
          >
            Buy <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
