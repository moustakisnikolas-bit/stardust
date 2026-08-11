"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PublicUser } from "@stardust/shared-types";
import { apiRequest } from "./apiClient";

const STORAGE_KEY = "stardust.auth";

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: PublicUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  /** Hydrates the session from tokens obtained outside the normal login/signup flow (OAuth redirect callback). */
  completeOAuth: (tokens: StoredAuth) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function persist(tokens: StoredAuth) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    setAccessToken(tokens.accessToken);
  }

  async function loadMe(token: string) {
    const { user: me } = await apiRequest<{ user: PublicUser }>("/api/auth/me", { accessToken: token });
    setUser(me);
  }

  useEffect(() => {
    const stored = readStoredAuth();
    if (!stored) {
      setLoading(false);
      return;
    }
    setAccessToken(stored.accessToken);
    loadMe(stored.accessToken)
      .catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { user: me, tokens } = await apiRequest<{ user: PublicUser; tokens: StoredAuth }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    persist(tokens);
    setUser(me);
  }

  async function signup(email: string, password: string) {
    const { user: me, tokens } = await apiRequest<{ user: PublicUser; tokens: StoredAuth }>("/api/auth/signup", {
      method: "POST",
      body: { email, password },
    });
    persist(tokens);
    setUser(me);
  }

  function logout() {
    window.localStorage.removeItem(STORAGE_KEY);
    setAccessToken(null);
    setUser(null);
  }

  async function refreshUser() {
    if (!accessToken) return;
    await loadMe(accessToken);
  }

  async function completeOAuth(tokens: StoredAuth) {
    persist(tokens);
    await loadMe(tokens.accessToken);
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, signup, logout, refreshUser, completeOAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
