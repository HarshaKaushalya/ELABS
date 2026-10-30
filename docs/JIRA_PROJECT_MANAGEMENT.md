# ELABS — JIRA Agile Project Management & Sprint Tracking

**Project Name:** Smart Inventory Management System for DEIE Laboratories (ELABS)  
**Project Key:** `ELAB`  
**Board Type:** Scrum Agile Board  
**Department:** Department of Electrical & Information Engineering, Faculty of Engineering, University of Ruhuna  
**Client / Product Owner:** Ms. Sithara Madhubhashini (Technical Officer / Lab Coordinator, DEIE)  
**Scrum Master:** Weerasinghe T.H.K (`EG/2022/5401`)  
**Estimation Unit:** Story Points (Fibonacci Scale: 1, 2, 3, 5, 8, 13)  
**Total Tracked Story Points:** 282 SP  
* **Completed (Delivered & Verified):** 211 SP across Sprints 1 to 5  
* **In Progress (Active Sprint 5 R&D):** 24 SP  
* **Product Backlog (Future Research Scope):** 47 SP  

---

## 1. Scrum Team Roster & JIRA User Profiles

| Member Name | Student Registration No | JIRA Username | Role | Primary Development Domain |
| :--- | :--- | :--- | :--- | :--- |
| **Weerasinghe T.H.K** | `EG/2022/5401` | `harsha.w` | Frontend Lead & Scrum Master | Next.js 14 Web App, Tailwind UI/UX, Camera Barcode Scanners, Interactive Timetables |
| **Dulanjana K.A.P** | `EG/2022/5024` | `priyan.d` | Backend Lead & Database Architect | Express TypeScript API, TiDB/MySQL Database, Atomic Transactions, Socket.IO WebSockets |
| **Dassanayake D.M.P.S.P** | `EG/2022/4983` | `pamudu.d` | Vision & Hardware Integration Lead | OpenCV Barcode/QR Pipeline, ByteTrack Tracking, YOLOv8-pose Skeleton Monitoring |
| **Adhikari A.M.I.S** | `EG/2022/4916` | `imal.a` | AI Specialist & NLP/RAG Engineer | FastAPI RAG Pipeline, ChromaDB Vector DB, Parameterized SQL Generators, Ollama/Gemini Integration |

---

## 2. JIRA Epic Hierarchy

| Epic Key | Epic Name | Summary & Scope | Epic Owner | Status |
| :--- | :--- | :--- | :--- | :--- |
| **`ELAB-EPIC-1`** | **Equipment & Inventory Lifecycle** | Item catalog, category filters, multi-item checkouts, returns, technician approvals, outside-lab loans, audit logs. | `priyan.d` | `COMPLETED` |
| **`ELAB-EPIC-2`** | **Barcode & Hardware Tracking** | Optical barcode/QR scanner (`html5-qrcode`), OpenCV tag decoding, benchtop equipment presence tracking. | `pamudu.d` | `COMPLETED` |
| **`ELAB-EPIC-3`** | **Academic Timetables & Grouping** | 6th Semester EE sub-grouping (EE1-EE11), group-isolated timetables, Excel-style spreadsheet, multi-semester switcher. | `harsha.w` | `COMPLETED` |
| **`ELAB-EPIC-4`** | **Practicals & Safety Compliance** | Practical experiment checklists, completion requirements, PDF laboratory manuals, and staff document uploads. | `harsha.w` | `COMPLETED` |
| **`ELAB-EPIC-5`** | **Real-Time Alerts & Messaging** | Multi-party instant notifications (borrow/approve/due dates), topbar notification popover, Socket.IO messaging. | `priyan.d` | `COMPLETED` |
| **`ELAB-EPIC-6`** | **Intelligent Lab Assistant (AI/RAG)** | Natural language inventory queries, zero-hallucination parameterized SQL, equipment manual semantic retrieval. | `imal.a` | `COMPLETED` |
| **`ELAB-EPIC-7`** | **Cloud DevOps & RBAC Security** | Monorepo structure, TiDB Cloud Serverless MySQL, Cloudflare Edge HTTPS deployment, Docker, JWT & RBAC. | `harsha.w` | `COMPLETED` |

---

