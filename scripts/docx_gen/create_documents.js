const fs = require("fs");
const path = require("path");
const { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType,
  ShadingType
} = require("docx");

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT 1: GroupNumber_Summary.docx (Single Physical Page Strict)
// ─────────────────────────────────────────────────────────────────────────────
async function createSummaryDoc() {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720,    // 0.5 inch
            bottom: 720, // 0.5 inch
            left: 720,   // 0.5 inch
            right: 720   // 0.5 inch
          }
        }
      },
      children: [
        // Title
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: "ELABS — Advanced Laboratory Inventory Management & LMS Platform",
              bold: true,
              size: 25, // 12.5pt
              color: "1E3A8A"
            })
          ]
        }),

        // Meta Header
        new Paragraph({
          spacing: { after: 30 },
          children: [
            new TextRun({ text: "Department of Electrical & Information Engineering, Faculty of Engineering, University of Ruhuna\n", size: 16, bold: true, color: "374151" }),
            new TextRun({ text: "Team Members: ", bold: true, size: 15 }),
            new TextRun({ text: "Harsha (Frontend)  •  Priyan (Backend)  •  Pamudu (Vision & Hardware)  •  Imal (AI Specialist)    |    ", size: 15 }),
            new TextRun({ text: "Submission Deadline: ", bold: true, size: 15 }),
            new TextRun({ text: "30 September 2026", size: 15, color: "B91C1C", bold: true })
          ]
        }),

        // Divider
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "2563EB" } },
          spacing: { after: 70 }
        }),

        // SPRINT 1
        createSprintHeading("Sprint 1: Inventory Architecture, Normalized Schema & Core Authentication"),
        createRoleBullet("Frontend (Harsha)", "Set up Next.js App Router monorepo (`packages/web`); created UI design system, technician/student dashboard layouts, and inventory navigation framework."),
        createRoleBullet("Backend (Priyan)", "Developed Express TypeScript API (`packages/api`); architected MySQL schema with normalized inventory tables (`inventory_items`, `borrow_transactions`, `labs`); implemented JWT auth and RBAC roles."),
        createRoleBullet("Vision & Hardware (Pamudu)", "Configured OpenCV image processing pipeline for optical barcode/tag frame ingestion; calibrated camera resolution and lighting normalization for laboratory benches."),
        createRoleBullet("AI Engine (Imal)", "Configured FastAPI service (`packages/ai`); built SQLAlchemy connection pooling to MySQL inventory tables; established baseline local LLM inference client via Ollama."),

        // SPRINT 2
        createSprintHeading("Sprint 2: Core Equipment Registry & LMS Academic Integration"),
        createRoleBullet("Frontend (Harsha)", "Built Equipment Catalog interface with category filters (Measurement, Power Supplies, Oscilloscopes); created LMS Course Hub for lab practical module registration."),
        createRoleBullet("Backend (Priyan)", "Implemented RESTful inventory endpoints (`/inventory/items`); developed barcode query routing (`/items/barcode/:tag`) and category-based item filtering per laboratory."),
        createRoleBullet("Vision & Hardware (Pamudu)", "Built real-time 1D/2D optical barcode and QR tag reader for equipment labels (`elabs_tag`); tested tag recognition under varying laboratory lighting conditions."),
        createRoleBullet("AI Engine (Imal)", "Created deterministic regex intent classifier and parameterized SQL query generator for zero-hallucination equipment availability checks and lab schedule queries."),

        // SPRINT 3
        createSprintHeading("Sprint 3: Borrow Workflows, Real-Time Messaging & Assessment Engine"),
        createRoleBullet("Frontend (Harsha)", "Developed initial check-out modal, interactive student practical checklists, and Socket.IO chat interface (`/messages`) between students and lab technicians."),
        createRoleBullet("Backend (Priyan)", "Built transactional borrow request endpoints; added Socket.IO real-time event broadcaster for inventory status updates; implemented assessment grading and report uploads."),
        createRoleBullet("Vision & Hardware (Pamudu)", "Integrated ByteTrack tracking for lab entry/exit monitoring; deployed YOLOv8-pose skeleton estimation for laboratory area presence and technician counter activity."),
        createRoleBullet("AI Engine (Imal)", "Built RAG (Retrieval-Augmented Generation) document indexing pipeline; vectorized PDF equipment manuals and experiment procedure guides for semantic retrieval."),

        // SPRINT 4
        createSprintHeading("Sprint 4: Smart Inventory Hub, Barcode Automation & Cloud Hosting Deployment"),
        createRoleBullet("Frontend (Harsha)", "Deployed Smart Inventory Hub (`/inventory`) with status badges (Available, Borrowed, Maintenance, Overdue), technician issue-station with instant student index lookup (`EG/2022/xxxx`), in-browser Barcode/QR camera scanner (`html5-qrcode`), and production Cloudflare Edge Network HTTPS deployment with zero Mixed Content issues."),
        createRoleBullet("Backend (Priyan)", "Engineered atomic inventory transaction engine (multi-item check-outs, returns, state transitions) with real-time Socket.IO alerts; implemented full `audit_logs`; deployed production cloud MySQL on TiDB Cloud Serverless with TLS/SSL encryption and containerized API gateway."),
        createRoleBullet("Vision & Hardware (Pamudu)", "Built optical equipment verification station: automated scanning of equipment barcode tags (`elabs_tag`), optical check of returned instrument presence, and laboratory benchtop equipment tracking."),
        createRoleBullet("AI Engine (Imal)", "Delivered natural language inventory assistant with dynamic student context injection (active borrows, due dates, course practicals); built hybrid RAG engine retrieving equipment operating specs and calibration procedures from manuals with SSE token streaming."),

        // Footer Note
        new Paragraph({
          spacing: { before: 50 },
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: "E5E7EB" } },
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: "ELABS Monorepo Project  •  Department of Electrical & Information Engineering  •  Single-Page Summary Document", size: 14, color: "6B7280", italics: true })
          ]
        })
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(__dirname, "../../GroupNumber_Summary.docx"), buffer);
  console.log("Successfully created GroupNumber_Summary.docx");
}

