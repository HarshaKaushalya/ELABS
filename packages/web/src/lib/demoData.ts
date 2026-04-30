/* ===== LAB DATA ===== */
export const labs = [
  { name: "Electronics Laboratory", block: "Block A", occupancy: "18/25", fill: 72, manager: "Hafiz Zakaria", items: 84, available: 61, courses: 4, color: "#1dd5e6" },
  { name: "Power Systems Laboratory", block: "Block A", occupancy: "8/20", fill: 40, manager: "Ahmad Farid", items: 56, available: 47, courses: 3, color: "#f3ae2a" },
  { name: "Communication Laboratory", block: "Block B", occupancy: "0/20", fill: 0, manager: "Siti Mariam", items: 42, available: 38, courses: 2, color: "#7d5cff" },
  { name: "Biomedical Laboratory", block: "Block B", occupancy: "12/24", fill: 50, manager: "Dr. Rashidah", items: 38, available: 30, courses: 2, color: "#ff4d57" },
  { name: "Software Laboratory", block: "Block C", occupancy: "28/30", fill: 93, manager: "Nizam Hassan", items: 62, available: 30, courses: 5, color: "#a798ff" },
  { name: "Undergraduate Research Lab", block: "Block D", occupancy: "3/15", fill: 20, manager: "Dr. Lim Wei", items: 28, available: 25, courses: 1, color: "#18d18f" },
];

/* ===== INVENTORY TABLE DATA ===== */
export const inventoryRows = [
  { tag: "ELABS-EL-0001", name: "Oscilloscope DS1054Z", category: "Measurement", lab: "Electronics Lab", status: "Available" as const, condition: "Good", borrower: "—" },
  { tag: "ELABS-PS-0002", name: "High Voltage Probe P6139A", category: "Probe", lab: "Power Systems Lab", status: "Available" as const, condition: "Excellent", borrower: "—" },
  { tag: "ELABS-PS-0003", name: "Oscilloscope TDS2024C", category: "Measurement", lab: "Power Systems Lab", status: "Out of Service" as const, condition: "Damaged", borrower: "—" },
  { tag: "ELABS-CM-0001", name: "Spectrum Analyzer FSH8", category: "RF Instrument", lab: "Communication Lab", status: "Available" as const, condition: "Good", borrower: "—" },
  { tag: "ELABS-CM-0002", name: "Signal Generator N5181A", category: "Signal Source", lab: "Communication Lab", status: "Borrowed" as const, condition: "Good", borrower: "Khairul Anw..." },
  { tag: "ELABS-BM-0001", name: "ECG Simulator ProSim 2", category: "Biomedical", lab: "Biomedical Lab", status: "Available" as const, condition: "Good", borrower: "—" },
  { tag: "ELABS-SW-0001", name: "Raspberry Pi 4 Kit", category: "Computing", lab: "Software Lab", status: "Borrowed" as const, condition: "Good", borrower: "Nurul Ain" },
  { tag: "ELABS-EL-0004", name: "LCR Meter IM3523", category: "Measurement", lab: "Electronics Lab", status: "Available" as const, condition: "Good", borrower: "—" },
  { tag: "ELABS-EL-0005", name: "Soldering Station FX-951", category: "Assembly", lab: "Electronics Lab", status: "Available" as const, condition: "Good", borrower: "—" },
];

/* ===== ATTENDANCE DATA ===== */
export const attendanceRows = [
  ["Amirul Hakim", "2021850034", "Electronics Lab", "09:35 AM", "—", "Card", "Present"],
  ["Vihanga Senanayake", "2021850041", "Electronics Lab", "09:37 AM", "—", "Card", "Present"],
  ["Kavisha Bandara", "2021850062", "Electronics Lab", "08:30 AM", "09:20 AM", "Barcode", "Exited"],
  ["Chathura Weerasinghe", "2021850078", "Power Systems Lab", "10:15 AM", "—", "Card", "Present"],
  ["Gayantha Karunaratne", "2021850019", "Communication Lab", "09:51 AM", "—", "Barcode", "Present"],
];