## 3. Sprint Summary & Velocity Metrics

```mermaid
xychart-beta
    title "Sprint Velocity (Story Points Completed vs In Progress)"
    x-axis ["Sprint 1", "Sprint 2", "Sprint 3", "Sprint 4", "Sprint 5", "Backlog"]
    y-axis "Story Points" 0 --> 60
    bar [34, 38, 42, 45, 52, 47]
```

* **Sprint 1 (Architecture & Authentication):** 34 Story Points (100% Commitment Met — Completed)
* **Sprint 2 (Equipment Registry & Optical Baseline):** 38 Story Points (100% Commitment Met — Completed)
* **Sprint 3 (Borrow Workflows & Real-Time Messaging):** 42 Story Points (100% Commitment Met — Completed)
* **Sprint 4 (Smart Inventory Hub & Cloud Deployment):** 45 Story Points (100% Commitment Met — Completed)
* **Sprint 5 (Strict Workflow, Group Allocation & Master Timetable Hub):** 52 SP Completed + 24 SP In Progress
* **Product Backlog (Advanced Research & Future Scope):** 47 Story Points (To Do)
* **Total Tracked Scope:** **282 SP**

---

## 4. Sprint 5 Backlog Deep Dive (New Changes & Features)

Sprint 5 focused on implementing strict technician-supervised workflows, dynamic 6th-semester student sub-grouping, group-isolated scheduling, interactive Excel-style timetable viewing, and safety document compliance hubs.

### `ELAB-34`: Technician-Supervised 2-Step Equipment Borrowing Workflow
* **Issue Type:** Story  
* **Epic:** `ELAB-EPIC-1` (Equipment & Inventory Lifecycle)  
* **Assignee:** `priyan.d` (Backend) & `harsha.w` (Frontend)  
* **Story Points:** 5 SP  
* **Priority:** Highest  
* **Status:** `DONE`  
* **User Story:**  
  *As a laboratory student,*  
  *I want to submit an equipment borrowing request to the laboratory technician,*  
  *So that I cannot unilaterally issue equipment to myself without official staff inspection and approval.*  
* **Acceptance Criteria:**  
  - [x] Students can click "Request Borrow" on available items, selecting expected return dates and purpose.  
  - [x] Request status defaults to `PENDING_APPROVAL` and appears on the Technician/Admin Borrow Requests desk.  
  - [x] Lab Technicians can inspect student eligibility, review the request, and click "Approve & Issue" or "Reject".  
  - [x] Equipment state transitions atomically from `AVAILABLE` to `BORROWED` only upon technician authorization.

---

### `ELAB-35`: Outside-Lab Equipment Loan Request & Authorization Workflow
* **Issue Type:** Story  
* **Epic:** `ELAB-EPIC-1` (Equipment & Inventory Lifecycle)  
* **Assignee:** `priyan.d` (Backend) & `harsha.w` (Frontend)  
* **Story Points:** 5 SP  
* **Priority:** High  
* **Status:** `DONE`  
* **User Story:**  
  *As a student working on an external engineering project,*  
  *I want to request permission to take laboratory instruments outside the designated lab room,*  
  *So that technicians can review my destination lab, project purpose, and return deadline before granting custody.*  
* **Acceptance Criteria:**  
  - [x] Borrow request modal includes a mandatory toggle: "Take Outside the Lab?".  
  - [x] When enabled, user must specify the destination lab/location (e.g. Project Development Lab) and faculty project purpose.  
  - [x] The loan request requires explicit technician verification before equipment can physically leave the laboratory.  
  - [x] System logs destination location and loan terms into `borrow_transactions` and `audit_logs`.

---

### `ELAB-36`: Role-Based Tab & Action Isolation (Hide "My Borrows" from Staff)
* **Issue Type:** Story  
* **Epic:** `ELAB-EPIC-1` (Equipment & Inventory Lifecycle)  
* **Assignee:** `harsha.w` (Frontend)  
* **Story Points:** 2 SP  
* **Priority:** Medium  
* **Status:** `DONE`  
* **User Story:**  
  *As a System Administrator or Lab Technician,*  
  *I want the "My Borrows" tab hidden from my inventory navigation,*  
  *So that my dashboard is focused on managing student check-outs and department assets rather than irrelevant personal loans.*  
