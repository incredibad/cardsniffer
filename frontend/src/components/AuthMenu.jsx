import { LogOut } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function AuthMenu() {
  const { user, refresh } = useAuth();

  if (!user) return null;

  async function logout() {
    await api.authLogout();
    await refresh();
  }

  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
      <span className="hidden sm:inline">{user.username}</span>
      <button
        onClick={logout}
        aria-label="Log out"
        title="Log out"
        className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}