function createSprintHeading(title) {
  return new Paragraph({
    spacing: { before: 65, after: 20 },
    shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
    children: [
      new TextRun({ text: "  " + title, bold: true, size: 17, color: "1E40AF" })
    ]
  });
}

function createRoleBullet(role, text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 14 },
    children: [
      new TextRun({ text: role + ": ", bold: true, size: 15, color: "111827" }),
      new TextRun({ text: text, size: 15, color: "374151" })
    ]
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT 2: GroupNumber_Video_Script.docx (Full Presentation Guide)
// ─────────────────────────────────────────────────────────────────────────────
async function createVideoScriptDoc() {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 900, bottom: 900, left: 900, right: 900 }
        }
      },
      children: [
        // Title
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: "ELABS — Sprint 04 Video Presentation Script & Tech Stack Guide", bold: true, size: 34, color: "1E3A8A" })
          ]
        }),

        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Project: ", bold: true, size: 20 }),
            new TextRun({ text: "Advanced Laboratory Inventory Management System (EIE, University of Ruhuna)\n", size: 20 }),
            new TextRun({ text: "Submission Target Video File: ", bold: true, size: 20 }),
            new TextRun({ text: "GroupNumber_Video.mp4    |    ", size: 20, color: "1D4ED8", bold: true }),
            new TextRun({ text: "Submission Deadline: ", bold: true, size: 20 }),
            new TextRun({ text: "30 September 2026\n", size: 20, bold: true, color: "DC2626" })
          ]
        }),

        // Critical Submission Rules Box
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: "FEF2F2" },
                  margins: { top: 130, bottom: 130, left: 160, right: 160 },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 12, color: "DC2626" },
                    bottom: { style: BorderStyle.SINGLE, size: 12, color: "DC2626" },
                    left: { style: BorderStyle.SINGLE, size: 24, color: "DC2626" },
                    right: { style: BorderStyle.SINGLE, size: 12, color: "DC2626" }
                  },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: "CRITICAL SUBMISSION GUIDELINES:\n", bold: true, size: 20, color: "991B1B" }),
                        new TextRun({ text: "1. Strictly Sprint 04 Features Only: ", bold: true, size: 17, color: "7F1D1D" }),
                        new TextRun({ text: "Do not explain past sprints. Only present completed Sprint 4 tasks (Smart Inventory & Cloud Deployment).\n", size: 17 }),
                        new TextRun({ text: "2. Maximum Time Limit: 5 Minutes: ", bold: true, size: 17, color: "7F1D1D" }),
                        new TextRun({ text: "Exceeding 5:00 results in marks reduced to zero. (Target duration: 4:35 — 25-second buffer).\n", size: 17 }),
                        new TextRun({ text: "3. Camera Mandatory: ", bold: true, size: 17, color: "7F1D1D" }),
                        new TextRun({ text: "All 4 members must have their webcam TURNED ON while presenting their section.\n", size: 17 }),
                        new TextRun({ text: "4. Inventory & Cloud Focus: ", bold: true, size: 17, color: "7F1D1D" }),
                        new TextRun({ text: "Center presentation on laboratory inventory workflows, real-time tracking, AI queries, and cloud hosting.", size: 17 })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        }),

        new Paragraph({ spacing: { before: 160, after: 70 } }),

        // Timing Table
        new Paragraph({
          children: [
            new TextRun({ text: "Presentation Timing & Agenda Breakdown", bold: true, size: 24, color: "1E40AF" })
          ]
        }),

        createTimingTable(),

        new Paragraph({ spacing: { before: 180, after: 70 } }),

        // Tech Stack Quick Reference Table
        new Paragraph({
          children: [
            new TextRun({ text: "Production Tech Stack Reference (What to Mention on Video)", bold: true, size: 24, color: "1E40AF" })
          ]
        }),

        createTechStackTable(),

        new Paragraph({ spacing: { before: 200 } }),

        // Segment 1
        createSpeakerSection(
          "Segment 1: Harsha – Frontend Lead (0:00 – 1:10)",
          "1m 10s",
          "Webcam ON + Screen Share of Web Portal (https://... or http://localhost:3000/inventory)",
          [
            { time: "[0:00 – 0:15]", type: "Introduction & Cloud Deployment", text: "\"Hello everyone. I am Harsha, Frontend Lead for ELABS. In Sprint 4, our primary goal was delivering the complete Smart Inventory Management Hub and deploying our platform to the cloud with edge HTTPS acceleration, empowering lab technicians and students with seamless equipment tracking, barcode scanning, and instant checkout workflows.\"" },
            { time: "[0:15 – 0:45]", type: "Demo: Equipment Directory & Status Badges", text: "(Action: Navigate through /inventory, filter by category: Measurement, Oscilloscopes, Power Supplies, point out status pills: Available, Borrowed, Maintenance, Overdue).\n\"Built with Next.js 14 App Router, TypeScript, and Tailwind CSS, our Inventory Portal provides technicians and students with a live catalog of all departmental lab equipment. Each item displays real-time status badges—such as Available, Borrowed, Maintenance, or Overdue—along with its unique ELABS tag, laboratory location, and condition notes. We have implemented reactive search and category filters for instant navigation across our undergraduate and research labs.\"" },
            { time: "[0:45 – 1:05]", type: "Demo: Issue Station, Barcode Scanner & Cloud Edge", text: "(Action: Click 'Issue / Borrow Item'. Type index number 'EG/2022/5401'. Show student name auto-resolve. Click 'Scan Barcode' webcam scanner. Highlight secure HTTPS).\n\"For check-outs, we engineered our rapid Issue Station. The technician enters a student index number—such as EG/2022/5401—and the system automatically verifies their academic eligibility. Using our integrated in-browser camera scanner powered by HTML5-QRCode, technicians can optically scan the equipment's barcode tag to immediately populate the checkout form. Furthermore, our entire frontend is deployed via Cloudflare Edge Network with secure HTTPS and Next.js reverse proxy rewrites, guaranteeing zero mixed-content issues and sub-second global latency.\"" },
            { time: "[1:05 – 1:10]", type: "Handover", text: "\"Now, Priyan will explain our backend transaction engine, audit logging, and cloud database architecture.\"" }
          ]
        ),

        // Segment 2
        createSpeakerSection(
          "Segment 2: Priyan – Backend Lead (1:10 – 2:15)",
          "1m 05s",
          "Webcam ON + Screen Share of API Code & TiDB Cloud Database (packages/api)",
          [
            { time: "[1:10 – 1:25]", type: "Introduction & Cloud Architecture", text: "\"Thank you Harsha. I am Priyan, Backend Lead. In Sprint 4, I focused on engineering an enterprise-grade inventory transaction pipeline, automated overdue tracking, and migrating our persistence layer to TiDB Cloud Serverless MySQL with full TLS/SSL encryption.\"" },
            { time: "[1:25 – 1:50]", type: "Demo: Atomic Transactions & State Flow", text: "(Action: Highlight checkout & return routes in inventory.routes.ts, show TiDB connection pooling and state transitions).\n\"Our backend is built on Node.js, Express, and TypeScript, containerized with Docker. When an item is checked out or returned, our API executes atomic SQL transactions using connection pooling directly against our TiDB Cloud Serverless MySQL cluster. This ensures that item statuses transition reliably between Available and Borrowed without race conditions. We built automated index verification via the /inventory/student-lookup endpoint and barcode routing via /items/barcode/:tag to validate requests in milliseconds.\"" },
            { time: "[1:50 – 2:10]", type: "Demo: Overdue Engine, WebSockets & Audit Trail", text: "(Action: Show overdue calculation logic, Socket.IO broadcaster, and audit_logs table schema).\n\"Additionally, in Sprint 4 we built an active overdue monitoring engine. If a student fails to return borrowed instruments by the due timestamp, our system flags the transaction as OVERDUE and broadcasts real-time Socket.IO alerts to lab technicians. Every checkout, return, and status change is immutably recorded in our audit_logs table, storing technician IDs, student indexes, and timestamped condition reports for complete department accountability.\"" },
            { time: "[2:10 – 2:15]", type: "Handover", text: "\"Next, Pamudu will present how Computer Vision reinforces equipment tracking.\"" }
          ]
        ),

        // Segment 3
        createSpeakerSection(
          "Segment 3: Pamudu – Vision & Hardware (2:15 – 3:25)",
          "1m 10s",
          "Webcam ON + Screen Share of Vision Tag Detection & Benchtop Tracking (packages/vision)",
          [
            { time: "[2:15 – 2:30]", type: "Introduction & Role", text: "\"Thank you Priyan. I am Pamudu, in charge of Computer Vision and Hardware Tracking. In Sprint 4, our vision system was integrated directly with the inventory ecosystem to provide optical tag verification and benchtop equipment presence tracking.\"" },
            { time: "[2:30 – 2:55]", type: "Demo: Optical Barcode & QR Recognition", text: "(Action: Show video or live camera detecting barcode/QR tag ELABS-PS-0001 with bounding boxes).\n\"To accelerate inventory check-ins and returns at the technician counter, we deployed a high-speed optical tag detection pipeline implemented in Python with OpenCV and NumPy. Utilizing adaptive thresholding and contour analysis, our system captures and decodes ELABS barcode and QR tags from live camera streams, even under low-contrast benchtop lighting, directly verifying instrument serial numbers against our inventory database.\"" },
            { time: "[2:55 – 3:20]", type: "Demo: Benchtop Equipment Presence", text: "(Action: Show equipment tracking pipeline verifying physical instrument presence).\n\"Furthermore, for high-value laboratory assets such as oscilloscopes and spectrum analyzers, our vision pipeline utilizes ByteTrack and YOLO tracking to monitor benchtop presence. When students bring items back to the return station, camera frames capture the visual condition of the device and cross-reference its return state with the database, ensuring no lab instruments leave the premises unregistered.\"" },
            { time: "[3:20 – 3:25]", type: "Handover", text: "\"Now, Imal will demonstrate our conversational AI inventory assistant.\"" }
          ]
        ),

        // Segment 4
        createSpeakerSection(
          "Segment 4: Imal – AI Specialist (3:25 – 4:30)",
          "1m 05s",
          "Webcam ON + Screen Share of AI Assistant (http://localhost:3000/ai/assistant)",
          [
            { time: "[3:25 – 3:40]", type: "Introduction & Overview", text: "\"Thank you Pamudu. I am Imal, AI Specialist. In Sprint 4, we delivered an intelligent conversational assistant tailored specifically for laboratory inventory lookups and equipment manual retrieval.\"" },
            { time: "[3:40 – 4:05]", type: "Demo: Deterministic Inventory SQL", text: "(Action: Ask assistant: 'How many digital multimeters are available in Power Systems Lab?' and 'Show items borrowed by student EG/2022/5401').\n\"Built with Python, FastAPI, and SQLAlchemy, our AI engine ensures 100% factual accuracy using deterministic intent routing. When a student or lecturer asks about instrument availability or active loans, our backend bypasses LLM hallucinations by dynamically generating and executing parameterized SQL queries on our live inventory tables. It instantly returns exact quantities, model numbers, and lab locations.\"" },
            { time: "[4:05 – 4:25]", type: "Demo: Equipment Manual RAG & Context", text: "(Action: Ask: 'How do I calibrate the UT61E multimeter?' Show RAG manual response and student borrowed context).\n\"In addition, we deployed a RAG pipeline utilizing ChromaDB vector embeddings and local LLM inference via Ollama. When students ask technical questions about operating borrowed equipment, the assistant retrieves precise operating guidelines from indexed PDF equipment manuals. Furthermore, the system dynamically injects the student's active borrowed items into the prompt context, with responses streamed in real time via Server-Sent Events.\"" },
            { time: "[4:25 – 4:30]", type: "Handover", text: "\"Harsha will now conclude our presentation.\"" }
          ]
        ),

        // Segment 5
        createSpeakerSection(
          "Segment 5: Group Wrap-Up (4:30 – 4:38)",
          "0m 08s",
          "Webcam ON for ALL 4 Members on camera simultaneously",
          [
            { time: "[4:30 – 4:38]", type: "Closing Statement (Harsha & All)", text: "\"In Sprint 4, ELABS successfully delivered a comprehensive, automated laboratory inventory management platform—integrating our web portal, transactional backend, optical hardware tracking, intelligent AI assistant, and production cloud hosting. Thank you!\"" }
          ]
        ),

        new Paragraph({ spacing: { before: 180 } }),

        // Final Checklist
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: "F0FDF4" },
                  margins: { top: 120, bottom: 120, left: 160, right: 160 },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 10, color: "16A34A" },
                    bottom: { style: BorderStyle.SINGLE, size: 10, color: "16A34A" },
                    left: { style: BorderStyle.SINGLE, size: 20, color: "16A34A" },
                    right: { style: BorderStyle.SINGLE, size: 10, color: "16A34A" }
                  },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: "SUBMISSION RECORDING CHECKLIST:\n", bold: true, size: 18, color: "166534" }),
                        new TextRun({ text: "[  ] Timer check: Stop recording BEFORE 5:00 (Target 4:30 – 4:38)\n", size: 16 }),
                        new TextRun({ text: "[  ] Facecam check: Harsha, Priyan, Pamudu, and Imal have webcams ON\n", size: 16 }),
                        new TextRun({ text: "[  ] Rename video file to: GroupNumber_Video.mp4\n", size: 16 }),
                        new TextRun({ text: "[  ] Rename summary document to: GroupNumber_Summary.docx / .pdf\n", size: 16 }),
                        new TextRun({ text: "[  ] Submit before deadline: 30 September 2026", size: 16, bold: true })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(__dirname, "../../GroupNumber_Video_Script.docx"), buffer);
  console.log("Successfully created GroupNumber_Video_Script.docx");
}