* **Acceptance Criteria:**  
  - [x] Navigation tabs conditionally render based on authenticated user role (`STUDENT` vs `TECHNICIAN`/`ADMIN`).  
  - [x] Technicians and Admins see "Active Loans (All Students)", "Pending Requests", and "Inventory Registry".  
  - [x] Students see "Equipment Catalog", "My Requests", and "My Borrows".

---

### `ELAB-37`: High-Precision In-Browser Barcode & QR Camera Scanner with Viewfinder UX
* **Issue Type:** Story  
* **Epic:** `ELAB-EPIC-2` (Barcode & Hardware Tracking)  
* **Assignee:** `harsha.w` (Frontend) & `pamudu.d` (Vision)  
* **Story Points:** 5 SP  
* **Priority:** High  
* **Status:** `DONE`  
* **User Story:**  
  *As a lab technician at the issue counter,*  
  *I want an intuitive, accurate webcam barcode scanner with a visual targeting box and audio-visual feedback,*  
  *So that I can scan equipment tags (`ELABS-PS-0001`) in under 500ms without manual typing errors.*  
* **Acceptance Criteria:**  
  - [x] Modern camera modal with targeting reticle/viewfinder and animated scanning line.  
  - [x] High-accuracy detection powered by `html5-qrcode` supporting Code-128, Code-39, EAN-13, and QR tags.  
  - [x] Auto-fills equipment details instantly upon successful read and plays visual confirmation badge.  
  - [x] Fallback to manual entry with live index search (`EG/2022/xxxx`) and equipment tag auto-complete.

---

### `ELAB-38`: Real-Time Multi-Party Notification Matrix & Topbar Dropdown
* **Issue Type:** Story  
* **Epic:** `ELAB-EPIC-5` (Real-Time Alerts & Messaging)  
* **Assignee:** `priyan.d` (Backend) & `harsha.w` (Frontend)  
* **Story Points:** 5 SP  
* **Priority:** Highest  
* **Status:** `DONE`  
* **User Story:**  
  *As a laboratory user (student or staff),*  
  *I want instant notifications whenever requests are submitted, approved, rejected, or approaching their due dates,*  
  *So that all stakeholders stay synchronized without manually checking request tables.*  
* **Acceptance Criteria:**  
  - [x] Admin/Technician receive instant notifications when any student submits a borrowing or outside-loan request.  
  - [x] Student receives instant notification when a technician approves, rejects, or issues their requested items.  
  - [x] Automated system notifications generated 24 hours before due date and immediately when overdue.  
  - [x] Interactive topbar notification bell popover displaying unread count badge, mark-as-read, and navigation links.

---

### `ELAB-39`: 6th Semester EE Student Group Allocation Engine (EE1 - EE11)
* **Issue Type:** Story  
* **Epic:** `ELAB-EPIC-3` (Academic Timetables & Grouping)  
* **Assignee:** `priyan.d` (Backend) & `harsha.w` (Frontend)  
* **Story Points:** 5 SP  
* **Priority:** Highest  
* **Status:** `DONE`  
* **User Story:**  
  *As a System Administrator or Lab Coordinator,*  
  *I want 6th-semester Electrical & Information Engineering students automatically partitioned into balanced groups of 7,*  
  *So that high-density lab sessions operate safely within bench capacity constraints.*  
* **Acceptance Criteria:**  
  - [x] 75 registered 6th Semester EE students partitioned into 11 sub-groups (`EE1` through `EE11`, 7 per group; `EE11` with 8).  
  - [x] Admin console (`/admin/semester-groups`) displaying live rosters per group with student names and registration numbers.  
  - [x] 1-Click "Auto-Partition Students" button distributing unassigned students evenly.  
  - [x] Interactive student reassignment dropdown allowing technicians to transfer students between groups dynamically.

---

### `ELAB-40`: Strict Group-Isolated Academic Timetables & Notifications
* **Issue Type:** Story  
* **Epic:** `ELAB-EPIC-3` (Academic Timetables & Grouping)  
* **Assignee:** `harsha.w` (Frontend) & `priyan.d` (Backend)  
* **Story Points:** 5 SP  
* **Priority:** Highest  
* **Status:** `DONE`  
* **User Story:**  
  *As an EE3 student,*  
  *I want to see timetable slots and receive laboratory notifications ONLY for my assigned group (`EE3`),*  
  *So that I am not confused by rotational lab dates intended for groups EE1, EE2, or EE4.*  
