import { Routes, Route, Link } from "react-router-dom";
import { Settings as SettingsIcon } from "lucide-react";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import AuthMenu from "./components/AuthMenu";
import BackToTopButton from "./components/BackToTopButton";
import { useAuth } from "./AuthContext";

export default function App() {
  const { loading, user } = useAuth();

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
            <AuthMenu />
            <Link
              to="/settings"
              className="text-slate-400 hover:text-indigo-600 transition-colors dark:text-zinc-500 dark:hover:text-indigo-400"
              aria-label="Settings"
            >
              <SettingsIcon size={22} />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      <BackToTopButton />
    </div>
  );
}
