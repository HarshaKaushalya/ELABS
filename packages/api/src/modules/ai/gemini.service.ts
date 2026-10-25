import { pool } from "../../db/mysql";
import { EQUIPMENT_DATASHEETS, findDatasheet, EquipmentDatasheet } from "./datasheets.data";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  answer: string;
  provider: "Google Gemini Pro" | "ELABS Lab Intelligence Engine";
  datasheet?: EquipmentDatasheet | null;
  sources?: string[];
  equipmentMatches?: any[];
}

export class GeminiAIService {
  private static defaultModel = "gemini-1.5-pro";

  /**
   * Fetch live lab facilities and equipment from the database for RAG grounding.
   */
  private static async getLabContext(): Promise<{
    labs: any[];
    inventorySummary: string;
    modules: any[];
  }> {
    try {
      const [labs]: any = await pool.query(
        "SELECT id, name, location, floor, description, facilities FROM labs ORDER BY id ASC"
      );
      const [items]: any = await pool.query(
        `SELECT i.id, i.name, i.model, i.category, i.elabs_tag, i.status, l.name as lab_name, l.location, l.floor 
         FROM inventory_items i 
         LEFT JOIN labs l ON i.lab_id = l.id 
         ORDER BY l.id ASC, i.name ASC`
      );
      const [modules]: any = await pool.query(
        "SELECT id, code, name, coordinator_name FROM modules LIMIT 20"
      );

      const inventoryLines = items.map(
        (it: any) =>
          `- [${it.elabs_tag}] ${it.name} (Model: ${it.model || "N/A"}) | Lab: ${it.lab_name || "Unassigned"} (${it.location}, ${it.floor}) | Status: ${it.status}`
      );

      return {
        labs: labs || [],
        inventorySummary: inventoryLines.join("\n"),
        modules: modules || [],
      };
    } catch (err) {
      console.error("Error fetching lab context from database:", err);
      return {
        labs: [],
        inventorySummary: "Database context temporarily unavailable.",
        modules: [],
      };
    }
  }

  /**
   * Search database for specific inventory items matching the student's query.
   */
  private static async searchInventory(query: string): Promise<any[]> {
    try {
      const keywords = query
        .replace(/[^\w\s-]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2);

      if (keywords.length === 0) return [];

      const conditions = keywords.map(() => "(i.name LIKE ? OR i.model LIKE ? OR i.category LIKE ? OR i.elabs_tag LIKE ?)").join(" OR ");
      const params: string[] = [];
      keywords.forEach((kw) => {
        const pattern = `%${kw}%`;
        params.push(pattern, pattern, pattern, pattern);
      });

      const sql = `
        SELECT i.id, i.name, i.model, i.category, i.elabs_tag, i.serial_no, i.status, 
               l.id as lab_id, l.name as lab_name, l.location, l.floor
        FROM inventory_items i
        LEFT JOIN labs l ON i.lab_id = l.id
        WHERE ${conditions}
        LIMIT 10
      `;

      const [rows]: any = await pool.query(sql, params);
      return rows || [];
    } catch (err) {
      console.error("Inventory search error:", err);
      return [];
    }
  }