* **Acceptance Criteria:**  
  - [x] API queries (`/academic/timetable/my-group`) resolve the authenticated student's group code (`EE3`).  
  - [x] Student dashboard calendar and timetable displays only the rotational practicals assigned to their specific sub-group.  
  - [x] Notification scheduler sends upcoming lab reminders only to students enrolled in that specific practical's group session.

---

### `ELAB-41`: Interactive Master Timetable Excel-Style Workbook
* **Issue Type:** Story  
* **Epic:** `ELAB-EPIC-3` (Academic Timetables & Grouping)  
* **Assignee:** `harsha.w` (Frontend)  
* **Story Points:** 5 SP  
* **Priority:** High  
* **Status:** `DONE`  
* **User Story:**  
  *As a student or staff member,*  
  *I want an Excel-like interactive spreadsheet view of the master laboratory schedule with cell coordinates and formula bar,*  
  *So that I can inspect the entire semester's multi-module lab distribution at a glance and export it to CSV.*  
* **Acceptance Criteria:**  
  - [x] High-density grid with spreadsheet column headers (`A`, `B`, `C`, `D`, `E`, `F`) and numbered rows (`1`, `2`, `3`, ...).  
  - [x] Interactive formula bar (`fx`) displaying selected cell coordinates (e.g. `B4`) and cell content dynamically.  
  - [x] Multi-criteria filters by Module (EE5206, EE5207, EE5208, EE5209) and Group (`EE1` - `EE11`).  
  - [x] Instant search bar filtering practical titles, dates, and laboratory venues in real-time.  
  - [x] "Export CSV" button generating standardized `.csv` files for offline spreadsheet analysis.

---

### `ELAB-42`: Multi-Semester Selector & Faculty-Wide All-Semesters Master Schedule
* **Issue Type:** Story  
* **Epic:** `ELAB-EPIC-3` (Academic Timetables & Grouping)  
* **Assignee:** `harsha.w` (Frontend) & `priyan.d` (Backend)  
* **Story Points:** 5 SP  
* **Priority:** High  
* **Status:** `DONE`  
* **User Story:**  
  *As a System Administrator,*  
  *I want a semester dropdown selector and an "All Semesters" faculty master view,*  
  *So that I can oversee laboratory utilization across Semesters 1 through 8 and R&D projects rather than being locked to one semester.*  
* **Acceptance Criteria:**  
  - [x] Dynamic semester selector in top header supporting Semesters 1, 2, 3, 4, 5, 6, 7, 8, and R&D / Final Year Projects.  
  - [x] System Administrator can choose "All Semesters" to view a consolidated cross-faculty timetable matrix.  
  - [x] Students default automatically to their active enrolled semester (Semester 6) with read-only access.

---

### `ELAB-43`: Module Practicals Catalog & Laboratory Safety Compliance Hub
* **Issue Type:** Story  
* **Epic:** `ELAB-EPIC-4` (Practicals & Safety Compliance)  
* **Assignee:** `harsha.w` (Frontend) & `priyan.d` (Backend)  
* **Story Points:** 5 SP  
* **Priority:** High  
* **Status:** `DONE`  
* **User Story:**  
  *As an undergraduate engineering student,*  
  *I want to view a comprehensive list of all required practicals for my semester with safety guidelines and completion criteria,*  
  *So that I arrive prepared with prerequisite knowledge and compliant laboratory safety gear.*  
* **Acceptance Criteria:**  
  - [x] Practicals catalog listing all experiments across 6th Semester modules with duration, venue, and completion status.  
  - [x] Clicking any practical opens `PracticalDetailsModal` showing:  
    - Objectives & Equipment Required  
    - Mandatory Safety Regulations (PPE, high-voltage precautions, grounding rules)  
    - Prerequisite reading and completion criteria (logbook sign-off, viva, simulation check)

---

