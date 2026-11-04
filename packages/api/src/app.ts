import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { corsOptions } from "./config/cors";
import authRoutes from "./modules/auth/auth.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import labsRoutes from "./modules/labs/labs.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import adminRoutes from "./modules/admin/admin.routes";
import academicRoutes from "./modules/academic/academic.routes";
import submissionsRoutes from "./modules/submissions/submissions.routes";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import messagesRoutes from "./modules/messages/messages.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import timetableRoutes from "./modules/academic/timetable.routes";
import assessmentRoutes from "./modules/academic/assessments.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import aiRoutes from "./modules/ai/ai.routes";
import feedbackRoutes from "./modules/feedback/feedback.routes";
import { pool } from "./db/mysql";

export const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.use(cors(corsOptions));

// Normalize URLs so both /api/auth/login and /auth/login work seamlessly
app.use((req, res, next) => {
  if (req.url.startsWith("/api/")) {
    req.url = req.url.replace(/^\/api/, "");
  } else if (req.url === "/api") {
    req.url = "/";
  }
  next();
});

app.get("/", (_, res) => res.json({ service: "elabs-api", status: "ok" }));
app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/labs", labsRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/admin", adminRoutes);
app.use("/academic", academicRoutes);
app.use("/submissions", submissionsRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/messages", messagesRoutes);
app.use("/notifications", notificationsRoutes);
app.use("/timetable", timetableRoutes);
app.use("/academic", assessmentRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/ai", aiRoutes);
app.use("/feedback", feedbackRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.use("/uploads", express.static(path.join("/tmp", "uploads")));
}

// Fallback for uploaded assignment submissions stored in database
app.get("/uploads/submissions/:filename", async (req, res, next) => {
  const filename = req.params.filename;
  try {
    const [rows] = await pool.query(
      `SELECT file_name, file_type, file_data FROM assignment_submissions WHERE file_url LIKE :pattern LIMIT 1`,
      { pattern: `%${filename}` }
    ) as any;
    const sub = (rows as any[])[0];
    if (sub && sub.file_data) {
      const buffer = Buffer.from(sub.file_data, "base64");
      const ext = path.extname(sub.file_name || filename).toLowerCase();
      const mimeMap: Record<string, string> = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".zip": "application/zip",
        ".ppt": "application/vnd.ms-powerpoint",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      };
      const contentType = sub.file_type || mimeMap[ext] || "application/octet-stream";
      const name = encodeURIComponent(sub.file_name || filename);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${name}"; filename*=UTF-8''${name}`);
      res.setHeader("Content-Length", buffer.length);
      return res.end(buffer);
    }
  } catch (err) {
    console.warn("DB file fallback error:", err);
  }
  next();
});

// Global Error Handler to prevent crashes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});