  /**
   * Verify a Google Gemini API Key.
   */
  public static async verifyKey(apiKey: string): Promise<{ valid: boolean; model?: string; error?: string }> {
    try {
      const key = apiKey.trim();
      if (!key) return { valid: false, error: "Empty API key provided." };

      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return {
          valid: false,
          error: errData?.error?.message || `HTTP ${res.status}: Invalid Google Gemini API Key`,
        };
      }

      const data = await res.json();
      const hasPro = data?.models?.some((m: any) => m.name.includes("gemini-1.5-pro"));
      return {
        valid: true,
        model: hasPro ? "gemini-1.5-pro" : "gemini-1.5-flash",
      };
    } catch (err: any) {
      return { valid: false, error: err.message || "Failed to reach Google Gemini API." };
    }
  }

  /**
   * Main chat function: handles student questions, equipment datasheet requests, and lab information.
   */
  public static async chat(
    message: string,
    history: ChatMessage[] = [],
    customApiKey?: string,
    requestedModel?: string
  ): Promise<ChatResponse> {
    const trimmedQuery = message.trim();

    // 1. Check for specific equipment datasheet requests
    const matchedDatasheet = findDatasheet(trimmedQuery);
    const dbEquipmentMatches = await this.searchInventory(trimmedQuery);
    const labContext = await this.getLabContext();

    // Determine API key (custom key passed from user, or process.env)
    const apiKey = (customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
    const model = requestedModel || process.env.GEMINI_MODEL || this.defaultModel;

    // 2. If Gemini API key is available, call Google Gemini Pro with grounded system prompt
    if (apiKey) {
      try {
        const geminiAnswer = await this.callGeminiAPI(
          trimmedQuery,
          history,
          apiKey,
          model,
          labContext,
          matchedDatasheet,
          dbEquipmentMatches
        );

        if (geminiAnswer) {
          return {
            answer: geminiAnswer,
            provider: "Google Gemini Pro",
            datasheet: matchedDatasheet,
            sources: [
              "Faculty of Engineering EIE Laboratory Database",
              "Official Manufacturer Datasheets & Manuals",
              `Google Gemini Pro (${model})`,
            ],
            equipmentMatches: dbEquipmentMatches,
          };
        }
      } catch (err: any) {
        console.warn("Gemini API call failed, falling back to internal knowledge engine:", err.message);
      }
    }

    // 3. Fallback: High-precision domain expert response engine
    const fallbackAnswer = this.generateFallbackResponse(
      trimmedQuery,
      matchedDatasheet,
      dbEquipmentMatches,
      labContext
    );

    return {
      answer: fallbackAnswer,
      provider: "ELABS Lab Intelligence Engine",
      datasheet: matchedDatasheet,
      sources: [
        "Department of Electrical & Information Engineering Database",
        "Official Manufacturer Technical Documentation",
      ],
      equipmentMatches: dbEquipmentMatches,
    };
  }

  /**
   * Call the Google Gemini REST API with grounded context.
   */
  private static async callGeminiAPI(
    userMessage: string,
    history: ChatMessage[],
    apiKey: string,
    modelName: string,
    labContext: { labs: any[]; inventorySummary: string; modules: any[] },
    matchedDatasheet: EquipmentDatasheet | null,
    dbMatches: any[]
  ): Promise<string | null> {
    const targetModel = modelName.startsWith("models/") ? modelName.replace("models/", "") : modelName;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const systemPrompt = `
You are the official ELABS AI Assistant for the Department of Electrical and Information Engineering, Faculty of Engineering, University of Ruhuna, Sri Lanka.
Your job is to assist engineering undergraduates, lecturers, and technical officers with laboratory inquiries, equipment technical datasheets, operating specifications, laboratory safety procedures, and live equipment inventory availability.

═══ DEPARTMENT LABORATORIES ═══
1. Power Systems and High Voltage Laboratory (Block C, Ground Floor):
   High-voltage experiments, impulse voltages, surge measurement, insulation breakdown, corona & partial discharge.
2. Electric Machines and Power Electronics Laboratory (Block C, 1st Floor):
   AC/DC motors, torque-speed measurement, rectifiers, inverters, VFD drives (Siemens Sinamics G120), motor control.
3. Electronics and Measurement Laboratory (Block A, 2nd Floor):
   Analog/digital electronics, oscilloscopes (Rigol DS1054Z, Tektronix TDS2024C), logic analyzers, Rigol DG1022Z function generators, Rigol DP832 DC power supplies, FPGA kits.
4. Communication and Systems Engineering Laboratory (Block B, 1st Floor):
   RF communications, USRP B210 Software Defined Radio, spectrum analyzers, digital signal modulation.
5. Information Engineering Laboratory (Block C, 4th Floor):
   Cisco Networking Academy facility, Cisco Catalyst 2960 switches, Cisco 1941 ISR routers, VLANs, trunking, routing protocols.
6. 24 × 7 Undergraduate Development Project Laboratory (Block D, 4th Floor):
   16 workstations, Hakko FX-951 soldering stations, PCB cutting/drilling, 3D printing (Prusa i3), rapid prototyping.

═══ LIVE INVENTORY DATABASE ═══
${labContext.inventorySummary}

${
  matchedDatasheet
    ? `═══ MATCHED EQUIPMENT TECHNICAL DATASHEET ═══
Model: ${matchedDatasheet.model}
Manufacturer: ${matchedDatasheet.manufacturer}
Category: ${matchedDatasheet.category}
Official Datasheet Link: ${matchedDatasheet.datasheetUrl}
${matchedDatasheet.manualUrl ? `Official User Manual Link: ${matchedDatasheet.manualUrl}` : ""}
Specifications:
${JSON.stringify(matchedDatasheet.specs, null, 2)}
Pinouts / Ports:
${(matchedDatasheet.pinoutOrPorts || []).join("\n")}
Safety Guidelines:
${matchedDatasheet.safetyGuidelines.join("\n")}
`
    : ""
}

${
  dbMatches.length > 0
    ? `═══ MATCHED DATABASE INVENTORY ITEMS ═══
${dbMatches.map((m) => `• [${m.elabs_tag}] ${m.name} (${m.model}) in ${m.lab_name} (${m.location}, ${m.floor}) - Status: ${m.status}`).join("\n")}`
    : ""
}

═══ RESPONSE GUIDELINES ═══
- Format responses cleanly using GitHub-flavored Markdown.
- When an equipment datasheet is asked for, ALWAYS provide:
  1. Full model name, manufacturer, and laboratory location.
  2. Complete technical specifications table or bullet points (Bandwidth, Sample Rate, Voltage/Current ratings, etc.).
  3. Direct clickable markdown link to the official datasheet / user manual (e.g., [Download Official Datasheet](${matchedDatasheet?.datasheetUrl || "#"})).
  4. Pinout / port breakdown.
  5. Critical laboratory safety rules and operating precautions.
  6. Current stock and availability in the department labs from the live inventory above.
- Be precise, polite, authoritative, and helpful to engineering students.
`;

    // Map conversation history
    const contents: any[] = [];

    // Add prior turns
    const recentHistory = history.slice(-6);
    recentHistory.forEach((msg) => {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    });

    // Add current user prompt
    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    const body = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 2048,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Gemini API error (HTTP ${res.status}):`, errText);
      throw new Error(`Gemini API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;

    return textPart || null;
  }

  /**
   * Internal high-accuracy fallback response generator when no key is supplied.
   */
  private static generateFallbackResponse(
    query: string,
    datasheet: EquipmentDatasheet | null,
    inventoryMatches: any[],
    labContext: { labs: any[]; modules: any[] }
  ): string {
    const q = query.toLowerCase();

    // Case 1: Specific equipment datasheet requested
    if (datasheet) {
      const itemsInLab = inventoryMatches.filter(
        (it) => it.model && it.model.toLowerCase().includes(datasheet.model.toLowerCase().slice(0, 5))
      );

      const availabilityText =
        itemsInLab.length > 0
          ? itemsInLab
              .map(
                (it) =>
                  `• **[${it.elabs_tag}]** ${it.name} — Located in **${it.lab_name}** (${it.location}, ${it.floor}) — Status: \`${it.status}\``
              )
              .join("\n")
          : "• Equipment listed in the Department of Electrical & Information Engineering inventory catalogue.";

      let specLines = "";
      for (const [k, v] of Object.entries(datasheet.specs)) {
        specLines += `| **${k.replace(/([A-Z])/g, " $1").toUpperCase()}** | ${v} |\n`;
      }

      return `### 📄 Technical Datasheet: ${datasheet.model}

**Manufacturer:** ${datasheet.manufacturer}  
**Category:** ${datasheet.category}  
**Official Datasheet:** [🔗 View / Download ${datasheet.model} Datasheet](${datasheet.datasheetUrl})  
${datasheet.manualUrl ? `**User Manual:** [📖 Download Official User Guide (PDF)](${datasheet.manualUrl})` : ""}

---

#### ⚙️ Technical Specifications
| Parameter | Value |
| :--- | :--- |
${specLines}

---

#### 🔌 Interface Ports & Connections
${(datasheet.pinoutOrPorts || ["Refer to the official user manual for full rear and front panel pin assignments."]).map((p) => `- ${p}`).join("\n")}

---

#### ⚠️ Laboratory Safety & Operating Guidelines
${datasheet.safetyGuidelines.map((s) => `1. **${s}**`).join("\n")}

---

#### 📍 Department Inventory & Availability
${availabilityText}

> **Tip:** You can check out this item for approved practicals during standard laboratory hours (8:00 AM – 5:00 PM) using your Student ID Barcode at the laboratory counter.`;
    }

    // Case 2: Inquiries about laboratories or lab locations
    if (q.includes("lab") || q.includes("where") || q.includes("location") || q.includes("facilities")) {
      const labsList = labContext.labs
        .map(
          (l: any) =>
            `### ${l.id}. ${l.name}
- **Location:** ${l.location}, ${l.floor}
- **Description:** ${l.description}
- **Key Facilities & Equipment:** ${l.facilities}
`
        )
        .join("\n");

      return `### 🏛️ Department of Electrical and Information Engineering Laboratories

The department operates 6 specialized laboratory facilities:

${labsList}

---
💡 *To view inventory or request a datasheet for any instrument in these labs, ask me for the equipment model name (e.g. \`Rigol DS1054Z\`, \`Fluke 87V\`, \`Rigol DP832\`, \`Cisco 2960\`).*`;
    }

    // Case 3: Inventory search match
    if (inventoryMatches.length > 0) {
      const matchLines = inventoryMatches
        .map(
          (m: any) =>
            `- **[${m.elabs_tag}]** **${m.name}** (Model: \`${m.model}\`)  
  *Location:* ${m.lab_name} (${m.location}, ${m.floor}) | *Status:* **${m.status}**`
        )
        .join("\n\n");

      return `### 🔍 Equipment Search Results

Found **${inventoryMatches.length}** item(s) matching your request in the Department inventory:

${matchLines}

---
Would you like me to provide the **technical datasheet**, **pinouts**, or **safety operating procedures** for any of these instruments? Just ask for the model name!`;
    }

    // General fallback
    return `### 👋 Welcome to ELABS AI Assistant

I am the intelligent laboratory assistant for the **Department of Electrical and Information Engineering, University of Ruhuna**.

I can assist you with:
- 📄 **Equipment Datasheets & Manuals**: Ask for any instrument (e.g., *"Give me the datasheet for Rigol DS1054Z"* or *"Fluke 87V specs"*).
- 🔬 **Laboratory Information**: Details and locations of all 6 department labs (High Voltage, Electric Machines, Electronics, Telecom, Cisco Network Lab, 24x7 Project Lab).
- 📦 **Inventory & Availability**: Check if an oscilloscope, multimeter, DC power supply, or FPGA board is currently available.
- ⚡ **Laboratory Safety Guidelines**: Operating instructions, PPE requirements, and high-voltage precautions.

*How can I help you with your laboratory work today?*`;
  }
}
