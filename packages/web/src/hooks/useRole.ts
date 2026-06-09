"use client";

import { useState, useEffect } from "react";
import { getUser } from "@/lib/auth";

export function useRole(): string[] {
  const [roles, setRoles] = useState<string[]>([]);
  useEffect(() => {
    const user = getUser();
    setRoles(user?.roles ?? []);
  }, []);
  return roles;
}

export function useIsStudent(): boolean {
  const roles = useRole();
  return roles.includes("STUDENT") && !roles.includes("TECHNICIAN") && !roles.includes("SYSTEM_ADMIN") && !roles.includes("LECTURER");
}

export function useIsStaff(): boolean {
  const roles = useRole();
  return roles.includes("TECHNICIAN") || roles.includes("SYSTEM_ADMIN") || roles.includes("LECTURER");
}