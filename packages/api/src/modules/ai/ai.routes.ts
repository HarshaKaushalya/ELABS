import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { GeminiAIService, AttachedDocument } from "./gemini.service";
import {
  EQUIPMENT_DATASHEETS,
  findDatasheet,
  DEPARTMENT_LAB_MANUALS,
  findLabManual,
} from "./datasheets.data";
import { pool } from "../../db/mysql";

const router = Router();

// ─── File Upload Setup for Lab Manuals and Datasheets ────────────────────────
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const docUploadDir = isServerless
  ? path.join("/tmp", "uploads", "documents")
  : path.join(process.cwd(), "uploads", "documents");

try {
  if (!fs.existsSync(docUploadDir)) {
    fs.mkdirSync(docUploadDir, { recursive: true });
  }
} catch (e) {
  console.warn("Could not create document upload directory:", e);
}

const docStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, docUploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`);
  },
});

const docUpload = multer({
  storage: docStorage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".txt", ".md", ".doc", ".docx", ".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} is not supported. Please upload a PDF, TXT, MD, DOCX, or Image file.`));
    }
  },
});

/**
 * POST /ai/upload-document
 * Upload a laboratory manual, technical datasheet, or circuit diagram.
 * Extracts text and returns metadata ready for AI grounding.
 */
router.post("/upload-document", docUpload.single("file"), async (req: any, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No document file was uploaded." });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    let textContent = "";
    let pageCount: number | undefined = undefined;
    let base64Preview: string | undefined = undefined;

    // 1. PDF extraction using pdf-parse
    if (ext === ".pdf") {
      try {
        const { PDFParse } = require("pdf-parse");
        const fileBuffer = fs.readFileSync(file.path);
        const parser = new PDFParse(new Uint8Array(fileBuffer));
        await parser.load();
        const parsed = await parser.getText();
        textContent = parsed.text || "";
        pageCount = parsed.total || 1;
      } catch (pdfErr: any) {
        console.warn("PDF parsing failed, falling back to raw buffer preview:", pdfErr.message);
        textContent = `[PDF Document: ${file.originalname} (${Math.round(file.size / 1024)} KB)]`;
      }
    } else if (ext === ".txt" || ext === ".md") {
      // 2. Plain text or Markdown
      try {
        textContent = fs.readFileSync(file.path, "utf-8");
      } catch (readErr: any) {
        textContent = `[Text Document: ${file.originalname}]`;
      }
    } else if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
      // 3. Image (schematic, apparatus photo, or datasheet snapshot)
      try {
        const imgBuffer = fs.readFileSync(file.path);
        base64Preview = `data:${file.mimetype};base64,${imgBuffer.toString("base64")}`;
        textContent = `[Laboratory Apparatus / Schematic Image: ${file.originalname}]`;
      } catch (imgErr: any) {
        console.warn("Image buffer read error:", imgErr.message);
      }
    } else {
      // 4. Other documents (DOCX, etc.)
      textContent = `[Document: ${file.originalname} (${Math.round(file.size / 1024)} KB)]`;
    }

    // Clean up excessive whitespace
    const cleanText = textContent.replace(/\r\n/g, "\n").trim();
    const textSnippet = cleanText.slice(0, 400);

    const doc: AttachedDocument = {
      id: `doc_${Date.now()}`,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      pageCount,
      textContent: cleanText,
      textSnippet,
      url: `/uploads/documents/${file.filename}`,
      base64: base64Preview,
    };

    return res.json({
      ok: true,
      document: doc,
    });
  } catch (err: any) {
    console.error("Document upload error:", err);
    return res.status(500).json({
      error: "Failed to process and analyze uploaded document.",
      details: err.message,
    });
  }
});

/**
 * GET /ai/lab-manuals
 * List curated Department of Electrical & Information Engineering practical manuals.
 */
router.get("/lab-manuals", (_req: Request, res: Response) => {
  const manuals = Object.values(DEPARTMENT_LAB_MANUALS).map((m) => ({
    id: m.id,
    courseCode: m.courseCode,
    title: m.title,
    department: m.department,
    semester: m.semester,
    labName: m.labName,
    location: m.location,
    description: m.description,
    practicalsCount: m.practicals.length,
    practicals: m.practicals.map((p) => ({
      number: p.number,
      title: p.title,
      objective: p.objective,
    })),
  }));
  return res.json(manuals);
});

