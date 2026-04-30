"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, setAccessToken } from "@/lib/api";

type Me = { id: number; email: string; fullName: string; roles: string[] };

type AuthCtx = {
  me: Me | null;
  loading: boolean;
  hasRole: (role: string) => boolean;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  async function bootstrap() {
    setLoading(true);

    // First: attempt refresh to get access token from cookie
    const r = await apiFetch("/auth/refresh", { method: "POST" });
    if (r.ok) {
      const data = await r.json();
      setAccessToken(data.accessToken);
    }

    // Then: call /me (if refresh failed, /me will likely fail)
    const m = await apiFetch("/auth/me");
    if (m.ok) {
      const user = await m.json();
      setMe(user);
    } else {
      setMe(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshMe() {
    const m = await apiFetch("/auth/me");
    if (m.ok) setMe(await m.json());
  }

  function hasRole(role: string) {
    return !!me?.roles?.includes(role);
  }

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" });
    setAccessToken(null);
    setMe(null);
    window.location.href = "/login";
  }

  const value = useMemo<AuthCtx>(
    () => ({ me, loading, hasRole, refreshMe, logout }),
    [me, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
