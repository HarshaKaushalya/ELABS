import type { Role } from "../types/auth";

export type Permission =
  | "users:read"
  | "users:write"
  | "labs:read"
  | "labs:write"
  | "inventory:read"
  | "inventory:write"
  | "courses:read"
  | "courses:write"
  | "attendance:scan"
  | "grading:write"
  | "audit:read"
  | "chat:use";

const matrix: Record<Role, Permission[]> = {
  admin: [
    "users:read",
    "users:write",
    "labs:read",
    "labs:write",
    "inventory:read",
    "inventory:write",
    "courses:read",
    "courses:write",
    "attendance:scan",
    "grading:write",
    "audit:read",
    "chat:use"
  ],
  faculty: ["labs:read", "inventory:read", "courses:read", "courses:write", "grading:write", "chat:use"],
  technician: ["labs:read", "inventory:read", "inventory:write", "attendance:scan", "chat:use"],
  student: ["labs:read", "courses:read", "chat:use"]
};

export function permissionsForRole(role: Role): Permission[] {
  return matrix[role] ?? [];
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}