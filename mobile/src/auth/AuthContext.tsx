import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";
import { storage } from "../storage";
import * as Notifications from "expo-notifications";
import type { ApiUser } from "../types";

const TOKEN_KEY = "thesocialbook_token";

interface AuthContextValue {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (name: string, phone: string, password: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: ApiUser | null) => void;
  sendOtp: (target: string) => Promise<string | undefined>;
  verifyOtp: (target: string, code: string) => Promise<boolean>;
  emailSendOtp: (email: string) => Promise<string | undefined>;
  emailLogin: (email: string, otp: string) => Promise<void>;
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
          await registerPushToken(stored);
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
    await registerPushToken(newToken);
  };

  const registerPushToken = async (authToken: string) => {
    try {
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

  const login = async (phone: string, password: string) => {
    const res = await api.login({ phone, password });
    await persist(res.token, res.user);
  };

  const register = async (name: string, phone: string, password: string, otp: string) => {
    const res = await api.register({ name, phone, password, otp });
    await persist(res.token, res.user);
  };

  const logout = async () => {
    await storage.deleteItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const sendOtp = async (target: string): Promise<string | undefined> => {
    const res = await api.sendOtp(target);
    return res.devCode ?? undefined;
  };

  const verifyOtp = async (target: string, code: string) => {
    const res = await api.verifyOtp(target, code);
    return res.ok;
  };

  const emailSendOtp = async (email: string): Promise<string | undefined> => {
    const res = await api.emailSendOtp(email);
    return res.devCode ?? undefined;
  };

  const emailLogin = async (email: string, otp: string) => {
    const res = await api.emailLogin(email, otp);
    await persist(res.token, res.user);
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
        sendOtp,
        verifyOtp,
        emailSendOtp,
        emailLogin,
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