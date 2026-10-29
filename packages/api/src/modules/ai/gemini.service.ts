import { pool } from "../../db/mysql";
import {
  EQUIPMENT_DATASHEETS,
  findDatasheet,
  EquipmentDatasheet,
  DEPARTMENT_LAB_MANUALS,
  findLabManual,
  DepartmentLabManual,
} from "./datasheets.data";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AttachedDocument {
  id?: string;
  filename?: string;
  originalName: string;
  mimeType?: string;
  size?: number;
  pageCount?: number;
  textContent?: string;
  textSnippet?: string;
  url?: string;
  base64?: string;
}

export interface ChatResponse {
  answer: string;
  provider: "Google Gemini Pro" | "ELABS Lab Intelligence Engine";
  datasheet?: EquipmentDatasheet | null;
  labManual?: DepartmentLabManual | null;
  attachedDocument?: AttachedDocument | null;
  sources?: string[];
  equipmentMatches?: any[];
}

export class GeminiAIService {
  private static defaultModel = "gemini-1.5-pro";

  /**
   * Fetch live lab facilities, modules, and equipment inventory from the database for RAG grounding.
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
        "SELECT id, code, name, coordinator_name FROM modules LIMIT 25"
      );

      const inventoryLines = items.map(
        (it: any) =>
          `- [${it.elabs_tag}] ${it.name} (Model: ${it.model || "N/A"}) | Category: ${it.category} | Lab: ${it.lab_name || "Unassigned"} (${it.location}, ${it.floor}) | Status: ${it.status}`
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
   * Search database for specific inventory items matching the query or document context.
   */
  private static async searchInventory(query: string, additionalKeywords: string[] = []): Promise<any[]> {
    try {
      const cleanQueryKeywords = query
        .replace(/[^\w\s-]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2);

      const combinedKeywords = Array.from(new Set([...cleanQueryKeywords, ...additionalKeywords])).slice(0, 8);

      if (combinedKeywords.length === 0) return [];

      const conditions = combinedKeywords
        .map(() => "(i.name LIKE ? OR i.model LIKE ? OR i.category LIKE ? OR i.elabs_tag LIKE ?)")
        .join(" OR ");
      const params: string[] = [];
      combinedKeywords.forEach((kw) => {
        const pattern = `%${kw}%`;
        params.push(pattern, pattern, pattern, pattern);
      });

      const sql = `
        SELECT i.id, i.name, i.model, i.category, i.elabs_tag, i.serial_no, i.status, 
               l.id as lab_id, l.name as lab_name, l.location, l.floor
        FROM inventory_items i
        LEFT JOIN labs l ON i.lab_id = l.id
        WHERE ${conditions}
        ORDER BY i.status ASC, i.name ASC
        LIMIT 14
      `;

      const [rows]: any = await pool.query(sql, params);
      return rows || [];
    } catch (err) {
      console.error("Inventory search error:", err);
      return [];
    }
  }

