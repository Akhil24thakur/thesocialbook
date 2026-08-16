import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { api } from "../api";
import { storage } from "../storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type { ApiUser } from "../types";

const TOKEN_KEY = "thesocialbook_token";
const USER_KEY = "thesocialbook_user";

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

interface AuthContextValue {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string, isPhone?: boolean) => Promise<void>;
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
        if (!stored) {
          setLoading(false);
          return;
        }
        const cached = await storage.getItem(USER_KEY);
        if (cached) {
          try {
            const cachedUser = JSON.parse(cached) as ApiUser;
            setToken(stored);
            setUser(cachedUser);
            setLoading(false);
          } catch {
            setLoading(false);
          }
        }
        try {
          const { user: me } = await api.me(stored);
          setToken(stored);
          setUser(me);
          await storage.setItem(USER_KEY, JSON.stringify(me));
          await registerPushToken(stored);
        } catch (e: any) {
          if (e?.status === 401) {
            await storage.deleteItem(TOKEN_KEY);
            await storage.deleteItem(USER_KEY);
            setToken(null);
            setUser(null);
          }
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
  }, []);

  const persist = async (newToken: string, newUser: ApiUser) => {
    await storage.setItem(TOKEN_KEY, newToken);
    await storage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    await registerPushToken(newToken);
  };

  const registerPushToken = async (authToken: string) => {
    if (isExpoGo || Platform.OS === "web") return;
    try {
      const Notifications = require("expo-notifications") as typeof import("expo-notifications");
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== "granted") return;
      }
      const deviceToken = (await Notifications.getExpoPushTokenAsync()).data;
      await api.registerDeviceToken(authToken, deviceToken);
    } catch {
      // Silent fail - push notifications are best effort
    }
  };

  const login = async (identifier: string, password: string, isPhone = true) => {
    const res = await api.login(
      isPhone ? { phone: identifier, password } : { username: identifier, password }
    );
    await persist(res.token, res.user);
  };

  const register = async (name: string, phone: string, password: string) => {
    const res = await api.register({ name, phone, password });
    await persist(res.token, res.user);
  };

  const logout = async () => {
    await storage.deleteItem(TOKEN_KEY);
    await storage.deleteItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}