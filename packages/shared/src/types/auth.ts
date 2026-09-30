export type Role = "admin" | "faculty" | "technician" | "student";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}