# ELABS — System Architecture & Component Design

**Project Name:** Smart Inventory Management System for DEIE Laboratories (ELABS)  
**Institution:** Department of Electrical & Information Engineering, Faculty of Engineering, University of Ruhuna  

---

## 1. High-Level Multi-Tier System Architecture Diagram

```mermaid
flowchart TD
    subgraph CLIENT_TIER["1. Client Presentation Tier (Frontend)"]
        UI_STUDENT["Student Web Portal (Next.js 14)<br/>• Catalog & Rotational Timetables (EE1-EE11)<br/>• My Requests & Practical Safety Guidelines<br/>• In-Browser PDF Lab Manual Viewer<br/>• Conversational AI Assistant"]
        UI_STAFF["Staff & Technician Station<br/>• Rapid Issue Counter (Index & Tag Lookup)<br/>• 2-Step Borrow Request Approvals<br/>• Outside-Lab Loan Authorizations<br/>• Master Timetable Excel Workbook<br/>• Group Auto-Partition Engine"]
        HW_SCAN["Client Hardware Interfaces<br/>• Camera Barcode / QR Scanner (html5-qrcode)<br/>• Audio-Visual Feedback & Viewfinder Reticle"]
    end

    subgraph EDGE_GATEWAY["2. Edge & Security Gateway Tier"]
        EDGE["Vercel Edge / Cloudflare Network<br/>• HTTPS / TLS 1.3 Termination<br/>• Reverse Proxy & CDN Asset Caching"]
        RBAC["Security & Session Middleware<br/>• Asymmetric / Symmetric JWT Authentication<br/>• RBAC Guards (Student, Tech, Lecturer, Admin)<br/>• Helmet, CORS, Cookie-Parser"]
    end

    subgraph CORE_BACKEND["3. Core Application & Real-Time Tier (Express / Node.js)"]
        API_ROUTER["Express REST API Endpoints<br/>• /api/auth (Login, Refresh, Session Verification)<br/>• /api/inventory (72 Instruments, Search, CRUD)<br/>• /api/academic (Timetables, Modules, Groups)<br/>• /api/feedback (Student Ticket Routing to Helpdesk)"]
        BIZ_LOGIC["Core Business Logic Engine<br/>• Atomic 2-Step Equipment Checkout<br/>• Outside-Lab Loan Verification & Audit Trail<br/>• 6th-Semester Dynamic Grouping (EE1-EE11)<br/>• Datasheet Semantic Matcher (findDatasheet)"]
        SOCKET_IO["Socket.IO Real-Time Server<br/>• Live Request Approval Broadcasts<br/>• Topbar Notification Unread Count<br/>• Instant Student-Technician Messaging"]
        SCHEDULER["Background Automation Worker<br/>• Overdue Detection & 24h Return Reminders<br/>• Automated Immutable Audit Log Generator"]
    end

    subgraph MICROSERVICES["4. Vision & AI Microservices Tier (Python)"]
        VISION_SVC["Computer Vision Service (OpenCV / ByteTrack)<br/>• Benchtop Camera Calibration & Tag Detection<br/>• 1D / 2D Barcode & QR Code Decoder<br/>• YOLOv8-Pose Counter Activity & Tracking"]
        AI_RAG["AI & Natural Language Service (FastAPI)<br/>• Deterministic Parameterized SQL Generator<br/>• RAG Pipeline over PDF Equipment Manuals<br/>• Server-Sent Event (SSE) Chat Streaming"]
    end

    subgraph DATA_TIER["5. Persistence & Database Tier"]
        TIDB["TiDB Cloud Serverless MySQL (Clustered)<br/>• inventory_items (72 Benchtop Instruments)<br/>• users & user_roles (RBAC Schema)<br/>• borrow_transactions (Atomic State Transitions)<br/>• audit_logs (Immutable Historical Audit Trail)"]
        CHROMA["ChromaDB Vector Store<br/>• Vectorized PDF Datasheets & Safety Rules<br/>• Cosine Similarity Semantic Document Retrieval"]
        FILE_STORE["Local & Cloud Asset Storage<br/>• Real DEIE Laboratory Photography<br/>• Official Instrument Datasheets (PDF)"]
    end

    UI_STUDENT --> EDGE
    UI_STAFF --> EDGE
    HW_SCAN --> UI_STAFF
    HW_SCAN --> UI_STUDENT

    EDGE --> RBAC
    RBAC --> API_ROUTER

    API_ROUTER --> BIZ_LOGIC
    API_ROUTER --> SOCKET_IO
    BIZ_LOGIC --> SCHEDULER

    BIZ_LOGIC --> TIDB
    BIZ_LOGIC --> AI_RAG
    HW_SCAN -.-> VISION_SVC
    AI_RAG --> CHROMA
    AI_RAG --> TIDB
    API_ROUTER --> FILE_STORE
    SOCKET_IO -.-> UI_STUDENT
    SOCKET_IO -.-> UI_STAFF
```

---

## 2. Architectural Design Patterns & Principles

1. **Layered Separation of Concerns (SoC):**  
   The system decouples the presentation layer (Next.js 14 App Router) from business workflows (Express API) and machine intelligence pipelines (FastAPI RAG and OpenCV).

2. **Atomic Inventory State Transitions:**  
   Equipment loan transactions use database row locks (`SELECT ... FOR UPDATE`) in MySQL/TiDB Cloud to prevent race conditions during concurrent student borrow requests.

3. **Hybrid AI & Zero-Hallucination Query Routing:**  
   The natural language assistant combines deterministic regex-parameterized SQL generators for inventory counts with ChromaDB semantic vector retrieval for equipment datasheets and safety rules.

4. **Multi-Party Event-Driven Notifications:**  
   State changes (such as a technician approving an outside-lab loan) emit WebSocket events via Socket.IO, immediately updating the student's topbar badge and active loan dashboard without full page reloads.

5. **Resilient Fail-Safe Database Adapters:**  
   Backend queries implement zero-downtime column fallbacks (`try ... catch` with `NULL as alias`), ensuring rolling schema updates and remote cloud deployments operate seamlessly without service outages.