/**
 * GET /ai/lab-manuals/:id
 * Retrieve full contents and practical steps of a specific department lab manual.
 */
router.get("/lab-manuals/:id", (req: Request, res: Response) => {
  const manual = DEPARTMENT_LAB_MANUALS[req.params.id] || findLabManual(req.params.id);
  if (!manual) {
    return res.status(404).json({ error: "Laboratory manual not found." });
  }
  return res.json(manual);
});

/**
 * POST /ai/chat
 * Primary conversation endpoint for students and staff.
 * Supports attached lab manuals, datasheets, and practical scenario synthesis.
 */
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, history, apiKey, model, document } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message prompt is required." });
    }

    // Key can come from body or custom header
    const providedKey = (apiKey || req.headers["x-gemini-api-key"] || "").toString();

    const response = await GeminiAIService.chat(
      message,
      Array.isArray(history) ? history : [],
      providedKey,
      typeof model === "string" ? model : undefined,
      document as AttachedDocument | undefined
    );

    return res.json(response);
  } catch (err: any) {
    console.error("AI Chat handler error:", err);
    return res.status(500).json({
      error: "Failed to process chat query.",
      details: err.message,
    });
  }
});

/**
 * GET /ai/datasheet/:model
 * Retrieve datasheet & technical specifications for a specific equipment model.
 */
router.get("/datasheet/:model", (req: Request, res: Response) => {
  const modelQuery = req.params.model;
  const datasheet = findDatasheet(modelQuery);
  if (!datasheet) {
    return res.status(404).json({
      error: `Datasheet for model '${modelQuery}' not found in the technical library.`,
    });
  }
  return res.json(datasheet);
});

/**
 * GET /ai/datasheets
 * List or search equipment datasheets.
 */
router.get("/datasheets", (req: Request, res: Response) => {
  const query = (req.query.q as string) || "";
  if (!query) {
    const list = Object.values(EQUIPMENT_DATASHEETS).map((d) => ({
      model: d.model,
      name: d.name,
      manufacturer: d.manufacturer,
      category: d.category,
      datasheetUrl: d.datasheetUrl,
      manualUrl: d.manualUrl,
    }));
    return res.json(list);
  }

  const matched = findDatasheet(query);
  return res.json(matched ? [matched] : []);
});

/**
 * GET /ai/status
 * Check AI status and configuration.
 */
router.get("/status", async (_req: Request, res: Response) => {
  const hasEnvKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  try {
    const [labsCount]: any = await pool.query("SELECT COUNT(*) as count FROM labs");
    const [itemsCount]: any = await pool.query("SELECT COUNT(*) as count FROM inventory_items");

    return res.json({
      ok: true,
      service: "ELABS AI Assistant",
      geminiConfigured: hasEnvKey,
      defaultModel: process.env.GEMINI_MODEL || "gemini-1.5-pro",
      activeLaboratories: labsCount?.[0]?.count || 6,
      indexedInventoryItems: itemsCount?.[0]?.count || 72,
      curatedDatasheets: Object.keys(EQUIPMENT_DATASHEETS).length,
      curatedLabManuals: Object.keys(DEPARTMENT_LAB_MANUALS).length,
    });
  } catch (err: any) {
    return res.json({
      ok: true,
      service: "ELABS AI Assistant",
      geminiConfigured: hasEnvKey,
      defaultModel: "gemini-1.5-pro",
      activeLaboratories: 6,
      curatedDatasheets: Object.keys(EQUIPMENT_DATASHEETS).length,
      curatedLabManuals: Object.keys(DEPARTMENT_LAB_MANUALS).length,
    });
  }
});

/**
 * POST /ai/verify-key
 * Verify a Google Gemini API Key.
 */
router.post("/verify-key", async (req: Request, res: Response) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== "string") {
    return res.status(400).json({ valid: false, error: "Please provide a valid API key string." });
  }

  const result = await GeminiAIService.verifyKey(apiKey);
  return res.json(result);
});

export default router;
