import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function AuthMenu() {
  const { loading, setupRequired, user, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  if (loading) return null;

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (setupRequired && password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      if (setupRequired) {
        await api.authSetup(username, password);
      } else {
        await api.authLogin(username, password);
      }
      setUsername("");
      setPassword("");
      setConfirm("");
      setOpen(false);
      await refresh();
    } catch (err) {
      setError(err.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    await api.authLogout();
    await refresh();
  }

  if (user) {
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

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors"
      >
        <LogIn size={16} />
        {setupRequired ? "Set Up Admin" : "Login"}
      </button>
      {open && (
        <div className="card-frame absolute top-full right-0 mt-2 z-30 w-64 p-4">
          <h3 className="section-header mb-3">{setupRequired ? "Create Admin Account" : "Log In"}</h3>
          <form onSubmit={submit} className="flex flex-col gap-2.5">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              autoFocus
              required
              className="input-field px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={setupRequired ? "Password (min. 8 characters)" : "Password"}
              autoComplete={setupRequired ? "new-password" : "current-password"}
              minLength={setupRequired ? 8 : undefined}
              required
              className="input-field px-3 py-2 text-sm"
            />
            {setupRequired && (
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                minLength={8}
                required
                className="input-field px-3 py-2 text-sm"
              />
            )}
            {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary px-3 py-2 text-sm">
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : setupRequired ? (
                "Create Account"
              ) : (
                "Log In"
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
