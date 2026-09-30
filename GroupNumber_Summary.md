# ELABS - Advanced Laboratory Inventory Management & LMS Platform
**Course / Department:** Department of Electrical & Information Engineering, University of Ruhuna  
**Core Domain:** Advanced Laboratory Equipment Inventory Management, Tracking & Academic Operations  
**Team Members:** Harsha (Frontend), Priyan (Backend), Pamudu (Vision & Hardware Tracking), Imal (AI Specialist)  
**Submission Deadline:** 30 September 2026

---

### Sprint 1: Inventory Architecture, Normalized Schema & Core Authentication
* **Frontend (Harsha):** Set up Next.js App Router monorepo (`packages/web`); created UI design system, technician/student dashboard layouts, and inventory navigation framework.
* **Backend (Priyan):** Developed Express TypeScript API (`packages/api`); architected MySQL schema with normalized inventory tables (`inventory_items`, `borrow_transactions`, `labs`); implemented JWT auth and RBAC roles.
* **Vision & Hardware (Pamudu):** Configured OpenCV image processing pipeline for optical barcode/tag frame ingestion; calibrated camera resolution and lighting normalization for laboratory benches.
* **AI Engine (Imal):** Configured FastAPI service (`packages/ai`); built SQLAlchemy connection pooling to MySQL inventory tables; established baseline local LLM inference client via Ollama.

---

### Sprint 2: Core Equipment Registry & LMS Academic Integration
* **Frontend (Harsha):** Built Equipment Catalog interface with category filters (Measurement, Power Supplies, Oscilloscopes); created LMS Course Hub for lab practical module registration.
* **Backend (Priyan):** Implemented RESTful inventory endpoints (`/inventory/items`); developed barcode query routing (`/items/barcode/:tag`) and category-based item filtering per laboratory.
* **Vision & Hardware (Pamudu):** Built real-time 1D/2D optical barcode and QR tag reader for equipment labels (`elabs_tag`); tested tag recognition under varying laboratory lighting conditions.
* **AI Engine (Imal):** Created deterministic regex intent classifier and parameterized SQL query generator for zero-hallucination equipment availability checks and lab schedule queries.

---

### Sprint 3: Borrow Workflows, Real-Time Messaging & Assessment Engine
* **Frontend (Harsha):** Developed initial check-out modal, interactive student practical checklists, and Socket.IO chat interface (`/messages`) between students and lab technicians.
* **Backend (Priyan):** Built transactional borrow request endpoints; added Socket.IO real-time event broadcaster for inventory status updates; implemented assessment grading and report uploads.
* **Vision & Hardware (Pamudu):** Integrated ByteTrack tracking for lab entry/exit monitoring; deployed YOLOv8-pose skeleton estimation for laboratory area presence and technician counter activity.
* **AI Engine (Imal):** Built RAG (Retrieval-Augmented Generation) document indexing pipeline; vectorized PDF equipment manuals and experiment procedure guides for semantic retrieval.

---

### Sprint 4: Smart Inventory Hub, Barcode Automation & Cloud Hosting Deployment
* **Frontend (Harsha):** Deployed Smart Inventory Hub (`/inventory`) with status badges (Available, Borrowed, Maintenance, Overdue), technician issue-station with instant student index lookup (`EG/2022/xxxx`), in-browser Barcode/QR camera scanner (`html5-qrcode`), and production Cloudflare Edge Network HTTPS deployment with zero Mixed Content issues.
* **Backend (Priyan):** Engineered atomic inventory transaction engine (multi-item check-outs, returns, state transitions) with real-time Socket.IO alerts; implemented full `audit_logs`; deployed production cloud MySQL on TiDB Cloud Serverless with TLS/SSL encryption and containerized API gateway.
* **Vision & Hardware (Pamudu):** Built optical equipment verification station: automated scanning of equipment barcode tags (`elabs_tag`), optical check of returned instrument presence, and laboratory benchtop equipment tracking.
* **AI Engine (Imal):** Delivered natural language inventory assistant with dynamic student context injection (active borrows, due dates, course practicals); built hybrid RAG engine retrieving equipment operating specs and calibration procedures from manuals with SSE token streaming.
