import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X, ShoppingCart, ArrowRight } from "lucide-react";
import { useCart } from "../CartContext";
import { formatPrice } from "../formatPrice";
import { formatCartTotal } from "../cartTotals";
import SelectDropdown from "./SelectDropdown";
import StoreBadge from "./StoreBadge";
import TruncatedTooltip from "./TruncatedTooltip";

// Quick-glance cart panel sliding in from the right when the header cart
// icon is clicked — a flat list (art, name, store, price) across all store
// carts with a store filter, deliberately without the full Cart page's
// management actions (delete/clear); the header links there for those.
export default function CartDrawer({ open, onClose }) {
  const { items, count } = useCart();
  const [storeFilter, setStoreFilter] = useState("all");

  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const storeNames = useMemo(
    () => [...new Set(items.map((i) => i.store_name))].sort(),
    [items]
  );

  // A filter pointing at a store whose last item was removed (or another
  // device cleared) falls back to All rather than showing an empty list.
  useEffect(() => {
    if (storeFilter !== "all" && !storeNames.includes(storeFilter)) setStoreFilter("all");
  }, [storeNames, storeFilter]);

  if (!open) return null;

  const visible = storeFilter === "all" ? items : items.filter((i) => i.store_name === storeFilter);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="drawer-slide absolute right-0 top-0 h-full w-full max-w-sm flex flex-col bg-white border-l border-slate-200 shadow-xl dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-2 p-4 border-b border-slate-100 dark:border-zinc-800">
          <Link
            to="/cart"
            onClick={onClose}
            className="flex items-center gap-2 font-semibold text-slate-900 hover:text-indigo-600 dark:text-zinc-50 dark:hover:text-indigo-400 transition-colors"
          >
            <ShoppingCart size={18} />
            Cart{count > 0 && ` (${count})`}
            <ArrowRight size={15} />
          </Link>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
            <ShoppingCart size={32} className="text-slate-300 dark:text-zinc-700" />
            <p className="text-sm text-slate-500 dark:text-zinc-400">Your carts are empty</p>
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-slate-100 dark:border-zinc-800">
              <SelectDropdown
                value={storeFilter}
                onChange={setStoreFilter}
                options={[
                  { value: "all", label: "All stores" },
                  ...storeNames.map((name) => ({ value: name, label: name })),
                ]}
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60">
              {visible.map((item) => (
                <a
                  key={item.id}
                  href={item.product_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <span className="block w-10 aspect-[5/7] rounded-md overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.card_name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <TruncatedTooltip
                        text={item.card_name}
                        className="text-sm font-medium text-slate-900 dark:text-zinc-50 leading-snug min-w-0"
                      />
                      {item.quantity > 1 && (
                        <span className="shrink-0 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          ×{item.quantity}
                        </span>
                      )}
                    </span>
                    <StoreBadge result={item} className="mt-1" />
                  </span>
                  <span
                    className={`shrink-0 text-sm font-semibold whitespace-nowrap ${
                      item.currency === "AUD"
                        ? "text-slate-900 dark:text-zinc-50"
                        : "text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {formatPrice(item.price, item.currency)}
                  </span>
                </a>
              ))}
            </div>

            {/* Total follows the store filter — filtered to one store, it's
                that store's total; on All stores it's the grand total. */}
            <div className="flex items-center justify-between gap-2 p-4 border-t border-slate-100 dark:border-zinc-800">
              <span className="text-sm text-slate-500 dark:text-zinc-400">
                Total{storeFilter !== "all" && ` · ${storeFilter}`}
              </span>
              <span className="font-semibold text-slate-900 dark:text-zinc-50">
                {formatCartTotal(visible)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
