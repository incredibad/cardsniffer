import { useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import HeaderMenu from "./components/HeaderMenu";
import CartDrawer from "./components/CartDrawer";
import BackToTopButton from "./components/BackToTopButton";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";

export default function App() {
  const { loading, user } = useAuth();
  const { count: cartCount } = useCart();
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  if (loading) return null;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Login />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="relative z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="logo-wordmark text-xl flex items-center gap-2">
            <img src="/favicon.png" alt="" className="h-8 w-8 rounded-lg" />
            Cardsniffer
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="relative block text-slate-400 hover:text-indigo-600 transition-colors dark:text-zinc-500 dark:hover:text-indigo-400"
              aria-label="Cart"
            >
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold flex items-center justify-center leading-none dark:bg-indigo-500">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>
            <HeaderMenu />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      <CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
      <BackToTopButton />
    </div>
  );
}
