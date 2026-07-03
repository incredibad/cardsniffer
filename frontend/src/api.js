const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),
  getSettings: () => request("/settings"),
  updateSettings: (payload) =>
    request("/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  testProxy: () => request("/settings/test-proxy", { method: "POST" }),
  getLogHistory: () => request("/logs/history"),
};
