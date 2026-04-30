export type Role = "admin" | "faculty" | "technician" | "student";

export type Permission =
  | "users:read"
  | "users:write"
  | "labs:read"
  | "labs:write"
  | "inventory:read"
  | "inventory:write"
  | "attendance:scan"
  | "courses:read"
  | "courses:write"
  | "grading:write"
  | "audit:read";

export const PERMISSIONS_BY_ROLE: Record<Role, Permission[]> = {
  admin: ["users:read","users:write","labs:read","labs:write","inventory:read","inventory:write","attendance:scan","courses:read","courses:write","grading:write","audit:read"],
  faculty: ["labs:read","inventory:read","courses:read","courses:write","grading:write"],
  technician: ["labs:read","inventory:read","inventory:write","attendance:scan"],
  student: ["labs:read","courses:read"]
};
