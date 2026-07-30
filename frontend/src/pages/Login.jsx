import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function Login() {
  const { setupRequired, refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      await refresh();
    } catch (err) {
      setError(err.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="card-frame w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <img src="/favicon.png" alt="" className="h-8 w-8 rounded-lg" />
          <span className="logo-wordmark text-xl">Cardsniffer</span>
        </div>
        <h1 className="section-header mb-4 text-center">
          {setupRequired ? "Create Admin Account" : "Log In"}
        </h1>
        <form onSubmit={submit} className="flex flex-col gap-3">
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
          <button type="submit" disabled={submitting} className="btn-primary px-3 py-2 text-sm mt-1">
            {submitting ? (
              <Loader2 size={14} className="animate-spin mx-auto" />
            ) : setupRequired ? (
              "Create Account"
            ) : (
              "Log In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
