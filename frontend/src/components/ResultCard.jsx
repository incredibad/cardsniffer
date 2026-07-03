import { Sparkles, ExternalLink } from "lucide-react";

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
    quantity_available,
    image_url,
    product_url,
    store_name,
  } = result;

  return (
    <div className="card-frame overflow-hidden flex flex-col">
      <div className="aspect-[5/7] bg-ink-950">
        {image_url ? (
          <img
            src={image_url}
            alt={card_name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-600 text-sm">
            No image
          </div>
        )}
      </div>

      <div className="p-3.5 flex flex-col gap-2.5 flex-1">
        <div>
          <h3
            className="font-display font-semibold text-gold-200 text-sm leading-snug truncate"
            title={card_name}
          >
            {card_name}
          </h3>
          {set_name && (
            <p className="text-xs text-stone-500 truncate mt-0.5">
              {set_name}
              {collector_number && ` · #${collector_number}`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="chip bg-gold-500/15 text-gold-300 uppercase">{condition}</span>
          {foil && (
            <span className="chip bg-violet-500/15 text-violet-300 inline-flex items-center gap-1">
              <Sparkles size={11} /> Foil
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            <div className="text-lg font-semibold text-stone-100 leading-tight">
              {formatPrice(price, currency)}
            </div>
            <div className="text-xs text-stone-500 truncate">
              {store_name}
              {quantity_available != null && ` · ${quantity_available} in stock`}
            </div>
          </div>
          <a
            href={product_url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gold-600 hover:bg-gold-500 text-ink-950 font-semibold transition-colors"
          >
            Buy <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
