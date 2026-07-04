import { Routes, Route, Link } from "react-router-dom";
import { Settings as SettingsIcon } from "lucide-react";
import Search from "./pages/Search";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gold-700/40 bg-ink-900/80 backdrop-blur">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="logo-wordmark text-xl flex items-center gap-2">
            <img src="/logo-mark.png" alt="" className="h-7 w-7" />
            Cardsniffer
          </Link>
          <Link
            to="/settings"
            className="text-stone-400 hover:text-gold-400 transition-colors"
            aria-label="Settings"
          >
            <SettingsIcon size={22} />
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
