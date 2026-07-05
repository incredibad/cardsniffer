import { useState, useEffect, useRef } from "react";
import { Loader2, Wifi, Github, Sun, Moon, Trash2, ShieldCheck, Shield, LogOut } from "lucide-react";
import { api } from "../api";
import { getTheme, setTheme } from "../theme";
import { useAuth } from "../AuthContext";

const GITHUB_URL = "https://github.com/incredibad/cardsniffer";

export default function Settings() {
  const [tab, setTab] = useState("General");
  const { user } = useAuth();
  const isAdmin = user?.is_admin ?? false;
  const tabs = [
    "General",
    ...(user ? ["Account"] : []),
    ...(isAdmin ? ["System", "Admin", "Users"] : []),
  ];

  useEffect(() => {
    if (!tabs.includes(tab)) setTab("General");
  }, [tab, tabs]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-header text-3xl">Settings</h1>

      <div className="flex gap-1 border-b border-slate-200 dark:border-zinc-800">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-zinc-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "General" && <GeneralTab user={user} />}
      {tab === "Account" && user && <AccountTab />}
      {tab === "System" && isAdmin && <SystemTab isAdmin={isAdmin} />}
      {tab === "Admin" && isAdmin && <AdminTab />}
      {tab === "Users" && isAdmin && <UserManagement currentUsername={user.username} />}
    </div>
  );
}

// ── General tab ──────────────────────────────────────────────────────────

function AppearanceSection() {
  const [theme, setThemeState] = useState(() => getTheme());

  function choose(next) {
    setTheme(next);
    setThemeState(next);
  }

  return (
    <section className="card-frame p-4">
      <h2 className="section-header mb-3">Appearance</h2>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-700 dark:text-zinc-300">Theme</span>
        <div className="inline-flex rounded-full border border-slate-200 dark:border-zinc-800 overflow-hidden">
          <button
            onClick={() => choose("light")}
            aria-pressed={theme === "light"}
            className={`segmented-btn px-3 py-1.5 flex items-center gap-1.5 text-sm ${
              theme === "light" ? "is-active" : ""
            }`}
          >
            <Sun size={14} /> Light
          </button>
          <button
            onClick={() => choose("dark")}
            aria-pressed={theme === "dark"}
            className={`segmented-btn px-3 py-1.5 flex items-center gap-1.5 text-sm border-l border-slate-200 dark:border-zinc-800 ${
              theme === "dark" ? "is-active" : ""
            }`}
          >
            <Moon size={14} /> Dark
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2">
        Stored in this browser only — other devices keep their own setting.
      </p>
    </section>
  );
}

function GeneralTab({ user }) {
  return (
    <div className="flex flex-col gap-6">
      <AppearanceSection />
      {user && <UserStoresSection />}
    </div>
  );
}

