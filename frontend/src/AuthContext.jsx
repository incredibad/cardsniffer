import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, setupRequired: false, user: null, timezone: "UTC" });

  async function refresh() {
    try {
      const data = await api.authStatus();
      setState({
        loading: false,
        setupRequired: data.setup_required,
        user: data.user,
        timezone: data.timezone || "UTC",
      });
    } catch {
      setState({ loading: false, setupRequired: false, user: null, timezone: "UTC" });
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return <AuthContext.Provider value={{ ...state, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
