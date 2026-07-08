import { ShoppingCart, ExternalLink } from "lucide-react";
import { useCart } from "../CartContext";

// The action pair on every result (grid and table views): one pill split
// into Cart (adds the listing to that store's per-user cart) and Buy (opens
// the store's product page — unchanged from the old standalone Buy button).
export default function CartBuyButtons({ result, className = "" }) {
  const { addToCart } = useCart();

  const segment =
    "inline-flex items-center gap-1 text-[11px] sm:text-xs px-2 py-1 sm:px-2.5 sm:py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors whitespace-nowrap dark:bg-indigo-500 dark:hover:bg-indigo-400";

  return (
    <div className={`inline-flex items-stretch rounded-full overflow-hidden shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => addToCart(result)}
        className={`${segment} border-r border-white/30 dark:border-white/25`}
        aria-label={`Add ${result.card_name} to ${result.store_name} cart`}
      >
        <ShoppingCart size={12} /> Cart
      </button>
      <a href={result.product_url} target="_blank" rel="noreferrer" className={segment}>
        Buy <ExternalLink size={12} />
      </a>
    </div>
  );
}