/* ===== COURSE DATA ===== */
export const courseCards = [
  { code: "EE501", name: "Digital Electronics", credits: "3 Credits", lab: "Electronics Lab", instructor: "Dr. Siti Nora", schedule: "Mon & Wed 2PM", students: "32 students", progress: 65, grade: "A-", nextClass: "Today 2:00 PM", gradeColor: "#1dd5e6" },
  { code: "EE403", name: "Power Systems Analysis", credits: "4 Credits", lab: "Power Systems Lab", instructor: "Dr. Ahmad Rashid", schedule: "Tue & Thu 10AM", students: "28 students", progress: 45, grade: "B+", nextClass: "Tomorrow 10:00 AM", gradeColor: "#f3ae2a" },
  { code: "EE601", name: "Advanced Communication Systems", credits: "3 Credits", lab: "Communication Lab", instructor: "Dr. Rashidah", schedule: "Fri 9AM-12PM", students: "24 students", progress: 80, grade: "A", nextClass: "Fri 9:00 AM", gradeColor: "#3d83f6" },
  { code: "EE450", name: "Biomedical Instrumentation", credits: "3 Credits", lab: "Biomedical Lab", instructor: "Dr. Siti Nora", schedule: "Wed 9AM-12PM", students: "20 students", progress: 30, grade: "B", nextClass: "Wed 9:00 AM", gradeColor: "#ff4d57" },
  { code: "CS401", name: "Embedded Systems Programming", credits: "3 Credits", lab: "Software Lab", instructor: "Dr. Nizam Hassan", schedule: "Mon & Thu 4PM", students: "36 students", progress: 55, grade: "A", nextClass: "Mon 4:00 PM", gradeColor: "#18d18f" },
];

/* ===== MESSAGE THREADS ===== */
export const messageThreads = [
  {
    id: "t1",
    name: "Dr. Siti Nora",
    initials: "SN",
    color: "#18d18f",
    role: "Lecturer",
    time: "10:45 AM",
    unread: 2,
    preview: "Please submit your lab repor...",
    online: true,
    messages: [
      { from: "them", text: "Hello Amirul, please make sure you complete the pre-lab reading before today's session.", time: "8:30 AM" },
      { from: "me", text: "Good morning Dr. Siti. Yes, I have reviewed Chapter 4 and the logic gate diagrams.", time: "9:00 AM" },
      { from: "them", text: "Great! Also, please bring your lab worksheet. Today we'll be doing the full circuit implementation.", time: "9:05 AM" },
      { from: "me", text: "Understood. Will do!", time: "9:10 AM" },
    ],
  },
  {
    id: "t2",
    name: "Hafiz Zakaria",
    initials: "HZ",
    color: "#3d83f6",
    role: "Technician",
    time: "09:22 AM",
    unread: 0,
    preview: "The oscilloscope ELABS-EL-0012 ...",
    online: false,
    messages: [
      { from: "them", text: "The oscilloscope ELABS-EL-0012 is now calibrated and ready for your lab session.", time: "09:22 AM" },
      { from: "me", text: "Great, thanks Hafiz!", time: "09:25 AM" },
    ],
  },
  {
    id: "t3",
    name: "EE501 Group Chat",
    initials: "EE",
    color: "#7d5cff",
    role: "Group · 32 Members",
    time: "Yesterday",
    unread: 5,
    preview: "Rizwan: Anyone have the so...",
    online: false,
    messages: [
      { from: "them", text: "Anyone have the solutions for Tutorial 3?", time: "Yesterday" },
      { from: "me", text: "I'll share mine after the lab session.", time: "Yesterday" },
    ],
  },
  {
    id: "t4",
    name: "Dr. Ahmad Rashid",
    initials: "AR",
    color: "#f3ae2a",
    role: "Admin / Lecturer",
    time: "Mar 7",
    unread: 0,
    preview: "Your borrow request has been ap...",
    online: false,
    messages: [
      { from: "them", text: "Your borrow request has been approved. Please collect the items from the lab.", time: "Mar 7" },
    ],
  },
];

/* ===== NOTIFICATIONS ===== */
export const notifications = [
  { title: "Overdue Return — 5 Items", body: "5 borrowed items are overdue (>7 days). Borrowers: Amirul Hakim (2 items), Rizwan Yusuf (2 items), Danial Irfan (1 item). Immediate action required.", type: "danger" as const, category: "inventory", time: "Just now", actionLabel: "View Items →", unread: true },
  { title: "Item Condition Flagged", body: "Oscilloscope ELABS-PS-0003 has been flagged as damaged by Technician Hafiz. The item has been placed under Out-of-Service status. Maintenance request pending.", type: "warn" as const, category: "inventory", time: "1h ago", actionLabel: "View Item →", unread: false },
  { title: "High Occupancy Alert", body: "Electronics Lab (EL-LAB) is at 72% occupancy (18/25). Monitor closely — facility rules require attention above 80%.", type: "warn" as const, category: "access", time: "2h ago", actionLabel: undefined, unread: false },
  { title: "Scheduled Maintenance — Biomedical Lab", body: "Biomedical Lab (BM-LAB) has scheduled maintenance on Saturday 9:00 AM. The lab will be unavailable for 4 hours.", type: "info" as const, category: "system", time: "3h ago", actionLabel: undefined, unread: false },
];

/* ===== CHART DATA ===== */
export const labUtilizationData = {
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  electronics: [55, 70, 85, 90, 75, 50, 30],
  powerSystems: [40, 55, 70, 65, 55, 35, 15],
  software: [50, 60, 72, 68, 45, 25, 10],
};