function UserStoresSection() {
  const [stores, setStores] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setStores(await api.getMyStores());
    } catch (err) {
      setError(err.message || "Failed to load stores");
    }
  }

  async function toggle(key, enabled) {
    setError("");
    try {
      setStores(await api.updateMyStores({ [key]: enabled }));
    } catch (err) {
      setError(err.message || "Failed to update store");
    }
  }

  return (
    <section className="card-frame p-4">
      <h2 className="section-header mb-3">Stores</h2>
      <p className="text-xs text-slate-500 dark:text-zinc-500 mb-3">
        Enable or disable which stores your own searches check. This only affects your account —
        it doesn't change what other users see.
      </p>
      {error && <p className="text-xs text-red-500 dark:text-red-400 mb-2">{error}</p>}
      {stores === null ? (
        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={20} />
      ) : (
        <div className="flex flex-col gap-2">
          {stores.map((s) => (
            <label
              key={s.key}
              className={`flex items-center justify-between py-1.5 text-sm ${
                s.globally_enabled
                  ? "text-slate-700 dark:text-zinc-300"
                  : "text-slate-400 dark:text-zinc-600"
              }`}
            >
              <span>
                {s.store_name}
                {!s.globally_enabled && <span className="ml-1.5 text-xs">(disabled system-wide)</span>}
              </span>
              <input
                type="checkbox"
                checked={s.enabled}
                disabled={!s.globally_enabled}
                onChange={(e) => toggle(s.key, e.target.checked)}
                className="accent-indigo-600 w-4 h-4 disabled:opacity-40"
              />
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Account tab ──────────────────────────────────────────────────────────

function AccountTab() {
  return (
    <div className="flex flex-col gap-6">
      <ChangePasswordSection />
      <SearchHistorySection />
      <SignOutSection />
    </div>
  );
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }
    setSaving(true);
    try {
      await api.changeMyPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setError(err.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card-frame p-4">
      <h2 className="section-header mb-3">Change Password</h2>
      <form onSubmit={submit} className="flex flex-col gap-2 max-w-sm">
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          required
          className="input-field px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (min. 8 characters)"
          autoComplete="new-password"
          minLength={8}
          required
          className="input-field px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          autoComplete="new-password"
          minLength={8}
          required
          className="input-field px-3 py-2 text-sm"
        />
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        {message && <p className="text-xs text-emerald-600 dark:text-emerald-400">{message}</p>}
        <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm self-start">
          {saving ? "Saving…" : "Update Password"}
        </button>
      </form>
    </section>
  );
}

function SearchHistorySection() {
  const [searches, setSearches] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getMySearches()
      .then(setSearches)
      .catch((err) => setError(err.message || "Failed to load search history"));
  }, []);

  return (
    <section className="card-frame p-4">
      <h2 className="section-header mb-3">Recent Searches</h2>
      <p className="text-xs text-slate-500 dark:text-zinc-500 mb-3">Your last 20 searches.</p>
      {error && <p className="text-xs text-red-500 dark:text-red-400 mb-2">{error}</p>}
      {searches === null ? (
        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={20} />
      ) : searches.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-zinc-500">No searches yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {searches.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-zinc-800/60 last:border-0 text-sm"
            >
              <span className="text-slate-700 dark:text-zinc-300 truncate">{s.query}</span>
              <span className="text-xs text-slate-400 dark:text-zinc-500 shrink-0">
                {s.result_count} result{s.result_count === 1 ? "" : "s"} ·{" "}
                {new Date(s.searched_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SignOutSection() {
  const { refresh } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function signOut() {
    setLoggingOut(true);
    try {
      await api.authLogout();
      await refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <section className="card-frame p-4">
      <h2 className="section-header mb-3">Session</h2>
      <button
        onClick={signOut}
        disabled={loggingOut}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-300 hover:border-red-500 disabled:opacity-50 text-sm text-red-600 dark:border-red-500/60 dark:hover:border-red-400 dark:text-red-400"
      >
        {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
        Sign Out
      </button>
    </section>
  );
}

// ── Admin tab ────────────────────────────────────────────────────────────

function AdminTab() {
  const [settings, setSettings] = useState(null);
  const [proxyUrl, setProxyUrl] = useState("");
  const [ebayAppId, setEbayAppId] = useState("");
  const [ebayCertId, setEbayCertId] = useState("");
  const [savingEbay, setSavingEbay] = useState(false);
  const [ebaySaveMsg, setEbaySaveMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
      setProxyUrl(data.vpn_proxy_url || "");
      setEbayAppId(data.ebay_app_id || "");
    } finally {
      setLoading(false);
    }
  }

  async function saveEbayCredentials() {
    setSavingEbay(true);
    setEbaySaveMsg("");
    try {
      const payload = { ebay_app_id: ebayAppId };
      if (ebayCertId) payload.ebay_cert_id = ebayCertId;
      const updated = await api.updateSettings(payload);
      setSettings(updated);
      setEbayCertId("");
      setEbaySaveMsg("Saved");
      setTimeout(() => setEbaySaveMsg(""), 2000);
    } finally {
      setSavingEbay(false);
    }
  }

  async function toggleStore(key, enabled) {
    const updated = await api.updateSettings({ stores: { [key]: enabled } });
    setSettings(updated);
  }

  async function saveProxyUrl() {
    setSaving(true);
    setSaveMsg("");
    try {
      const updated = await api.updateSettings({ vpn_proxy_url: proxyUrl });
      setSettings(updated);
      setSaveMsg("Saved");
      setTimeout(() => setSaveMsg(""), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function testProxy() {
    setTesting(true);
    setTestResult(null);
    setTestError("");
    try {
      const result = await api.testProxy();
      setTestResult(result);
    } catch (err) {
      setTestError(err.message || "Proxy test failed");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={24} />;
  }

  return (
    <>
      <section className="card-frame p-4">
        <h2 className="section-header mb-3">Global System Stores</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-500 mb-3">
          Enables or disables a store for the entire system — when disabled here, no user can
          search it, regardless of their own per-account preference in Settings → General.
        </p>
        <div className="flex flex-col gap-2">
          {settings.stores.map((s) => (
            <label
              key={s.key}
              className="flex items-center justify-between py-1.5 text-sm text-slate-700 dark:text-zinc-300"
            >
              <span>{s.store_name}</span>
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={(e) => toggleStore(s.key, e.target.checked)}
                className="accent-indigo-600 w-4 h-4"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="card-frame p-4">
        <h2 className="section-header mb-3">VPN Proxy</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-500 mb-3">
          Optional HTTP proxy for scraper requests, e.g. an existing gluetun sidecar
          exposed at{" "}
          <code className="text-indigo-600 dark:text-indigo-400">
            http://host.docker.internal:8888
          </code>
          .
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={proxyUrl}
            onChange={(e) => setProxyUrl(e.target.value)}
            placeholder="http://host.docker.internal:8888"
            className="input-field flex-1 px-3 py-2 text-sm"
          />
          <button onClick={saveProxyUrl} disabled={saving} className="btn-primary px-4 py-2 text-sm">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        {saveMsg && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">{saveMsg}</p>}

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={testProxy}
            disabled={testing || !proxyUrl}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-300 hover:border-indigo-500 disabled:opacity-50 text-sm text-indigo-600 dark:border-indigo-500/60 dark:hover:border-indigo-400 dark:text-indigo-300"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
            Test Proxy
          </button>
          {testResult && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              {testResult.ip} · {testResult.city || "?"}, {testResult.country || "?"} ({testResult.org || "unknown"})
            </span>
          )}
          {testError && <span className="text-xs text-red-500 dark:text-red-400">{testError}</span>}
        </div>
      </section>

      <section className="card-frame p-4">
        <h2 className="section-header mb-3">eBay API</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-500 mb-3">
          Production keyset credentials from the eBay Developer Program, used for the Browse API.
        </p>
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-slate-700 dark:text-zinc-300">API calls (last 24h)</span>
          <span className="font-medium text-slate-900 dark:text-zinc-100">{settings.ebay_api_calls_24h}</span>
        </div>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={ebayAppId}
            onChange={(e) => setEbayAppId(e.target.value)}
            placeholder="App ID / Client ID"
            className="input-field px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={ebayCertId}
            onChange={(e) => setEbayCertId(e.target.value)}
            placeholder={
              settings.ebay_cert_id_configured ? "Cert ID (Client Secret) — set, leave blank to keep" : "Cert ID (Client Secret)"
            }
            autoComplete="off"
            className="input-field px-3 py-2 text-sm"
          />
          <button
            onClick={saveEbayCredentials}
            disabled={savingEbay}
            className="btn-primary px-4 py-2 text-sm self-start"
          >
            {savingEbay ? "Saving…" : "Save"}
          </button>
        </div>
        {ebaySaveMsg && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">{ebaySaveMsg}</p>}
      </section>
    </>
  );
}

// ── System tab ────────────────────────────────────────────────────────────

function SystemTab({ isAdmin }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="card-frame p-4">
        <h2 className="section-header mb-3">About</h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700 dark:text-zinc-300">Cardsniffer v{__APP_VERSION__}</span>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <Github size={16} /> GitHub
          </a>
        </div>
      </section>

      {isAdmin && (
        <section className="card-frame p-4">
          <h2 className="section-header mb-3">Logs</h2>
          <LogViewer />
        </section>
      )}
    </div>
  );
}

function LogViewer() {
  const [lines, setLines] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    api.getLogHistory().then((data) => {
      if (!cancelled) setLines(data.lines);
    });

    const source = new EventSource("/api/logs/stream", { withCredentials: true });
    source.onmessage = (event) => {
      const line = JSON.parse(event.data);
      setLines((prev) => [...prev.slice(-499), line]);
    };

    return () => {
      cancelled = true;
      source.close();
    };
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div
      ref={containerRef}
      className="bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 p-3 h-64 overflow-y-auto font-mono text-xs text-slate-600 dark:text-zinc-400 whitespace-pre-wrap"
    >
      {lines.length === 0 ? (
        <span className="text-slate-400 dark:text-zinc-600">No log lines yet.</span>
      ) : (
        lines.map((line, i) => <div key={i}>{line}</div>)
      )}
    </div>
  );
}

// ── Users tab (admin only) ──────────────────────────────────────────────────

function UserManagement({ currentUsername }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setUsers(await api.listUsers());
    } catch (err) {
      setError(err.message || "Failed to load users");
    }
  }

  async function createUser(e) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await api.createUser({ username: newUsername, password: newPassword, is_admin: newIsAdmin });
      setNewUsername("");
      setNewPassword("");
      setNewIsAdmin(false);
      await load();
    } catch (err) {
      setError(err.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  async function toggleAdmin(u) {
    setError("");
    try {
      await api.updateUser(u.id, { is_admin: !u.is_admin });
      await load();
    } catch (err) {
      setError(err.message || "Failed to update user");
    }
  }

  async function removeUser(u) {
    if (!confirm(`Delete user "${u.username}"? This can't be undone.`)) return;
    setError("");
    try {
      await api.deleteUser(u.id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete user");
    }
  }

  return (
    <section className="card-frame p-4">
      <h2 className="section-header mb-3">Users</h2>

      {error && <p className="text-xs text-red-500 dark:text-red-400 mb-3">{error}</p>}

      {users === null ? (
        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={20} />
      ) : (
        <div className="flex flex-col gap-1.5 mb-4">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-2 py-2 border-b border-slate-100 dark:border-zinc-800/60 last:border-0 text-sm"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-900 dark:text-zinc-50 truncate">{u.username}</span>
                  {u.is_admin && (
                    <span className="chip bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-500">
                  Last seen: {u.last_seen_at ? new Date(u.last_seen_at).toLocaleString() : "Never"}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleAdmin(u)}
                  title={u.is_admin ? "Remove admin access" : "Grant admin access"}
                  className="p-1.5 rounded-full text-slate-400 hover:text-indigo-600 dark:text-zinc-500 dark:hover:text-indigo-400 transition-colors"
                >
                  {u.is_admin ? <ShieldCheck size={16} /> : <Shield size={16} />}
                </button>
                <button
                  onClick={() => removeUser(u)}
                  disabled={u.username === currentUsername}
                  title={u.username === currentUsername ? "Can't delete your own account" : "Delete user"}
                  className="p-1.5 rounded-full text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={createUser} className="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="New username"
            autoComplete="off"
            required
            className="input-field flex-1 px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Password (min. 8 characters)"
            autoComplete="new-password"
            minLength={8}
            required
            className="input-field flex-1 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={newIsAdmin}
              onChange={(e) => setNewIsAdmin(e.target.checked)}
              className="accent-indigo-600 w-4 h-4"
            />
            Grant admin access
          </label>
          <button type="submit" disabled={creating} className="btn-primary px-4 py-2 text-sm">
            {creating ? <Loader2 size={14} className="animate-spin" /> : "Add User"}
          </button>
        </div>
      </form>
    </section>
  );
}
