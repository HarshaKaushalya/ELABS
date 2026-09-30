import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "faculty", "technician", "student"]).optional()
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export const chatRequestSchema = z.object({
  message: z.string().min(1),
  context: z.string().optional()
});