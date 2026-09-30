# ELABS - Sprint 04 Video Presentation Script & Tech Stack Guide
**Project Title:** Advanced Laboratory Inventory Management System (EIE, University of Ruhuna)  
**Video File Name Target:** `GroupNumber_Video.mp4`  
**Strict Maximum Time Limit:** 5 Minutes (*Strict penalty: exceeding 5:00 results in marks reduced to zero*)  
**Target Video Duration:** **4 Minutes 35 Seconds** (Leaves a safe 25-second buffer)  
**Mandatory Rules:** 
1. Only **Sprint 04** inventory management and cloud deployment tasks must be presented.
2. All 4 members must present with their **cameras turned ON** during their part.

---

## Presentation Timing Breakdown

| Speaker | Role | Sprint 4 Focus & Highlights | Start Time | End Time | Duration |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Harsha** | Frontend Lead | Smart Inventory Hub, Barcode Scanner & Cloudflare Edge Deployment | `0:00` | `1:10` | 1m 10s |
| **Priyan** | Backend Lead | Atomic Transactions, TiDB Cloud Serverless MySQL & Audit Trail | `1:10` | `2:15` | 1m 05s |
| **Pamudu** | Vision & Hardware | Optical Tag Scanning & Benchtop Equipment Tracking | `2:15` | `3:25` | 1m 10s |
| **Imal** | AI Specialist | Natural Language Inventory Queries & Manual RAG | `3:25` | `4:30` | 1m 05s |
| **All Team** | Closing | Group Sign-off & Production Deployment Wrap-up | `4:30` | `4:38` | 0m 08s |

---

## Production Tech Stack Reference (What to Mention on Video)

| Layer / Domain | Lead Presenter | Core Technologies & Frameworks | Key Technical Keywords to Say on Camera |
| :--- | :--- | :--- | :--- |
| **Frontend & Edge** | **Harsha** | Next.js 14 (App Router), TypeScript, Tailwind CSS, HTML5-QRCode, Cloudflare Edge Tunnel | Edge HTTPS, Zero Mixed Content, Reactive UI, In-Browser Camera Scanner, Reverse Proxy Rewrites |
| **Backend & Cloud DB** | **Priyan** | Node.js, Express, TypeScript, TiDB Cloud Serverless (MySQL 8.0), Socket.IO, Docker | Atomic Transactions, TLS/SSL Connection Pooling, Overdue WebSockets, Immutable Audit Logs, Zero Race Conditions |
| **Vision & Hardware** | **Pamudu** | Python 3.10, OpenCV, NumPy, PyZbar, ByteTrack, YOLOv8-pose | Adaptive Thresholding, 1D/2D Tag Decoding, Optical Return Verification, Benchtop Presence Tracking |
| **AI & Automation** | **Imal** | Python, FastAPI, SQLAlchemy, ChromaDB, LangChain, Ollama (Local LLM), SSE | Zero-Hallucination Parameterized SQL, Hybrid RAG, Dynamic Student Context Injection, Token Streaming |

---

## Detailed Script & On-Screen Demonstration

### Segment 1: Harsha – Frontend Lead (0:00 – 1:10)
**Camera Status:** ON (Harsha facecam visible + Screen Share)  
**Screen Display:** Browser on `http://localhost:3000/inventory` or live HTTPS edge domain

* **[0:00 – 0:15] Introduction & Cloud Deployment:**
  > *"Hello everyone. I am Harsha, Frontend Lead for ELABS. In Sprint 4, our primary goal was delivering the complete Smart Inventory Management Hub and deploying our platform to the cloud with edge HTTPS acceleration, empowering lab technicians and students with seamless equipment tracking, barcode scanning, and instant checkout workflows."*

* **[0:15 – 0:45] Demo – Equipment Directory & Status Badges:**
  *(Action: Scroll through the inventory page showing category filters: Measurement, Oscilloscopes, Power Supplies. Point out status pills: Available, Borrowed, Maintenance, Overdue).*
  > *"Built with Next.js 14 App Router, TypeScript, and Tailwind CSS, our Inventory Portal provides technicians and students with a live catalog of all departmental lab equipment. Each item displays real-time status badges—such as Available, Borrowed, Maintenance, or Overdue—along with its unique ELABS tag, laboratory location, and condition notes. We have implemented reactive search and category filters for instant navigation across our undergraduate and research labs."*

