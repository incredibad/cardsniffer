const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

function postJSON(path, payload) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
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

  authStatus: () => request("/auth/status"),
  authSetup: (username, password) => postJSON("/auth/setup", { username, password }),
  authLogin: (username, password) => postJSON("/auth/login", { username, password }),
  authLogout: () => request("/auth/logout", { method: "POST" }),

  listUsers: () => request("/users"),
  createUser: (payload) => postJSON("/users", payload),
  updateUser: (id, payload) =>
    request(`/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),
};
