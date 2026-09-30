"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => setToken(getToken()), []);
  return { token, isAuthenticated: Boolean(token) };
}