function createTimingTable() {
  const headers = ["Speaker", "Role", "Sprint 4 Focus & Highlights", "Start", "End", "Duration"];
  const rows = [
    ["Harsha", "Frontend Lead", "Smart Inventory Hub, Barcode Scanner & Cloudflare Edge Deployment", "0:00", "1:10", "1m 10s"],
    ["Priyan", "Backend Lead", "Atomic Transactions, TiDB Cloud Serverless MySQL & Audit Trail", "1:10", "2:15", "1m 05s"],
    ["Pamudu", "Vision & Hardware", "Optical Tag Scanning & Benchtop Equipment Tracking", "2:15", "3:25", "1m 10s"],
    ["Imal", "AI Specialist", "Natural Language Inventory Queries & Manual RAG", "3:25", "4:30", "1m 05s"],
    ["All Team", "All Members", "Group Wrap-up & Production Deployment Sign-off", "4:30", "4:38", "0m 08s"]
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(h => new TableCell({
          shading: { type: ShadingType.CLEAR, fill: "1E3A8A" },
          margins: { top: 75, bottom: 75, left: 90, right: 90 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 15 })] })]
        }))
      }),
      ...rows.map(r => new TableRow({
        children: r.map((cell, idx) => new TableCell({
          shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? "FFFFFF" : "F9FAFB" },
          margins: { top: 65, bottom: 65, left: 80, right: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 14, bold: idx === 0 })] })]
        }))
      }))
    ]
  });
}

