import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, ExternalLink, Trash2, Sparkles, RefreshCw } from "lucide-react";
import { useCart } from "../CartContext";
import { STORE_META } from "../storeMeta";
import { formatPrice } from "../formatPrice";
import { formatCartTotal } from "../cartTotals";
import { formatAgo } from "../formatDate";
import StoreBadge from "../components/StoreBadge";
import TruncatedTooltip from "../components/TruncatedTooltip";
import Modal from "../components/Modal";
import { MissingWarning } from "../components/CartDrawer";

// Per-store carts, one tab per store that has items. Prices/stock are
// snapshots from when each card was added (or last re-checked via Refresh
// Prices) — hence the "added/checked X ago" note on every row.
export default function Cart() {
  const { items, count, removeItem, clearStore, clearAll, refreshPrices, refreshing } = useCart();
  const [activeStore, setActiveStore] = useState(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Stable tab order: STORE_META's own order first (matches how stores are
  // presented elsewhere), any unknown store appended alphabetically.
  const stores = useMemo(() => {
    const grouped = new Map();
    for (const item of items) {
      if (!grouped.has(item.store_name)) grouped.set(item.store_name, []);
      grouped.get(item.store_name).push(item);
    }
    const known = Object.keys(STORE_META).filter((name) => grouped.has(name));
    const unknown = [...grouped.keys()].filter((name) => !STORE_META[name]).sort();
    return [...known, ...unknown].map((name) => ({
      name,
      items: grouped.get(name),
      count: grouped.get(name).reduce((sum, item) => sum + item.quantity, 0),
    }));
  }, [items]);

  // Keep a valid tab selected as carts empty out or first load in.
  useEffect(() => {
    if (!stores.some((s) => s.name === activeStore)) {
      setActiveStore(stores[0]?.name ?? null);
    }
  }, [stores, activeStore]);

  const active = stores.find((s) => s.name === activeStore);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="page-header text-3xl">Cart</h1>
        {count > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={refreshPrices}
              disabled={refreshing}
              title="Re-check current store prices for everything in your carts"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60 transition-colors dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-indigo-500/40 dark:hover:text-indigo-400"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : undefined} />
              {refreshing ? "Refreshing…" : "Refresh Prices"}
            </button>
            <button
              onClick={() => setConfirmClearAll(true)}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <Trash2 size={14} /> Clear all Carts
            </button>
          </div>
        )}
      </div>

      {stores.length === 0 ? (
        <div className="card-frame flex flex-col items-center gap-3 py-16 text-center">
          <ShoppingCart size={40} className="text-slate-300 dark:text-zinc-700" />
          <p className="text-slate-500 dark:text-zinc-400">Your carts are empty</p>
          <p className="text-sm text-slate-400 dark:text-zinc-500">
            Use the Cart button on a search result to add it to that store's cart
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-1 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto">
            {stores.map((s) => (
              <button
                key={s.name}
                onClick={() => setActiveStore(s.name)}
                title={s.name}
                className={`flex items-center gap-2 px-4 py-2.5 border-b-2 -mb-px transition-colors shrink-0 ${
                  s.name === activeStore
                    ? "border-indigo-600 dark:border-indigo-400"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <StoreBadge result={{ store_name: s.name }} />
                <span
                  className={`chip ${
                    s.name === activeStore
                      ? "bg-indigo-600 text-white dark:bg-indigo-500"
                      : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {s.count}
                </span>
              </button>
            ))}
          </div>

          {active && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500 dark:text-zinc-400">
                  {active.count} card{active.count === 1 ? "" : "s"} in your {active.name} cart
                </span>
                <button
                  onClick={() => clearStore(active.name)}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-red-400 dark:hover:border-red-500/30"
                >
                  <Trash2 size={13} /> Clear Cart
                </button>
              </div>

              <div className="card-frame overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800/60">
                {active.items.map((item) => (
                  <CartRow key={item.id} item={item} onRemove={() => removeItem(item.id)} />
                ))}
                <div className="flex items-center justify-between gap-2 p-3 bg-slate-50/60 dark:bg-zinc-800/30">
                  <span className="text-sm text-slate-500 dark:text-zinc-400">
                    Total · {active.count} card{active.count === 1 ? "" : "s"}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-50">
                    {formatCartTotal(active.items)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {confirmClearAll && (
        <Modal title="Clear all Carts" onClose={() => setConfirmClearAll(false)}>
          <p className="text-sm text-slate-600 dark:text-zinc-300 mb-4">
            Remove all {count} card{count === 1 ? "" : "s"} from every store's cart? This can't be
            undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmClearAll(false)}
              className="text-sm px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                clearAll();
                setConfirmClearAll(false);
              }}
              className="text-sm px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
            >
              Clear all Carts
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CartRow({ item, onRemove }) {
  const addedAgo = formatAgo(item.added_at);
  const checkedAgo = formatAgo(item.price_checked_at);

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
      <a
        href={item.product_url}
        target="_blank"
        rel="noreferrer"
        className="block w-12 sm:w-14 aspect-[5/7] rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0"
      >
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.card_name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        )}
      </a>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <TruncatedTooltip
            text={item.card_name}
            className="font-semibold text-slate-900 dark:text-zinc-50 leading-snug min-w-0"
          />
          {item.quantity > 1 && (
            <span className="shrink-0 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              ×{item.quantity}
            </span>
          )}
          {item.refresh_missing && <MissingWarning size={14} />}
        </div>
        {item.set_name && (
          <TruncatedTooltip
            text={`${item.set_name}${item.collector_number ? ` · #${item.collector_number}` : ""}`}
            className="text-xs text-slate-500 dark:text-zinc-500"
          />
        )}
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          <span className="chip bg-slate-100 text-slate-600 uppercase dark:bg-zinc-800 dark:text-zinc-300">
            {item.condition}
          </span>
          {item.foil && (
            <span className="chip bg-violet-100 text-violet-700 inline-flex items-center gap-1 dark:bg-violet-500/15 dark:text-violet-300">
              <Sparkles size={11} /> {item.foil_treatment || "Foil"}
            </span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="flex items-center justify-end gap-1.5">
          <span
            className={`font-semibold whitespace-nowrap ${
              item.currency === "AUD"
                ? "text-slate-900 dark:text-zinc-50"
                : "text-amber-700 dark:text-amber-400"
            }`}
          >
            {formatPrice(item.price, item.currency)}
          </span>
          {item.shipping_price != null && (
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">
              +${item.shipping_price.toFixed(2)}
            </span>
          )}
        </div>
        {/* Once a refresh has re-checked the listing, "checked X ago" is the
            price's real age — more useful than when it was first added. */}
        {checkedAgo ? (
          <div
            className="text-[11px] text-slate-400 dark:text-zinc-500 whitespace-nowrap"
            title="When Refresh Prices last re-checked this listing at the store"
          >
            checked {checkedAgo}
          </div>
        ) : (
          addedAgo && (
            <div
              className="text-[11px] text-slate-400 dark:text-zinc-500 whitespace-nowrap"
              title="Price and stock are from when this was added — the store may have changed them since"
            >
              added {addedAgo}
            </div>
          )
        )}
      </div>

      <a
        href={item.product_url}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors whitespace-nowrap dark:bg-indigo-500 dark:hover:bg-indigo-400"
      >
        Buy <ExternalLink size={12} />
      </a>

      <button
        onClick={onRemove}
        aria-label={`Remove ${item.card_name} from cart`}
        className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-red-500/10"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
