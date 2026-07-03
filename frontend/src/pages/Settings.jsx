import { useState, useEffect, useRef } from "react";
import { Loader2, Wifi, Github } from "lucide-react";
import { api } from "../api";

const GITHUB_URL = "https://github.com/incredibad/cardsniffer";

export default function Settings() {
  const [tab, setTab] = useState("General");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-header text-3xl">Settings</h1>

      <div className="flex gap-1 border-b border-gold-700/40">
        {["General", "System"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-gold-500 text-gold-300"
                : "border-transparent text-stone-500 hover:text-stone-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "General" && <GeneralTab />}
      {tab === "System" && <SystemTab />}
    </div>
  );
}

// ── General tab ──────────────────────────────────────────────────────────

function GeneralTab() {
  const [settings, setSettings] = useState(null);
  const [proxyUrl, setProxyUrl] = useState("");
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
    } finally {
      setLoading(false);
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
    return <Loader2 className="animate-spin text-gold-500" size={24} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="card-frame p-4">
        <h2 className="section-header mb-3">Stores</h2>
        <div className="flex flex-col gap-2">
          {settings.stores.map((s) => (
            <label key={s.key} className="flex items-center justify-between py-1.5 text-sm">
              <span>{s.store_name}</span>
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={(e) => toggleStore(s.key, e.target.checked)}
                className="accent-gold-500 w-4 h-4"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="card-frame p-4">
        <h2 className="section-header mb-3">VPN Proxy</h2>
        <p className="text-xs text-stone-500 mb-3">
          Optional HTTP proxy for scraper requests, e.g. an existing gluetun sidecar
          exposed at <code className="text-gold-400">http://host.docker.internal:8888</code>.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={proxyUrl}
            onChange={(e) => setProxyUrl(e.target.value)}
            placeholder="http://host.docker.internal:8888"
            className="flex-1 px-3 py-2 rounded-lg bg-ink-950 border border-gold-700/40 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-gold-500"
          />
          <button
            onClick={saveProxyUrl}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-ink-950 text-sm font-semibold"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        {saveMsg && <p className="text-xs text-emerald-400 mt-2">{saveMsg}</p>}

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={testProxy}
            disabled={testing || !proxyUrl}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gold-600/60 hover:border-gold-400 disabled:opacity-50 text-sm text-gold-300"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
            Test Proxy
          </button>
          {testResult && (
            <span className="text-xs text-emerald-400">
              {testResult.ip} · {testResult.city || "?"}, {testResult.country || "?"} ({testResult.org || "unknown"})
            </span>
          )}
          {testError && <span className="text-xs text-red-400">{testError}</span>}
        </div>
      </section>
    </div>
  );
}

// ── System tab ────────────────────────────────────────────────────────────

function SystemTab() {
  return (
    <div className="flex flex-col gap-6">
      <section className="card-frame p-4">
        <h2 className="section-header mb-3">About</h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-300">Cardsniffer v{__APP_VERSION__}</span>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-gold-400 hover:text-gold-300"
          >
            <Github size={16} /> GitHub
          </a>
        </div>
      </section>

      <section className="card-frame p-4">
        <h2 className="section-header mb-3">Logs</h2>
        <LogViewer />
      </section>
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

    const source = new EventSource("/api/logs/stream");
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
      className="bg-ink-950 rounded-lg border border-gold-700/30 p-3 h-64 overflow-y-auto font-mono text-xs text-stone-400 whitespace-pre-wrap"
    >
      {lines.length === 0 ? (
        <span className="text-stone-600">No log lines yet.</span>
      ) : (
        lines.map((line, i) => <div key={i}>{line}</div>)
      )}
    </div>
  );
}
