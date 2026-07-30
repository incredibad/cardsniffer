import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, LogOut, Settings as SettingsIcon, User } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../AuthContext";

// Hamburger for everything account/app-level in the header — username,
// Settings, logout — so the header itself stays just logo + cart + menu as
// more entries accumulate over time.
export default function HeaderMenu() {
  const { user, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  if (!user) return null;

  async function logout() {
    await api.authLogout();
    await refresh();
  }

  const itemClass =
    "flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-lg text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors";

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="block text-slate-400 hover:text-indigo-600 transition-colors dark:text-zinc-500 dark:hover:text-indigo-400"
      >
        <Menu size={22} />
      </button>
      {open && (
        <div className="card-frame absolute right-0 top-full mt-2 z-50 min-w-[11rem] py-1.5 px-1">
          <div className="flex items-center gap-2 px-2 pt-1 pb-2 mb-1 text-xs text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800">
            <User size={13} /> {user.username}
          </div>
          <Link to="/settings" onClick={() => setOpen(false)} className={itemClass}>
            <SettingsIcon size={15} /> Settings
          </Link>
          <button onClick={logout} className={itemClass}>
            <LogOut size={15} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