function createTechStackTable() {
  const headers = ["Layer / Domain", "Lead Presenter", "Core Technologies & Frameworks", "Key Video Keywords"];
  const rows = [
    [
      "Frontend & Edge", 
      "Harsha", 
      "Next.js 14 (App Router), TypeScript, Tailwind CSS, HTML5-QRCode, Cloudflare Edge Tunnel", 
      "Edge HTTPS, Zero Mixed Content, Reactive UI, In-Browser Camera Scanner"
    ],
    [
      "Backend & Cloud DB", 
      "Priyan", 
      "Node.js, Express, TypeScript, TiDB Cloud Serverless (MySQL 8.0), Socket.IO, Docker", 
      "Atomic Transactions, TLS/SSL Connection Pooling, Overdue Alerts, Immutable Audit Logs"
    ],
    [
      "Vision & Hardware", 
      "Pamudu", 
      "Python 3.10, OpenCV, NumPy, PyZbar, ByteTrack, YOLOv8-pose", 
      "Adaptive Thresholding, 1D/2D Tag Decoding, Benchtop Presence Verification"
    ],
    [
      "AI & Automation", 
      "Imal", 
      "Python, FastAPI, SQLAlchemy, ChromaDB, LangChain, Ollama (Local LLM), SSE", 
      "Zero-Hallucination Parameterized SQL, Hybrid RAG, Dynamic Student Context"
    ]
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(h => new TableCell({
          shading: { type: ShadingType.CLEAR, fill: "0F766E" },
          margins: { top: 75, bottom: 75, left: 90, right: 90 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 15 })] })]
        }))
      }),
      ...rows.map(r => new TableRow({
        children: r.map((cell, idx) => new TableCell({
          shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? "FFFFFF" : "F0FDFA" },
          margins: { top: 65, bottom: 65, left: 80, right: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 14, bold: idx === 0 || idx === 1 })] })]
        }))
      }))
    ]
  });
}

function createSpeakerSection(title, duration, visualInstructions, points) {
  return new Paragraph({
    spacing: { before: 170, after: 50 },
    children: [
      new TextRun({ text: title, bold: true, size: 21, color: "1E40AF" }),
      new TextRun({ text: `  [Duration: ${duration}]\n`, bold: true, size: 17, color: "047857" }),
      new TextRun({ text: `Camera & Visual: `, bold: true, size: 15, color: "4B5563" }),
      new TextRun({ text: `${visualInstructions}\n\n`, italics: true, size: 15, color: "374151" }),
      ...points.flatMap(p => [
        new TextRun({ text: `${p.time} — ${p.type}:\n`, bold: true, size: 16, color: "1E3A8A" }),
        new TextRun({ text: `${p.text}\n\n`, size: 15, color: "111827" })
      ])
    ]
  });
}

async function run() {
  await createSummaryDoc();
  await createVideoScriptDoc();
}

run().catch(console.error);