### `ELAB-44`: Practical Lab Manual PDF Preview & Staff Document Upload Capability
* **Issue Type:** Story  
* **Epic:** `ELAB-EPIC-4` (Practicals & Safety Compliance)  
* **Assignee:** `harsha.w` (Frontend) & `priyan.d` (Backend)  
* **Story Points:** 3 SP  
* **Priority:** Medium  
* **Status:** `DONE`  
* **User Story:**  
  *As an academic staff member or lab technician,*  
  *I want to upload lab manuals, safety guidelines, and instruction sheets directly to any practical,*  
  *So that students can preview and download the official PDFs before entering the laboratory.*  
* **Acceptance Criteria:**  
  - [x] Document upload zone in practical details modal supporting PDF and DOCX formats up to 25MB.  
  - [x] In-browser PDF preview iframe allowing students to read experiment procedures directly without external software.  
  - [x] Upload authorization restricted to `ADMIN` and `TECHNICIAN` roles via JWT verification.

---

### `ELAB-45`: Authentic Department Laboratory Photography & UI Polish
* **Issue Type:** Story  
* **Epic:** `ELAB-EPIC-7` (DevOps & UI Architecture)  
* **Assignee:** `harsha.w` (Frontend)  
* **Story Points:** 2 SP  
* **Priority:** Medium  
* **Status:** `DONE`  
* **User Story:**  
  *As a department stakeholder,*  
  *I want real, high-resolution photography of our DEIE laboratory facilities displayed across the portal,*  
  *So that the application reflects our authentic physical engineering benches rather than generic stock imagery.*  
* **Acceptance Criteria:**  
  - [x] Real photographic assets integrated for all 6 official DEIE laboratories:  
    1. Power Systems & High Voltage Laboratory  
    2. Electronics & Circuits Laboratory  
    3. Telecommunications & RF Laboratory  
    4. Networking & Systems Laboratory  
    5. Electric Machines & Drives Laboratory  
    6. Project Development & Innovation Laboratory  
  - [x] Fixed messaging system (`/messages`) re-render cycle, recipient name resolution, and clean enterprise styling.

---

## 5. Complete Sprints 1 to 4 Backlog Reference

### Sprint 1: Architecture, Normalized Schema & Authentication (34 SP)
* `ELAB-1` (8 SP): Monorepo Architecture Setup (Next.js, Express, FastAPI, Shared Packages) — `harsha.w`
* `ELAB-2` (8 SP): MySQL Database Schema Design (`inventory_items`, `users`, `borrow_transactions`, `labs`) — `priyan.d`
* `ELAB-3` (5 SP): JWT Authentication & RBAC Permission Guards — `priyan.d`
* `ELAB-4` (5 SP): OpenCV Benchtop Optical Frame Pipeline & Camera Calibration — `pamudu.d`
* `ELAB-5` (5 SP): FastAPI Microservice Setup & SQLAlchemy Connection Pooling — `imal.a`
* `ELAB-6` (3 SP): Tailwind CSS Theme & Department Brand Design System — `harsha.w`

### Sprint 2: Core Equipment Registry & LMS Academic Integration (38 SP)
* `ELAB-7` (8 SP): Equipment Registry & Category Filtering UI (Measurement, Power Supplies, Oscilloscopes) — `harsha.w`
* `ELAB-8` (8 SP): RESTful Equipment CRUD Endpoints & Laboratory Location Routing — `priyan.d`
* `ELAB-9` (8 SP): Optical Barcode & QR Code Reader Engine (`elabs_tag`) — `pamudu.d`
* `ELAB-10` (8 SP): Deterministic Parameterized SQL Intent Classifier for Inventory Queries — `imal.a`
* `ELAB-11` (3 SP): LMS Course Practical Module Registration Architecture — `harsha.w`
* `ELAB-12` (3 SP): Barcode Tag Query Endpoint (`/items/barcode/:tag`) — `priyan.d`

