"use client";

import { useMemo } from "react";
import { connectSocket } from "@/lib/socket";

export function useSocket() {
  return useMemo(() => connectSocket(), []);
}