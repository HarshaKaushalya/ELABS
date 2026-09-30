# ELABS - Sprint 04 Video Presentation Script
**Project Title:** Advanced Laboratory Inventory Management System (EIE, University of Ruhuna)  
**Video File Name Target:** `GroupNumber_Video.mp4`  
**Strict Maximum Time Limit:** 5 Minutes (*Strict penalty: exceeding 5:00 results in marks reduced to zero*)  
**Target Video Duration:** **4 Minutes 35 Seconds** (Leaves a safe 25-second buffer)  
**Mandatory Rules:** 
1. Only **Sprint 04** inventory management features and tasks must be presented.
2. All 4 members must present with their **cameras turned ON** during their part.

---

## Presentation Timing Breakdown

| Speaker | Role | Sprint 4 Inventory Focus | Start Time | End Time | Duration |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Harsha** | Frontend Lead | Smart Inventory Hub, Barcode Scanner & Issue Station | `0:00` | `1:10` | 1m 10s |
| **Priyan** | Backend Lead | Atomic Transactions, Overdue Engine & Audit Trail | `1:10` | `2:15` | 1m 05s |
| **Pamudu** | Vision & Hardware | Optical Tag Scanning & Benchtop Equipment Tracking | `2:15` | `3:25` | 1m 10s |
| **Imal** | AI Specialist | Natural Language Inventory Queries & Manual RAG | `3:25` | `4:30` | 1m 05s |
| **All Team** | Closing | Group Sign-off & System Summary | `4:30` | `4:38` | 0m 08s |

---

## Detailed Script & On-Screen Demonstration

### Segment 1: Harsha – Frontend Lead (0:00 – 1:10)
**Camera Status:** ON (Harsha facecam visible + Screen Share)  
**Screen Display:** Browser on `http://localhost:3000/inventory`

* **[0:00 – 0:15] Introduction:**
  > *"Hello everyone. I am Harsha, the Frontend Lead for ELABS. In Sprint 4, our primary objective was delivering the complete Smart Inventory Management Hub, empowering lab technicians and students with seamless equipment tracking, barcode scanning, and instant checkout workflows."*

* **[0:15 – 0:45] Demo – Equipment Directory & Status Badges:**
  *(Action: Scroll through the inventory page showing category filters: Measurement, Oscilloscopes, Power Supplies. Point out status pills: Available, Borrowed, Maintenance, Overdue).*
  > *"Here on our main Inventory Portal, technicians and students have a live catalog of all departmental lab equipment. Each item displays real-time status badges—such as Available, Borrowed, Maintenance, or Overdue—along with its unique ELABS tag, laboratory location, and condition notes. We have implemented reactive search and category filters for instant navigation across our undergraduate and research labs."*

* **[0:45 – 1:05] Demo – Issue Station & Barcode Scanning:**
  *(Action: Click 'Issue / Borrow Item'. Type student index number `EG/2022/5401`. Show the student's name auto-populate. Click 'Scan Barcode' and simulate scanning `ELABS-PS-0001` or selecting an item).*
  > *"For check-outs, we engineered our rapid Issue Station. The technician simply enters a student index number—such as EG/2022/5401—and the system automatically verifies their academic eligibility. Using our integrated in-browser camera scanner powered by HTML5-QRCode, technicians can optically scan the equipment's barcode tag to immediately populate the checkout form with due dates and condition remarks."*

* **[1:05 – 1:10] Handover:**
  > *"Now, Priyan will explain our backend transaction engine and audit logging."*

---

### Segment 2: Priyan – Backend Lead (1:10 – 2:15)
**Camera Status:** ON (Priyan facecam visible + Screen Share)  
**Screen Display:** VS Code / Terminal showing `packages/api/src/modules/inventory/inventory.routes.ts` & database tables

* **[1:10 – 1:25] Introduction & Architecture:**
  > *"Thank you Harsha. I am Priyan, Backend Lead. In Sprint 4, I focused on engineering an enterprise-grade inventory transaction pipeline, automated overdue tracking, and tamper-proof audit trails in our Express TypeScript API."*

* **[1:25 – 1:50] Demo – Atomic Transactions & State Management:**
  *(Action: Highlight the checkout and return transaction queries in `inventory.routes.ts` and show database records).*
  > *"When an item is checked out or returned, our API executes atomic SQL transactions using connection pooling in MariaDB. This ensures that item statuses transition reliably between Available and Borrowed without race conditions. We built automated index verification via the `/inventory/student-lookup` endpoint and barcode routing via `/items/barcode/:tag` to validate requests in milliseconds."*

* **[1:50 – 2:10] Demo – Overdue Detection & Audit Logging:**
  *(Action: Show the overdue calculation logic and the `audit_logs` table schema).*
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
  > *"To accelerate inventory check-ins and returns at the technician counter, we deployed a high-speed optical tag detection pipeline. Utilizing OpenCV image preprocessing and adaptive thresholding, our system captures and decodes ELABS barcode and QR tags from live camera streams, even under low-contrast benchtop lighting, directly verifying instrument serial numbers against our inventory database."*

* **[2:55 – 3:20] Demo – Benchtop Equipment Tracking & Return Verification:**
  *(Action: Show the equipment tracking pipeline verifying physical instrument presence).*
  > *"Furthermore, for high-value laboratory assets such as oscilloscopes and spectrum analyzers, our vision pipeline tracks benchtop presence. When students bring items back to the return station, camera frames capture the visual condition of the device and cross-reference its return state with the database, ensuring no lab instruments leave the premises unregistered."*

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
  > *"To ensure 100% factual accuracy, our engine uses deterministic intent routing. When a student or lecturer asks about instrument availability or active loans, our backend bypasses LLM hallucinations by dynamically generating and executing parameterized SQL queries on our live inventory tables. It instantly returns exact quantities, model numbers, and lab locations."*

* **[4:05 – 4:25] Demo – Equipment Manual RAG & Student Context Injection:**
  *(Action: Ask: 'How do I calibrate the UT61E multimeter?' Show RAG manual excerpt and student context).*
  > *"In addition, we deployed a RAG pipeline indexed with equipment user manuals and calibration datasheets. When students ask technical questions about operating borrowed equipment, the assistant retrieves precise operating guidelines. Furthermore, the system dynamically injects the student's active borrowed items into the prompt context, allowing personalized responses streamed in real time via Server-Sent Events."*

* **[4:25 – 4:30] Handover to Group:**
  > *"Harsha will now conclude our presentation."*

---

### Segment 5: Group Wrap-Up (4:30 – 4:38)
**Camera Status:** ON (All 4 members on camera simultaneously)

* **[4:30 – 4:38] Harsha & All Members:**
  > *"In Sprint 4, ELABS successfully delivered a comprehensive, automated laboratory inventory management platform—integrating our web portal, transactional backend, optical hardware tracking, and intelligent AI assistant. Thank you!"*

---

## Final Verification Checklist Before Recording:
- [ ] **Strict Time Limit:** Ensure total recorded time is strictly **under 5:00** (Ideal: 4:30 – 4:40).
- [ ] **Camera:** All 4 members (Harsha, Priyan, Pamudu, Imal) have their webcams turned **ON** during their speaking segments.
- [ ] **Inventory Focus:** Confirm the presentation focuses exclusively on **Sprint 4 Inventory Management** tasks.
- [ ] **Naming Conventions:**
  - Video: `GroupNumber_Video.mp4` (e.g., `Group05_Video.mp4`)
  - Document: `GroupNumber_Summary.pdf` (e.g., `Group05_Summary.pdf`)
- [ ] **Deadline:** Submit on or before **30 September 2026**.
