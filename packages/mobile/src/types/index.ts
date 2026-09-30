import type { Role } from "@elabs/shared/types/auth";

export type MobileUser = {
  id: string;
  fullName: string;
  role: Role;
};