* **[0:45 – 1:05] Demo – Issue Station, Barcode Scanner & Cloud Edge:**
  *(Action: Click 'Issue / Borrow Item'. Type student index number `EG/2022/5401`. Show the student's name auto-populate. Click 'Scan Barcode' webcam scanner. Highlight the secure HTTPS lock).*
  > *"For check-outs, we engineered our rapid Issue Station. The technician enters a student index number—such as EG/2022/5401—and the system automatically verifies their academic eligibility. Using our integrated in-browser camera scanner powered by HTML5-QRCode, technicians can optically scan the equipment's barcode tag to immediately populate the checkout form. Furthermore, our entire frontend is deployed via Cloudflare Edge Network with secure HTTPS and Next.js reverse proxy rewrites, guaranteeing zero mixed-content issues and sub-second global latency."*

* **[1:05 – 1:10] Handover:**
  > *"Now, Priyan will explain our backend transaction engine, audit logging, and cloud database architecture."*

---

### Segment 2: Priyan – Backend Lead (1:10 – 2:15)
**Camera Status:** ON (Priyan facecam visible + Screen Share)  
**Screen Display:** VS Code / Terminal showing `packages/api/src/modules/inventory/inventory.routes.ts` & TiDB Cloud database connection

* **[1:10 – 1:25] Introduction & Cloud Architecture:**
  > *"Thank you Harsha. I am Priyan, Backend Lead. In Sprint 4, I focused on engineering an enterprise-grade inventory transaction pipeline, automated overdue tracking, and migrating our persistence layer to TiDB Cloud Serverless MySQL with full TLS/SSL encryption."*

* **[1:25 – 1:50] Demo – Atomic Transactions & State Flow:**
  *(Action: Highlight checkout and return routes in `inventory.routes.ts`, show TiDB connection pooling and state transitions).*
  > *"Our backend is built on Node.js, Express, and TypeScript, containerized with Docker. When an item is checked out or returned, our API executes atomic SQL transactions using connection pooling directly against our TiDB Cloud Serverless MySQL cluster. This ensures that item statuses transition reliably between Available and Borrowed without race conditions. We built automated index verification via the `/inventory/student-lookup` endpoint and barcode routing via `/items/barcode/:tag` to validate requests in milliseconds."*

* **[1:50 – 2:10] Demo – Overdue Engine, WebSockets & Audit Trail:**
  *(Action: Show overdue calculation logic, Socket.IO broadcaster, and `audit_logs` table schema).*
  > *"Additionally, in Sprint 4 we built an active overdue monitoring engine. If a student fails to return borrowed instruments by the due timestamp, our system flags the transaction as OVERDUE and broadcasts real-time Socket.IO alerts to lab technicians. Every checkout, return, and status change is immutably recorded in our `audit_logs` table, storing technician IDs, student indexes, and timestamped condition reports for complete department accountability."*

* **[2:10 – 2:15] Handover:**
  > *"Next, Pamudu will present how Computer Vision reinforces equipment tracking."*

---

### Segment 3: Pamudu – Computer Vision & Hardware (2:15 – 3:25)
**Camera Status:** ON (Pamudu facecam visible + Screen Share)  
**Screen Display:** Terminal / Python window showing `yolo_analyzer.py` / barcode tag detection on video

* **[2:15 – 2:30] Introduction & Equipment Vision Role:**
  > *"Thank you Priyan. I am Pamudu, in charge of Computer Vision and Hardware Tracking. In Sprint 4, our vision system was integrated directly with the inventory ecosystem to provide optical tag verification and benchtop equipment presence tracking."*

* **[2:30 – 2:55] Demo – Optical Barcode & QR Tag Detection:**
  *(Action: Demonstrate the camera feed detecting equipment barcode tags like `ELABS-PS-0001` or `ELABS-EL-0001` with bounding boxes).*
  > *"To accelerate inventory check-ins and returns at the technician counter, we deployed a high-speed optical tag detection pipeline implemented in Python with OpenCV and NumPy. Utilizing adaptive thresholding and contour analysis, our system captures and decodes ELABS barcode and QR tags from live camera streams, even under low-contrast benchtop lighting, directly verifying instrument serial numbers against our inventory database."*

* **[2:55 – 3:20] Demo – Benchtop Equipment Tracking & Return Verification:**
  *(Action: Show the equipment tracking pipeline verifying physical instrument presence).*
  > *"Furthermore, for high-value laboratory assets such as oscilloscopes and spectrum analyzers, our vision pipeline utilizes ByteTrack and YOLO tracking to monitor benchtop presence. When students bring items back to the return station, camera frames capture the visual condition of the device and cross-reference its return state with the database, ensuring no lab instruments leave the premises unregistered."*

* **[3:20 – 3:25] Handover:**
  > *"Now, Imal will demonstrate our conversational AI inventory assistant."*

---

### Segment 4: Imal – AI Specialist (3:25 – 4:30)
**Camera Status:** ON (Imal facecam visible + Screen Share)  
**Screen Display:** Browser on `http://localhost:3000/ai/assistant` showing natural language inventory queries

* **[3:25 – 3:40] Introduction & Conversational Inventory AI:**
  > *"Thank you Pamudu. I am Imal, AI Specialist. In Sprint 4, we delivered an intelligent conversational assistant tailored specifically for laboratory inventory lookups and equipment manual retrieval."*

* **[3:40 – 4:05] Demo – Zero-Hallucination Inventory SQL Queries:**
  *(Action: Type into the assistant: 'How many digital multimeters are available in Power Systems Lab?' and 'Show items borrowed by student EG/2022/5401'. Show instant, accurate answer).*
  > *"Built with Python, FastAPI, and SQLAlchemy, our AI engine ensures 100% factual accuracy using deterministic intent routing. When a student or lecturer asks about instrument availability or active loans, our backend bypasses LLM hallucinations by dynamically generating and executing parameterized SQL queries on our live inventory tables. It instantly returns exact quantities, model numbers, and lab locations."*

* **[4:05 – 4:25] Demo – Equipment Manual RAG & Student Context Injection:**
  *(Action: Ask: 'How do I calibrate the UT61E multimeter?' Show RAG manual excerpt and student context).*
  > *"In addition, we deployed a RAG pipeline utilizing ChromaDB vector embeddings and local LLM inference via Ollama. When students ask technical questions about operating borrowed equipment, the assistant retrieves precise operating guidelines from indexed PDF equipment manuals. Furthermore, the system dynamically injects the student's active borrowed items into the prompt context, with responses streamed in real time via Server-Sent Events."*

* **[4:25 – 4:30] Handover to Group:**
  > *"Harsha will now conclude our presentation."*

---

### Segment 5: Group Wrap-Up (4:30 – 4:38)
**Camera Status:** ON (All 4 members on camera simultaneously)

* **[4:30 – 4:38] Harsha & All Members:**
  > *"In Sprint 4, ELABS successfully delivered a comprehensive, automated laboratory inventory management platform—integrating our web portal, transactional backend, optical hardware tracking, intelligent AI assistant, and production cloud hosting. Thank you!"*

---

## Final Verification Checklist Before Recording:
- [ ] **Strict Time Limit:** Ensure total recorded time is strictly **under 5:00** (Ideal: 4:30 – 4:38).
- [ ] **Camera:** All 4 members (Harsha, Priyan, Pamudu, Imal) have their webcams turned **ON** during their speaking segments.
- [ ] **Inventory & Cloud Focus:** Confirm the presentation focuses exclusively on **Sprint 4 Inventory Management & Cloud Deployment** tasks.
- [ ] **Naming Conventions:**
  - Video: `GroupNumber_Video.mp4` (e.g., `Group05_Video.mp4`)
  - Document: `GroupNumber_Summary.pdf` (e.g., `Group05_Summary.pdf`)