### Sprint 3: Borrow Workflows, Real-Time Messaging & Assessment Engine (42 SP)
* `ELAB-13` (8 SP): Interactive Check-out Modal & Student Practical Equipment Checklists — `harsha.w`
* `ELAB-14` (8 SP): Transactional Borrow & Return Backend Processing Pipeline — `priyan.d`
* `ELAB-15` (8 SP): Socket.IO Real-Time Chat & Status Broadcaster (`/messages`) — `priyan.d` & `harsha.w`
* `ELAB-16` (8 SP): ByteTrack Entry/Exit Monitoring & YOLOv8-pose Skeleton Estimation — `pamudu.d`
* `ELAB-17` (8 SP): RAG Vector Indexing Pipeline for PDF Manuals & Experiment Procedures — `imal.a`
* `ELAB-18` (2 SP): Lab Report Upload & Assessment Grading Interface — `harsha.w`

### Sprint 4: Smart Inventory Hub, Barcode Automation & Cloud Deployment (45 SP)
* `ELAB-19` (8 SP): Smart Inventory Hub UI (`/inventory`) with Live Status Pills & Filters — `harsha.w`
* `ELAB-20` (8 SP): Rapid Issue Station with Instant Student Index Verification (`EG/2022/xxxx`) — `harsha.w`
* `ELAB-21` (5 SP): In-Browser Camera Barcode/QR Scanner Integration (`html5-qrcode`) — `harsha.w`
* `ELAB-22` (8 SP): Atomic Inventory Transactions with TiDB Cloud Serverless MySQL & SSL — `priyan.d`
* `ELAB-23` (5 SP): Automated Overdue Tracking Engine with Immutable `audit_logs` — `priyan.d`
* `ELAB-24` (5 SP): Optical Return Verification Station & Physical Asset Tracking — `pamudu.d`
* `ELAB-25` (6 SP): Natural Language AI Assistant with Student Context & SSE Streaming — `imal.a`

### Sprint 5: Strict Workflow, Group Allocation & Master Timetable Hub (52 SP Completed + 24 SP In Progress)
* `ELAB-34` (5 SP): Technician-Supervised 2-Step Borrowing Workflow — `priyan.d` & `harsha.w` (`DONE`)
* `ELAB-35` (5 SP): Outside-Lab Equipment Loan Authorization — `priyan.d` & `harsha.w` (`DONE`)
* `ELAB-36` (2 SP): Role-Based Tab Isolation (Hide My Borrows from Staff) — `harsha.w` (`DONE`)
* `ELAB-37` (5 SP): High-Precision Barcode Scanner with Viewfinder UX — `harsha.w` & `pamudu.d` (`DONE`)
* `ELAB-38` (5 SP): Real-Time Multi-Party Notification Matrix — `priyan.d` & `harsha.w` (`DONE`)
* `ELAB-39` (5 SP): 6th Semester EE Student Group Allocation Engine — `priyan.d` & `harsha.w` (`DONE`)
* `ELAB-40` (5 SP): Strict Group-Isolated Timetables & Notifications — `harsha.w` & `priyan.d` (`DONE`)
* `ELAB-41` (5 SP): Interactive Master Timetable Excel-Style Workbook — `harsha.w` (`DONE`)
* `ELAB-42` (5 SP): Multi-Semester Selector & All-Semesters Master Schedule — `harsha.w` & `priyan.d` (`DONE`)
* `ELAB-43` (5 SP): Module Practicals Catalog & Lab Safety Compliance Hub — `harsha.w` & `priyan.d` (`DONE`)
* `ELAB-44` (3 SP): Lab Manual PDF Preview & Staff Document Upload — `harsha.w` & `priyan.d` (`DONE`)
* `ELAB-45` (2 SP): Department Laboratory Photography & UI Polish — `harsha.w` (`DONE`)
* `ELAB-48` (8 SP): Sub-GHz LoRaWAN Mesh Sensor Nodes for High-Voltage Insulation Leakage Micro-Telemetry — `pamudu.d` (`IN PROGRESS`)
* `ELAB-50` (8 SP): Hardware Security Module Cryptographic Attestation for NFC Anti-Tamper Calibration Seals — `priyan.d` (`IN PROGRESS`)
* `ELAB-52` (8 SP): Stereo Depth Disparity Point-Cloud Volumetric Bounding for Markerless Equipment Tracking — `pamudu.d` (`IN PROGRESS`)

---

## 6. Advanced Research Backlog (Uncompleted / Future Scope — 47 SP)

These advanced features represent complex hardware and distributed systems engineering extensions planned in the product backlog (`TO DO`), demonstrating rigorous scope management for the evaluation panel:

