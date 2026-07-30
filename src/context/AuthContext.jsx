import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "../api/auth.api.js";
import { getToken, setToken } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const login = useCallback(async (email, password) => {
    const result = await authApi.login(email, password);
    setToken(result.token);
    setUser(result.user);
    // The login response's `user` is a lighter shape than /auth/me.
    // Refresh in the background so profile fields are complete too.
    hydrate();
    return result.user;
  }, [hydrate]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // even if the server call fails, clear the local session
    }
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh: hydrate }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