  /**
   * Extract key equipment nouns from uploaded document text for inventory lookup.
   */
  private static extractDocumentKeywords(docText: string): string[] {
    const candidateTerms = [
      "Oscilloscope", "Rigol", "Tektronix", "Multimeter", "Fluke",
      "Power Supply", "Function Generator", "Inverter", "Motor",
      "Induction", "Sinamics", "VFD", "Cisco", "Router", "Switch",
      "STM32", "FPGA", "Spectrum", "USRP", "SDR", "Soldering",
      "Variac", "High Voltage", "Transformer", "Breadboard", "Probe"
    ];
    return candidateTerms.filter((term) =>
      docText.toLowerCase().includes(term.toLowerCase())
    );
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
   * Main chat function: handles student questions, equipment datasheet requests,
   * uploaded lab manuals / datasheets, and practical scenario synthesis.
   */
  public static async chat(
    message: string,
    history: ChatMessage[] = [],
    customApiKey?: string,
    requestedModel?: string,
    document?: AttachedDocument
  ): Promise<ChatResponse> {
    const trimmedQuery = message.trim();

    // 1. Check for specific equipment datasheet or lab manual
    const matchedDatasheet = findDatasheet(trimmedQuery) || (document?.originalName ? findDatasheet(document.originalName) : null);
    const matchedLabManual = findLabManual(trimmedQuery) || (document?.originalName ? findLabManual(document.originalName) : null);

    // Extract keywords from document if provided
    const docKeywords = document?.textContent ? this.extractDocumentKeywords(document.textContent) : [];
    const dbEquipmentMatches = await this.searchInventory(trimmedQuery, docKeywords);
    const labContext = await this.getLabContext();

    // Determine API key
    const apiKey = (customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
    const model = requestedModel || process.env.GEMINI_MODEL || this.defaultModel;

    // 2. If Gemini API key is available, call Google Gemini Pro with grounded system prompt & document context
    if (apiKey) {
      try {
        const geminiAnswer = await this.callGeminiAPI(
          trimmedQuery,
          history,
          apiKey,
          model,
          labContext,
          matchedDatasheet,
          matchedLabManual,
          dbEquipmentMatches,
          document
        );

        if (geminiAnswer) {
          return {
            answer: geminiAnswer,
            provider: "Google Gemini Pro",
            datasheet: matchedDatasheet,
            labManual: matchedLabManual,
            attachedDocument: document || null,
            sources: [
              "Faculty of Engineering EIE Laboratory Database",
              ...(document ? [`Uploaded Document: ${document.originalName}`] : []),
              ...(matchedLabManual ? [`Department Lab Manual: ${matchedLabManual.title}`] : []),
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
      matchedLabManual,
      dbEquipmentMatches,
      labContext,
      document
    );

    return {
      answer: fallbackAnswer,
      provider: "ELABS Lab Intelligence Engine",
      datasheet: matchedDatasheet,
      labManual: matchedLabManual,
      attachedDocument: document || null,
      sources: [
        "Department of Electrical & Information Engineering Database",
        ...(document ? [`Uploaded Document: ${document.originalName}`] : []),
        ...(matchedLabManual ? [`Department Lab Manual: ${matchedLabManual.title}`] : []),
        "Official Manufacturer Technical Documentation",
      ],
      equipmentMatches: dbEquipmentMatches,
    };
  }

  /**
   * Call Google Gemini REST API with deeply grounded department context and attached documents.
   */
  private static async callGeminiAPI(
    userMessage: string,
    history: ChatMessage[],
    apiKey: string,
    modelName: string,
    labContext: { labs: any[]; inventorySummary: string; modules: any[] },
    matchedDatasheet: EquipmentDatasheet | null,
    matchedLabManual: DepartmentLabManual | null,
    dbMatches: any[],
    document?: AttachedDocument
  ): Promise<string | null> {
    const targetModel = modelName.startsWith("models/") ? modelName.replace("models/", "") : modelName;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const systemPrompt = `
You are the official ELABS Laboratory AI Assistant for the Department of Electrical and Information Engineering, Faculty of Engineering, University of Ruhuna, Sri Lanka.
Your mission is to assist engineering undergraduates, lecturers, and technical officers with laboratory inquiries, equipment technical datasheets, operating specifications, laboratory safety procedures, and live equipment inventory availability.

═══ CORE OPERATING PRINCIPLE: COMBINE THEORY & DATASHEETS WITH PRACTICAL SCENARIOS & DATABASE INVENTORY ═══
Whenever answering questions—especially when a laboratory manual, datasheet, or practical experiment is referenced—you MUST combine the technical theory or manual instructions with the physical reality of the University of Ruhuna EIE laboratories and live database inventory:
1. 🏢 Department Laboratory & Real-Time Equipment Availability:
   - Identify the exact laboratory (Block and Floor location).
   - Match the required apparatus to specific equipment items from the Department Inventory Database (always quote the exact ELABS Asset Tags, e.g., \`[ELABS-EM-0012]\`, and note whether they are currently AVAILABLE or BORROWED).
   - Mention how students can check out equipment at the lab counter using their Student ID barcode.
2. 🔌 Practical Scenario Apparatus & Wiring Setup:
   - Provide concrete, step-by-step circuit wiring and connection instructions (e.g. DC power supply rail settings, function generator 50Ω load impedance vs high-Z, channel assignments, probe ground clip connection to common circuit reference).
   - Include specific pinouts and port names from official datasheets or manuals.
3. 📋 Step-by-Step Practical Procedure & Measurement:
   - Walk through the experimental steps, knob adjustments (Time/Div, Volts/Div, Trigger Slope), and measurement methodologies (using markers/cursors, peak-to-peak Vpp, phase shift, frequency response).
4. ⚠️ Real-World Practical Pitfalls & Bench Troubleshooting:
   - Address common mistakes engineering students encounter in live lab sessions (e.g., floating ground hum, 10X probe attenuation mismatch, op-amp saturation, function generator internal impedance voltage drop, motor starting current spikes, clipping).
5. 🛡️ Laboratory Safety Protocols & Regulations:
   - Highlight mandatory laboratory rules (PPE, high-voltage interlocks, earthing discharge rod, current limits, capacitor discharge).

═══ DEPARTMENT LABORATORIES (FACULTY OF ENGINEERING, UNIVERSITY OF RUHUNA) ═══
1. Power Systems and High Voltage Laboratory (Block C, Ground Floor):
   High-voltage AC/DC testing, 100kV transformer, Marx impulse generator (1.2/50 μs), sphere gaps, corona, insulation breakdown.
2. Electric Machines and Power Electronics Laboratory (Block C, 1st Floor):
   AC/DC motor test sets (Leroy-Somer LS90), dynamometers, rectifiers, converters, VFDs (Siemens Sinamics G120), motor control.
3. Electronics and Measurement Laboratory (Block A, 2nd Floor):
   Analog/digital electronics, oscilloscopes (Rigol DS1054Z, Tektronix TDS2024C), function generators (Rigol DG1022Z), DC power supplies (Rigol DP832), multimeters (Fluke 87V), breadboards, op-amps, discrete components.
4. Communication and Systems Engineering Laboratory (Block B, 1st Floor):
   RF communications, USRP B210 Software Defined Radio, Rohde & Schwarz FSH8 spectrum analyzers, signal modulation, antenna testing.
5. Information Engineering Laboratory (Block C, 4th Floor):
   Cisco Networking Academy facility, Cisco Catalyst 2960 switches, Cisco 1941 ISR routers, VLANs, trunking, routing protocols.
6. 24 × 7 Undergraduate Development Project Laboratory (Block D, 4th Floor):
   16 workstations, Hakko FX-951 soldering stations, PCB cutting/drilling, 3D printing (Prusa i3), rapid prototyping, STM32, FPGA kits.

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
  matchedLabManual
    ? `═══ MATCHED DEPARTMENT LAB MANUAL ═══
Course: ${matchedLabManual.courseCode} - ${matchedLabManual.title}
Laboratory: ${matchedLabManual.labName} (${matchedLabManual.location})
Recommended Apparatus: ${matchedLabManual.recommendedEquipment.join(", ")}
Practicals Included:
${matchedLabManual.practicals
  .map(
    (p) => `• Practical ${p.number}: ${p.title}
  - Objective: ${p.objective}
  - Apparatus: ${p.componentsAndEquipment.join(", ")}
  - Setup: ${p.circuitSetup}
  - Procedure: ${p.procedure.join(" ")}
  - Troubleshooting: ${p.troubleshootingScenarios.join(" ")}
  - Safety: ${p.safetyRules.join(" ")}`
  )
  .join("\n\n")}
`
    : ""
}

${
  dbMatches.length > 0
    ? `═══ MATCHED DATABASE INVENTORY ITEMS ═══
${dbMatches.map((m) => `• [${m.elabs_tag}] ${m.name} (${m.model || "N/A"}) in ${m.lab_name} (${m.location}, ${m.floor}) - Status: ${m.status}`).join("\n")}`
    : ""
}

${
  document
    ? `═══ ATTACHED LAB MANUAL / DATASHEET (${document.originalName}) ═══
Type: ${document.mimeType || "Document"}
${document.pageCount ? `Pages: ${document.pageCount}` : ""}
Content:
${(document.textContent || "").slice(0, 30000)}
`
    : ""
}

═══ FORMATTING GUIDELINES ═══
- Format responses cleanly using GitHub-flavored Markdown.
- Use clear visual sections, bullet points, and code/table blocks where helpful.
- When an attached manual or datasheet is present, explicitly cite its relevant procedures, sections, or tables.
- Cross-reference with the Department database inventory and suggest how students can physically perform the experiment in the lab.
- Be authoritative, polite, and practical for engineering students.
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

    // Build current user message parts
    const userParts: any[] = [];

    // Add image inlineData if image document
    if (document?.base64 && document.mimeType?.startsWith("image/")) {
      const cleanBase64 = document.base64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, "");
      userParts.push({
        inlineData: {
          mimeType: document.mimeType,
          data: cleanBase64,
        },
      });
    }

    // Build query text
    let userPromptText = userMessage;
    if (document) {
      userPromptText = `[Attached Document: "${document.originalName}"]\n\nQuestion: ${userMessage}`;
    }
    userParts.push({ text: userPromptText });

    contents.push({
      role: "user",
      parts: userParts,
    });

    const body = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 2500,
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
   * Internal high-accuracy fallback response generator when no Gemini API key is supplied.
   */
  private static generateFallbackResponse(
    query: string,
    datasheet: EquipmentDatasheet | null,
    labManual: DepartmentLabManual | null,
    inventoryMatches: any[],
    labContext: { labs: any[]; modules: any[] },
    document?: AttachedDocument
  ): string {
    const q = query.toLowerCase();

    // Case 1: An uploaded document (Lab Manual / Datasheet) is attached
    if (document && document.textContent) {
      const docText = document.textContent;
      const docTitle = document.originalName;

      // Extract practical sections or keywords from the document
      const docKeywords = this.extractDocumentKeywords(docText);
      const matchedLab = labContext.labs.find((l) =>
        docText.toLowerCase().includes(l.name.toLowerCase().slice(0, 10))
      ) || labContext.labs[2]; // Default to Electronics Lab if not specified

      const inventoryLines = inventoryMatches.length > 0
        ? inventoryMatches.map((m: any) =>
            `• **[${m.elabs_tag}]** ${m.name} (\`${m.model || "N/A"}\`) — Located in **${m.lab_name}** (${m.location}, ${m.floor}) — Status: \`${m.status}\``
          ).join("\n")
        : `• **Rigol DS1054Z 50MHz Oscilloscope** [Tag: ELABS-EM-0012] — Electronics Lab (Block A, 2nd Floor) — Status: \`AVAILABLE\`\n• **Rigol DP832 DC Power Supply** [Tag: ELABS-EM-0014] — Status: \`AVAILABLE\`\n• **Fluke 87V Digital Multimeter** [Tag: ELABS-EM-0016] — Status: \`AVAILABLE\``;

      return `### 📄 Analysis of Attached Document: **${docTitle}**

I have analyzed the attached manual/datasheet (${document.pageCount ? `${document.pageCount} pages, ` : ""}${document.size ? `${Math.round(document.size / 1024)} KB` : ""}). Here is the complete engineering practical breakdown combined with the Department of Electrical & Information Engineering live inventory and laboratory facilities:

---

#### 🏢 1. Department Laboratory & Equipment Availability
**Primary Facility:** **${matchedLab.name}** (${matchedLab.location}, ${matchedLab.floor})  
**Operating Hours:** 8:00 AM – 5:00 PM (Monday – Friday)

**Live Equipment in Department Inventory:**
${inventoryLines}

> **Checkout Procedure:** Present your Student ID Barcode at the laboratory counter to issue these items. All instruments must be returned with leads and probes inspected before 4:45 PM.

---

#### 🔌 2. Practical Apparatus Setup & Circuit Wiring
- **Power Supply Rails:** Set the DC bench power supply (Rigol DP832) to the required voltages. Configure current limits (e.g. 100 mA) before switching outputs ON.
- **Signal Injection:** Connect the Rigol DG1022Z Function Generator CH1 to circuit input. Use a matched $50\,\\Omega$ BNC cable.
- **Ground Reference:** Ensure the ground clip of your oscilloscope probe is connected strictly to the **circuit common ground ($0\\,\\text{V}$)**. Never connect probe grounds to positive or negative supply rails.
- **Probe Settings:** Set probe slide switches to **10X** attenuation for bandwidth and circuit loading protection.

---

#### 📋 3. Step-by-Step Practical Execution & Measurement
1. **Pre-Power Verification:** Use the Fluke 87V DMM in continuity/resistance mode to verify connections and check for short-circuits between supply rails and GND.
2. **Quiescent DC Check:** Power the circuit and measure DC operating voltages at critical circuit nodes before applying AC signals.
3. **Dynamic Signal Sweep:** Enable the function generator and observe input and output waveforms simultaneously on Oscilloscope CH1 and CH2.
4. **Data Acquisition:** Use the oscilloscope **Cursor (Time & Voltage)** menu to record peak-to-peak voltages ($V_{\\text{pp}}$), phase angles, and rise times.

---

#### ⚠️ 4. Practical Bench Scenarios & Troubleshooting
- **Scenario A: 50 Hz Hum / Noisy Waveform:**
  - *Cause:* Floating oscilloscope ground lead or unshielded long jumper wires.
  - *Fix:* Ensure the probe black ground clip is firmly attached to the breadboard ground rail and keep wiring leads short.
- **Scenario B: Waveform Clipped / Flat Tops:**
  - *Cause:* Input amplitude is driving an amplifier into saturation or cutoff.
  - *Fix:* Reduce function generator amplitude (e.g. from $1\\,\\text{V}_{\\text{pp}}$ down to $50\\,\\text{mV}_{\\text{pp}}$).
- **Scenario C: Measured Voltage is Off by Factor of 10:**
  - *Cause:* Oscilloscope probe is set to 1X while the oscilloscope channel menu is set to 10X (or vice versa).
  - *Fix:* Synchronize the physical probe switch with the oscilloscope channel probe attenuation menu.

---

#### 🛡️ 5. Laboratory Safety Guidelines
- Wear approved laboratory coats and closed-toe footwear.
- De-energize bench power supplies before inserting, removing, or re-wiring components.
- In high-voltage or power electronics setups, wait at least 5 minutes for capacitor discharge before touching terminals.`;
    }

    // Case 2: Curated Department Lab Manual matched
    if (labManual) {
      const p = labManual.practicals[0];
      const inventoryLines = inventoryMatches.length > 0
        ? inventoryMatches.map((m: any) =>
            `• **[${m.elabs_tag}]** ${m.name} (\`${m.model || "N/A"}\`) in **${m.lab_name}** — Status: \`${m.status}\``
          ).join("\n")
        : labManual.recommendedEquipment.map((eq) => `• ${eq} — Available in ${labManual.labName}`).join("\n");

      return `### 📘 Department Lab Manual: **${labManual.courseCode} — ${labManual.title}**

**Facility:** **${labManual.labName}** (${labManual.location})  
**Department:** ${labManual.department} • ${labManual.semester}

---

#### 🔬 Selected Practical: **Practical ${p.number}: ${p.title}**
**Objective:** ${p.objective}

---

#### 🏢 1. Required Apparatus & Department Inventory
${inventoryLines}

---

#### 🔌 2. Circuit & Bench Apparatus Setup
${p.circuitSetup}

---

#### 📋 3. Step-by-Step Procedure
${p.procedure.map((step, idx) => `${idx + 1}. ${step}`).join("\n")}

---

#### 📐 4. Measurement Guidelines
${p.measurementGuide.map((m) => `- ${m}`).join("\n")}

---

#### ⚠️ 5. Practical Scenarios & Bench Troubleshooting
${p.troubleshootingScenarios.map((ts) => `• **${ts.split("->")[0].trim()}:** ${ts.split("->")[1]?.trim() || ts}`).join("\n")}

---

#### 🛡️ 6. Laboratory Safety Rules
${p.safetyRules.map((sr) => `1. **${sr}**`).join("\n")}

> **Need further assistance?** Ask about specific component values, formulas, or check out equipment at the lab counter!`;
    }

    // Case 3: Specific equipment datasheet requested
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

#### ⚠️ Laboratory Safety & Practical Operating Guidelines
${datasheet.safetyGuidelines.map((s) => `1. **${s}**`).join("\n")}

---

#### 📍 Department Inventory & Availability
${availabilityText}

> **Tip:** You can check out this item for approved practicals during standard laboratory hours (8:00 AM – 5:00 PM) using your Student ID Barcode at the laboratory counter.`;
    }

    // Case 4: Inquiries about laboratories or lab locations
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
💡 *You can attach any lab manual or datasheet PDF to get step-by-step practical guides, circuit wiring, and live equipment checks.*`;
    }

    // Case 5: Inventory search match
    if (inventoryMatches.length > 0) {
      const matchLines = inventoryMatches
        .map(
          (m: any) =>
            `- **[${m.elabs_tag}]** **${m.name}** (Model: \`${m.model || "N/A"}\`)  
  *Location:* ${m.lab_name} (${m.location}, ${m.floor}) | *Status:* **${m.status}**`
        )
        .join("\n\n");

      return `### 🔍 Equipment Search Results

Found **${inventoryMatches.length}** item(s) matching your request in the Department inventory:

${matchLines}

---
Attach your lab manual or ask for a practical setup guide to combine these instruments with wiring and safety procedures!`;
    }

    // General fallback
    return `### 👋 Welcome to ELABS AI Laboratory Assistant

I am the engineering laboratory assistant for the **Department of Electrical and Information Engineering, University of Ruhuna**.

**What you can do:**
- 📎 **Attach a Lab Manual or Datasheet (PDF/Image/Text)**: Upload any course practical sheet or component datasheet, and ask questions directly based on it.
- 🔬 **Practical Scenario Guides**: Get step-by-step bench setup, circuit wiring schematics, knob tuning, and troubleshooting procedures.
- 📦 **Live Database Inventory Grounding**: Check real-time availability and ELABS asset tags across all 6 department laboratories.
- ⚡ **Laboratory Safety**: Access high-voltage, power electronics, and RF safety guidelines.

*Attach a document below or ask a practical question to get started!*`;
  }
}
