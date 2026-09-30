import type { Role } from "@elabs/shared/types/auth";
import { hasPermission, type Permission } from "@elabs/shared/validators/rbac";

export { type Permission };

export function can(role: Role, permission: Permission): boolean {
  return hasPermission(role, permission);
}