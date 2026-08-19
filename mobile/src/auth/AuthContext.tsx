import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { api } from "../api";
import { storage } from "../storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { setPushStatus } from "../pushStatus";
import { reportCrash } from "../crashLog";
import type { ApiUser } from "../types";

const TOKEN_KEY = "thesocialbook_token";
const USER_KEY = "thesocialbook_user";

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

interface AuthContextValue {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string, mode?: "phone" | "username" | "email") => Promise<void>;
  register: (name: string, password: string, contact: { phone?: string; email?: string }) => Promise<void>;
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
    if (isExpoGo || Platform.OS === "web") {
      setPushStatus("skipped (Expo Go / web)");
      return;
    }
    try {
      const Notifications = require("expo-notifications") as typeof import("expo-notifications");
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Notifications",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
        });
      }
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== "granted") {
          setPushStatus("permission denied");
          return;
        }
      }
      if (Platform.OS === "android") {
        const { data: deviceToken } = await Notifications.getDevicePushTokenAsync();
        await api.registerDeviceToken(authToken, deviceToken, "fcm");
        setPushStatus("registered fcm");
      } else {
        const { data: expoToken } = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        await api.registerDeviceToken(authToken, expoToken, "expo");
        setPushStatus("registered expo");
      }
    } catch (e: any) {
      const message = String(e?.message ?? e ?? "unknown error");
      setPushStatus(`failed: ${message.slice(0, 160)}`);
      reportCrash("push token registration failed", `${message}\n${String(e?.stack ?? "")}`);
    }
  };

  const login = async (
    identifier: string,
    password: string,
    mode: "phone" | "username" | "email" = "phone"
  ) => {
    const res = await api.login(
      mode === "phone"
        ? { phone: identifier, password }
        : mode === "email"
        ? { email: identifier, password }
        : { username: identifier, password }
    );
    await persist(res.token, res.user);
  };

  const register = async (
    name: string,
    password: string,
    contact: { phone?: string; email?: string }
  ) => {
    const res = await api.register({ name, password, ...contact });
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