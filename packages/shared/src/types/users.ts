import type { Role } from "./auth";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}