### `ELAB-46`: Edge-TPU TensorRT Quantized Pipeline for Thermal Hazard & Exposed Wire Arc Detection
* **Issue Type:** Story | **Epic:** `ELAB-EPIC-2` | **Assignee:** `pamudu.d` | **Story Points:** 13 SP | **Status:** `TO DO`
* **Technical Scope:** INT8 quantized MobileNet-SSD deployed on Google Coral Edge TPU USB accelerator analyzing radiometric thermal feeds from FLIR Lepton sensor to detect benchtop transformer overheating (>75°C) and exposed high-voltage test lead arc hazards.
* **Panel Defense Rationale:** *Deferred due to hardware procurement lead times for the FLIR radiometric thermal imaging module and Edge TPU PCIe carrier board; model architecture was prototyped offline but physical benchtop integration is scheduled for Phase 2.*

### `ELAB-47`: LoRA Fine-Tuning & Multi-Agent LangGraph Swarm for Automated Waveform Anomaly Diagnosis
* **Issue Type:** Story | **Epic:** `ELAB-EPIC-6` | **Assignee:** `imal.a` | **Story Points:** 13 SP | **Status:** `TO DO`
* **Technical Scope:** Train Low-Rank Adaptation (LoRA) weights over LLaMA-3-8B using 2,400 IEEE instrumentation error logs; deploy LangGraph multi-agent supervisor pattern to diagnose clipping, ground bounce, and phase distortion directly from Rigol oscilloscope CSV export captures.
* **Panel Defense Rationale:** *Requires high-VRAM GPU compute cluster for multi-agent LLM consensus; currently our cloud deployment runs the deterministic regex and ChromaDB RAG assistant while this deep reasoning model is in pre-training.*

### `ELAB-49`: Distributed Two-Phase Commit & Raft Consensus Engine for Multi-Campus Inter-University Asset Lending
* **Issue Type:** Story | **Epic:** `ELAB-EPIC-1` | **Assignee:** `priyan.d` | **Story Points:** 13 SP | **Status:** `TO DO`
* **Technical Scope:** Architect distributed transaction coordinator implementing Raft consensus and Conflict-free Replicated Data Types (CRDTs) to synchronize inter-university equipment borrowing transactions across University of Ruhuna, University of Moratuwa, and University of Peradeniya engineering faculties without central coordinator bottlenecks.
* **Panel Defense Rationale:** *Inter-university API firewall permissions and VPN tunneling across university networks are awaiting inter-faculty IT security MOU clearance.*

### `ELAB-51`: WebXR WebGL 3D Digital Twin Benchtop Hologram with Spatial Instrument Probe Telemetry
* **Issue Type:** Story | **Epic:** `ELAB-EPIC-3` | **Assignee:** `harsha.w` | **Story Points:** 8 SP | **Status:** `TO DO`
* **Technical Scope:** Develop interactive Three.js WebXR digital twin interface rendering real-time 3D models of laboratory benches, showing live multimeter needle deflections and virtual oscilloscope probe coordinates projected onto the student's browser canvas.
* **Panel Defense Rationale:** *Deferred to prioritize low-latency mobile camera barcode scanning and reactive timetable scheduling on mobile devices before building WebGL heavy rendering.*

---

## 7. JIRA CSV Export / Import Specification

The updated realistic backlog CSV file is available at [`docs/jira_backlog_with_uncompleted.csv`](file:///c:/software%20project/docs/jira_backlog_with_uncompleted.csv).

### Column Structure:
1. `Issue Type` (Epic, Story)
2. `Issue key` (`ELAB-xx`)
3. `Summary`
4. `Description`
5. `Assignee` (`harsha.w`, `priyan.d`, `pamudu.d`, `imal.a`)
6. `Reporter` (`harsha.w`)
7. `Priority` (Highest, High, Medium, Low)
8. `Story Points` (1 to 13)
9. `Epic Link` (`ELAB-EPIC-1` to `ELAB-EPIC-7`)
10. `Sprint` (Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, Backlog)
11. `Status` (`DONE`, `IN PROGRESS`, `TO DO`)
12. `Resolution` (`Done` or empty for uncompleted items)

