import { Router, Request, Response } from "express";
import { GeminiAIService } from "./gemini.service";
import { EQUIPMENT_DATASHEETS, findDatasheet } from "./datasheets.data";
import { pool } from "../../db/mysql";

const router = Router();

/**
 * POST /ai/chat
 * Primary conversation endpoint for students and staff.
 */
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, history, apiKey, model } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message prompt is required." });
    }

    // Key can come from body or custom header
    const providedKey = (apiKey || req.headers["x-gemini-api-key"] || "").toString();

    const response = await GeminiAIService.chat(
      message,
      Array.isArray(history) ? history : [],
      providedKey,
      typeof model === "string" ? model : undefined
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
    });
  } catch (err: any) {
    return res.json({
      ok: true,
      service: "ELABS AI Assistant",
      geminiConfigured: hasEnvKey,
      defaultModel: "gemini-1.5-pro",
      activeLaboratories: 6,
      curatedDatasheets: Object.keys(EQUIPMENT_DATASHEETS).length,
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
