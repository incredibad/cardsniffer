import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { useAuth } from "./AuthContext";
import { useToast } from "./components/Toast";

// Per-store carts, server-side per user (cart_items table). Every mutation
// endpoint returns the full cart, so state here is always a straight
// replacement — the header badge and Cart page stay in sync without
// refetching.
const CartContext = createContext(null);

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const showToast = useToast();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    api.getCart().then(setItems).catch(() => {});
  }, [user]);

  const addToCart = useCallback(
    async (result) => {
      try {
        setItems(
          await api.addToCart({
            store_name: result.store_name,
            card_name: result.card_name,
            set_name: result.set_name ?? null,
            collector_number: result.collector_number ?? null,
            foil: Boolean(result.foil),
            foil_treatment: result.foil_treatment ?? null,
            condition: result.condition,
            price: result.price,
            currency: result.currency,
            price_original: result.price_original ?? null,
            currency_original: result.currency_original ?? null,
            shipping_price: result.shipping_price ?? null,
            image_url: result.image_url ?? null,
            product_url: result.product_url,
          })
        );
        showToast(`${result.card_name} added to ${result.store_name} cart`);
      } catch (e) {
        showToast(e.message || "Couldn't add to cart", "error");
      }
    },
    [showToast]
  );

  const removeItem = useCallback(
    async (id) => {
      try {
        setItems(await api.deleteCartItem(id));
      } catch (e) {
        showToast(e.message || "Couldn't remove item", "error");
      }
    },
    [showToast]
  );

  const clearStore = useCallback(
    async (storeName) => {
      try {
        setItems(await api.clearStoreCart(storeName));
      } catch (e) {
        showToast(e.message || "Couldn't clear cart", "error");
      }
    },
    [showToast]
  );

  const clearAll = useCallback(async () => {
    try {
      setItems(await api.clearAllCarts());
    } catch (e) {
      showToast(e.message || "Couldn't clear carts", "error");
    }
  }, [showToast]);

  // Re-scrapes every store cart on the backend, so this can take as long as
  // a search — `refreshing` drives the spinning icons on both refresh buttons.
  const [refreshing, setRefreshing] = useState(false);
  const refreshPrices = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api.refreshCartPrices();
      setItems(data.items);
      if (data.checked === 0 && data.errors.length > 0) {
        showToast("Couldn't refresh prices — every store check failed", "error");
        return;
      }
      const parts = [];
      if (data.changed > 0) parts.push(`${data.changed} price${data.changed === 1 ? "" : "s"} changed`);
      if (data.missing > 0) parts.push(`${data.missing} no longer in stock`);
      if (data.errors.length > 0) parts.push(`${data.errors.length} store check${data.errors.length === 1 ? "" : "s"} failed`);
      showToast(
        `Prices refreshed — ${parts.join(", ") || "no changes"}`,
        data.errors.length > 0 ? "error" : "success"
      );
    } catch (e) {
      showToast(e.message || "Couldn't refresh prices", "error");
    } finally {
      setRefreshing(false);
    }
  }, [showToast]);

  const value = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    return { items, count, addToCart, removeItem, clearStore, clearAll, refreshPrices, refreshing };
  }, [items, addToCart, removeItem, clearStore, clearAll, refreshPrices, refreshing]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
