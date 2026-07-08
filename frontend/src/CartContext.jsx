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

  const value = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    return { items, count, addToCart, removeItem, clearStore, clearAll };
  }, [items, addToCart, removeItem, clearStore, clearAll]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
