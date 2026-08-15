import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";
import { storage } from "../storage";
import type { ApiUser } from "../types";

const TOKEN_KEY = "thesocialbook_token";

interface AuthContextValue {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (name: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: ApiUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await storage.getItem(TOKEN_KEY);
        if (stored) {
          const { user: me } = await api.me(stored);
          setToken(stored);
          setUser(me);
        }
      } catch {
        await storage.deleteItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = async (newToken: string, newUser: ApiUser) => {
    await storage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const login = async (phone: string, password: string) => {
    const res = await api.login({ phone, password });
    await persist(res.token, res.user);
  };

  const register = async (name: string, phone: string, password: string) => {
    const res = await api.register({ name, phone, password });
    await persist(res.token, res.user);
  };

  const logout = async () => {
    await storage.deleteItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}