"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import {
  Users,
  LogIn,
  LogOut,
  Clock,
  Barcode,
  Camera,
  Search,
  RefreshCw,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
  Download,
  Calendar,
  X,
  Building2,
  GraduationCap,
  Sparkles,
} from "lucide-react";

type Lab = {
  id: number;
  name: string;
  location?: string;
  floor?: string;
};

type ActiveStudent = {
  recordId: number;
  labId: number;
  labName: string;
  studentId: number;
  entryTime: string;
  method: string;
  durationMinutes: number;
  durationFormatted: string;
  fullName: string;
  email: string;
  regNo: string;
  groupCode: string;
  department: string;
  semester: number;
};

type HistoryRecord = {
  recordId: number;
  labId: number;
  labName: string;
  studentId: number;
  entryTime: string;
  exitTime: string | null;
  method: string;
  durationMinutes: number;
  durationFormatted: string;
  status: "ACTIVE" | "COMPLETED";
  fullName: string;
  email: string;
  regNo: string;
  groupCode: string;
  department: string;
  semester: number;
};

type Stats = {
  totalToday: number;
  activeNow: number;
  completedToday: number;
  avgMinutes: number;
  hourly: {
    label: string;
    hour: number;
    entries: number;
    exits: number;
  }[];
};

type ScanFeedback = {
  type: "success_entry" | "success_exit" | "error" | "warning";
  title: string;
  message: string;
  student?: {
    id: number;
    fullName: string;
    regNo: string;
    email: string;
    groupCode?: string;
    department?: string;
    semester?: number;
  };
  durationFormatted?: string;
  timestamp: string;
};

export default function AttendancePage() {
  // Laboratories state
  const [labs, setLabs] = useState<Lab[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<number>(1);
  const [labsLoading, setLabsLoading] = useState(true);

  // Scanner state
  const [scanMode, setScanMode] = useState<"AUTO" | "ENTRY" | "EXIT">("AUTO");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  // View & Tab state
  const [activeTab, setActiveTab] = useState<"live" | "history" | "analytics">("live");

  // Live occupancy state
  const [activeList, setActiveList] = useState<ActiveStudent[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveSearch, setLiveSearch] = useState("");
  const [exitingId, setExitingId] = useState<number | null>(null);
  const [showExitAllModal, setShowExitAllModal] = useState(false);
  const [isExitingAll, setIsExitingAll] = useState(false);

  // History state
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(15);
  const [historyDate, setHistoryDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [historySearch, setHistorySearch] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);

  // Analytics stats
  const [stats, setStats] = useState<Stats>({
    totalToday: 0,
    activeNow: 0,
    completedToday: 0,
    avgMinutes: 0,
    hourly: [],
  });

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Web Audio synthesizer for pleasant scanning sounds without external assets
  const playChime = useCallback((type: "entry" | "exit" | "error") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === "entry") {
        // High harmonic rising chime
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === "exit") {
        // Soft mellow descending chime
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.14); // C5
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else {
        // Double low buzz for error
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(146.83, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // Audio playback fails silently if browser policy blocks it
    }
  }, [soundEnabled]);

  // Load labs on mount
  useEffect(() => {
    async function fetchLabs() {
      try {
        setLabsLoading(true);
        const res = await apiFetch("/labs");
        if (res.ok) {
          const data = await res.json();
          if (data.labs && data.labs.length > 0) {
            setLabs(data.labs);
            setSelectedLabId(data.labs[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load labs:", err);
      } finally {
        setLabsLoading(false);
      }
    }
    fetchLabs();
  }, []);

  // Fetch active students in selected lab
  const fetchActive = useCallback(async (labId: number) => {
    try {
      setLiveLoading(true);
      const res = await apiFetch(`/attendance/active?labId=${labId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveList(data.activeStudents || []);
      }
    } catch (err) {
      console.error("Failed to fetch active students:", err);
    } finally {
      setLiveLoading(false);
    }
  }, []);

  // Fetch stats for selected lab
  const fetchStats = useCallback(async (labId: number) => {
    try {
      const res = await apiFetch(`/attendance/stats?labId=${labId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  // Fetch history records
  const fetchHistory = useCallback(async (labId: number, page: number, date: string, search: string) => {
    try {
      setHistoryLoading(true);
      const query = new URLSearchParams({
        labId: String(labId),
        page: String(page),
        limit: String(historyLimit),
      });
      if (date) query.set("date", date);
      if (search) query.set("search", search);

      const res = await apiFetch(`/attendance/history?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryRecords(data.records || []);
        setHistoryTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyLimit]);

  // Trigger data reload when selectedLab changes
  useEffect(() => {
    if (selectedLabId) {
      fetchActive(selectedLabId);
      fetchStats(selectedLabId);
      if (activeTab === "history") {
        fetchHistory(selectedLabId, historyPage, historyDate, historySearch);
      }
    }
  }, [selectedLabId, activeTab, historyPage, historyDate, fetchActive, fetchStats, fetchHistory, historySearch]);

  // Periodic polling for real-time presence sync (every 12 seconds)
  useEffect(() => {
    if (!selectedLabId) return;
    const interval = setInterval(() => {
      fetchActive(selectedLabId);
      fetchStats(selectedLabId);
    }, 12000);
    return () => clearInterval(interval);
  }, [selectedLabId, fetchActive, fetchStats]);

  // Maintain auto-focus on scanner input
  useEffect(() => {
    if (!cameraModalOpen && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [cameraModalOpen, activeTab]);

  // Handle Barcode Scan / Submission
  const handleProcessScan = async (codeToScan: string, method = "BARCODE") => {
    const raw = codeToScan.trim();
    if (!raw) return;

    setIsScanning(true);
    setBarcodeInput("");

    try {
      const res = await apiFetch("/attendance/scan", {
        method: "POST",
        body: JSON.stringify({
          labId: selectedLabId,
          barcode: raw,
          mode: scanMode,
          method,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.action === "ENTRY") {
          playChime("entry");
          setFeedback({
            type: "success_entry",
            title: `ENTRY VERIFIED — ${data.student?.fullName || "Student"}`,
            message: data.message || `Checked in to ${data.labName}`,
            student: data.student,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          });
        } else {
          playChime("exit");
          setFeedback({
            type: "success_exit",
            title: `EXIT RECORDED — ${data.student?.fullName || "Student"}`,
            message: data.message || `Checked out of ${data.labName}`,
            student: data.student,
            durationFormatted: data.durationFormatted,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          });
        }

        // Refresh active list and stats
        fetchActive(selectedLabId);
        fetchStats(selectedLabId);
        if (activeTab === "history") {
          fetchHistory(selectedLabId, historyPage, historyDate, historySearch);
        }
      } else {
        playChime("error");
        setFeedback({
          type: "error",
          title: "SCAN REJECTED",
          message: data.error || "Student record could not be processed.",
          student: data.student,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        });
      }
    } catch (err: any) {
      playChime("error");
      setFeedback({
        type: "error",
        title: "NETWORK ERROR",
        message: err?.message || "Could not reach the attendance service.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      });
    } finally {
      setIsScanning(false);
      // Re-focus input after scan
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  };

  // Form submit handler
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      handleProcessScan(barcodeInput, "MANUAL");
    }
  };

  // Manual individual student exit
  const handleManualExit = async (recordId: number, studentName: string) => {
    try {
      setExitingId(recordId);
      const res = await apiFetch("/attendance/manual-exit", {
        method: "POST",
        body: JSON.stringify({ recordId }),
      });
      if (res.ok) {
        playChime("exit");
        setFeedback({
          type: "success_exit",
          title: `MANUAL EXIT RECORDED`,
          message: `Checked out ${studentName}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        });
        fetchActive(selectedLabId);
        fetchStats(selectedLabId);
      }
    } catch (err) {
      console.error("Manual exit failed:", err);
    } finally {
      setExitingId(null);
    }
  };

  // Exit all students in currently selected lab
  const handleExitAll = async () => {
    try {
      setIsExitingAll(true);
      const res = await apiFetch("/attendance/exit-all", {
        method: "POST",
        body: JSON.stringify({ labId: selectedLabId }),
      });
      if (res.ok) {
        playChime("exit");
        const data = await res.json();
        setFeedback({
          type: "success_exit",
          title: `ALL OCCUPANTS CHECKED OUT`,
          message: data.message || `Successfully checked out all students`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        });
        setShowExitAllModal(false);
        fetchActive(selectedLabId);
        fetchStats(selectedLabId);
      }
    } catch (err) {
      console.error("Exit all failed:", err);
    } finally {
      setIsExitingAll(false);
    }
  };

  // Export CSV function
  const handleExportCSV = () => {
    if (historyRecords.length === 0) return;
    const headers = [
      "Record ID",
      "Student Name",
      "Registration Number",
      "Group Code",
      "Department",
      "Laboratory",
      "Scan Method",
      "Entry Time",
      "Exit Time",
      "Duration (Mins)",
      "Status",
    ];

    const rows = historyRecords.map((r) => [
      r.recordId,
      `"${r.fullName.replace(/"/g, '""')}"`,
      `"${r.regNo || ""}"`,
      `"${r.groupCode || ""}"`,
      `"${r.department || ""}"`,
      `"${r.labName.replace(/"/g, '""')}"`,
      r.method,
      `"${new Date(r.entryTime).toLocaleString()}"`,
      r.exitTime ? `"${new Date(r.exitTime).toLocaleString()}"` : '"Inside"',
      r.durationMinutes,
      r.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `ELABS_Attendance_${historyDate || "report"}_Lab_${selectedLabId}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter active students by keyword
  const filteredActive = activeList.filter((s) => {
    if (!liveSearch.trim()) return true;
    const q = liveSearch.toLowerCase();
    return (
      s.fullName?.toLowerCase().includes(q) ||
      s.regNo?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.groupCode?.toLowerCase().includes(q)
    );
  });

  const selectedLabObj = labs.find((l) => l.id === selectedLabId);

  return (
    <AppShell
      title="Attendance & Access Control"
      subtitle="Barcode scanner terminal and automated laboratory presence tracking"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* TOP BAR CONTROLS: Lab Selector, Mode Pills, Audio Toggle */}
        <section
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: 16,
            padding: "16px 20px",
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Lab Selector Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 280, flex: "1 1 300px" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(29, 213, 230, 0.12)",
                border: "1px solid rgba(29, 213, 230, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--cyan)",
              }}
            >
              <Building2 size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 3,
                }}
              >
                Target Laboratory
              </label>
              <select
                value={selectedLabId}
                onChange={(e) => setSelectedLabId(Number(e.target.value))}
                disabled={labsLoading}
                style={{
                  width: "100%",
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: "var(--text)",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {labs.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name} {lab.location ? `• ${lab.location}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Pill Selectors */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginRight: 4,
              }}
            >
              Scan Mode:
            </span>
            <div
              style={{
                display: "inline-flex",
                background: "var(--bg)",
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: 3,
                gap: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setScanMode("AUTO")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 7,
                  border: "none",
                  background: scanMode === "AUTO" ? "linear-gradient(135deg, #1dd5e6, #18d18f)" : "transparent",
                  color: scanMode === "AUTO" ? "#041224" : "var(--muted)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <Sparkles size={14} />
                Smart Auto
              </button>

              <button
                type="button"
                onClick={() => setScanMode("ENTRY")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 7,
                  border: "none",
                  background: scanMode === "ENTRY" ? "#18d18f" : "transparent",
                  color: scanMode === "ENTRY" ? "#041224" : "var(--muted)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <LogIn size={14} />
                Entry Only
              </button>

              <button
                type="button"
                onClick={() => setScanMode("EXIT")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 7,
                  border: "none",
                  background: scanMode === "EXIT" ? "#3d83f6" : "transparent",
                  color: scanMode === "EXIT" ? "#ffffff" : "var(--muted)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <LogOut size={14} />
                Exit Only
              </button>
            </div>
          </div>

          {/* Quick Actions: Audio sound toggle and refresh */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Audio chimes active (Click to mute)" : "Audio muted (Click to enable)"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: soundEnabled ? "rgba(24, 209, 143, 0.1)" : "rgba(255, 77, 87, 0.1)",
                color: soundEnabled ? "#18d18f" : "#ff4d57",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              {soundEnabled ? "Chimes On" : "Muted"}
            </button>

            <button
              type="button"
              onClick={() => {
                fetchActive(selectedLabId);
                fetchStats(selectedLabId);
                if (activeTab === "history") {
                  fetchHistory(selectedLabId, historyPage, historyDate, historySearch);
                }
              }}
              title="Refresh attendance records"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--bg)",
                color: "var(--text)",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} className={liveLoading ? "spin" : ""} />
              Sync
            </button>
          </div>
        </section>

        {/* STATS SUMMARY KPI CARDS */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {/* Card 1: Active inside */}
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "18px 20px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: "#18d18f",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Currently Inside
                </span>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "#18d18f",
                    marginTop: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {stats.activeNow}
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#18d18f",
                      display: "inline-block",
                      boxShadow: "0 0 10px #18d18f",
                      animation: "pulse 2s infinite",
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(24, 209, 143, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#18d18f",
                }}
              >
                <Users size={20} />
              </div>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "var(--muted)" }}>
              {selectedLabObj ? selectedLabObj.name : "Selected lab"} active headcount
            </p>
          </div>

          {/* Card 2: Today's Entries */}
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "18px 20px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: "var(--cyan)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Total Entries Today
                </span>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "var(--cyan)",
                    marginTop: 4,
                  }}
                >
                  {stats.totalToday}
                </div>
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(29, 213, 230, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--cyan)",
                }}
              >
                <LogIn size={20} />
              </div>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "var(--muted)" }}>
              Cumulative check-ins recorded today
            </p>
          </div>

          {/* Card 3: Exits Completed */}
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "18px 20px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: "var(--blue)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Completed Sessions
                </span>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "var(--blue)",
                    marginTop: 4,
                  }}
                >
                  {stats.completedToday}
                </div>
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(61, 131, 246, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--blue)",
                }}
              >
                <LogOut size={20} />
              </div>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "var(--muted)" }}>
              Check-outs logged with duration
            </p>
          </div>

          {/* Card 4: Avg Duration */}
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "18px 20px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: "var(--amber)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Average Session
                </span>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "var(--amber)",
                    marginTop: 4,
                  }}
                >
                  {stats.avgMinutes > 0 ? `${stats.avgMinutes}m` : "0m"}
                </div>
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(243, 174, 42, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--amber)",
                }}
              >
                <Clock size={20} />
              </div>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "var(--muted)" }}>
              Average time spent per lab session
            </p>
          </div>
        </section>

        {/* SCANNER CONSOLE & BARCODE TERMINAL */}
        <section
          style={{
            background: "linear-gradient(135deg, rgba(15, 34, 68, 0.95), rgba(10, 23, 50, 0.95))",
            border: "1px solid var(--cyan)",
            borderRadius: 16,
            padding: "24px",
            boxShadow: "0 8px 32px rgba(29, 213, 230, 0.08)",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "rgba(29, 213, 230, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--cyan)",
                }}
              >
                <Barcode size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text)" }}>
                  Student ID Barcode Scanner Console
                </h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)" }}>
                  Scan barcode with handheld USB laser gun or webcam to log Entry &amp; Exit
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => setCameraModalOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(29, 213, 230, 0.3)",
                  background: "rgba(29, 213, 230, 0.12)",
                  color: "var(--cyan)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <Camera size={16} />
                Camera Scanner
              </button>
            </div>
          </div>

          {/* Scanner Input Form */}
          <form onSubmit={handleScanSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                position: "relative",
              }}
            >
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan Student ID card barcode or enter Reg No (e.g. EG/2022/4904 or 4904)..."
                  disabled={isScanning}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "rgba(5, 12, 29, 0.9)",
                    border: "2px solid #204072",
                    borderRadius: 12,
                    padding: "16px 20px 16px 50px",
                    color: "#ffffff",
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    outline: "none",
                    boxShadow: isScanning
                      ? "0 0 15px rgba(29, 213, 230, 0.5)"
                      : "0 2px 10px rgba(0, 0, 0, 0.3)",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--cyan)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#204072";
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 18,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--cyan)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Barcode size={22} />
                </div>
              </div>

              <button
                type="submit"
                disabled={isScanning || !barcodeInput.trim()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0 28px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #1dd5e6 0%, #18d18f 100%)",
                  color: "#041224",
                  fontSize: "1rem",
                  fontWeight: 700,
                  cursor: isScanning || !barcodeInput.trim() ? "not-allowed" : "pointer",
                  opacity: isScanning || !barcodeInput.trim() ? 0.6 : 1,
                  boxShadow: "0 4px 14px rgba(29, 213, 230, 0.3)",
                }}
              >
                {isScanning ? (
                  <>
                    <RefreshCw size={18} className="spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Process Scan
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick instructions and helper notice */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
              fontSize: "0.78rem",
              color: "var(--muted)",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span>
              💡 <strong>Instant USB Scanning:</strong> Connect any standard USB barcode gun. Card scans are auto-detected and processed on Enter.
            </span>
            <span>
              Target: <strong style={{ color: "var(--text)" }}>{selectedLabObj?.name || "Lab"}</strong>
            </span>
          </div>

          {/* Scan Feedback Banner / Flash Card */}
          {feedback && (
            <div
              style={{
                marginTop: 18,
                padding: "16px 20px",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
                background:
                  feedback.type === "success_entry"
                    ? "rgba(24, 209, 143, 0.15)"
                    : feedback.type === "success_exit"
                    ? "rgba(61, 131, 246, 0.15)"
                    : "rgba(255, 77, 87, 0.15)",
                border:
                  feedback.type === "success_entry"
                    ? "1px solid #18d18f"
                    : feedback.type === "success_exit"
                    ? "1px solid #3d83f6"
                    : "1px solid #ff4d57",
                animation: "fadeIn 0.25s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      feedback.type === "success_entry"
                        ? "rgba(24, 209, 143, 0.25)"
                        : feedback.type === "success_exit"
                        ? "rgba(61, 131, 246, 0.25)"
                        : "rgba(255, 77, 87, 0.25)",
                    color:
                      feedback.type === "success_entry"
                        ? "#18d18f"
                        : feedback.type === "success_exit"
                        ? "#3d83f6"
                        : "#ff4d57",
                  }}
                >
                  {feedback.type === "success_entry" ? (
                    <LogIn size={24} />
                  ) : feedback.type === "success_exit" ? (
                    <LogOut size={24} />
                  ) : (
                    <AlertCircle size={24} />
                  )}
                </div>

                <div>
                  <h4
                    style={{
                      margin: "0 0 2px",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color:
                        feedback.type === "success_entry"
                          ? "#18d18f"
                          : feedback.type === "success_exit"
                          ? "#60a5fa"
                          : "#ff4d57",
                    }}
                  >
                    {feedback.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text)" }}>
                    {feedback.message}
                  </p>
                </div>
              </div>

              {/* Student Details Pill if available */}
              {feedback.student && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "rgba(5, 12, 29, 0.6)",
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--line)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text)" }}>
                      {feedback.student.regNo || feedback.student.email}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      Group: <span style={{ color: "var(--cyan)", fontWeight: 600 }}>{feedback.student.groupCode || "EE01"}</span>
                      {feedback.durationFormatted && (
                        <> • Duration: <span style={{ color: "var(--amber)", fontWeight: 600 }}>{feedback.durationFormatted}</span></>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontStyle: "italic" }}>
                    {feedback.timestamp}
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* SUB-TABS NAVIGATION: Live Occupancy vs History vs Analytics */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--line)",
            paddingBottom: 4,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setActiveTab("live")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                border: "none",
                borderRadius: "10px 10px 0 0",
                background: activeTab === "live" ? "var(--panel)" : "transparent",
                color: activeTab === "live" ? "var(--cyan)" : "var(--muted)",
                fontWeight: 700,
                fontSize: "0.92rem",
                cursor: "pointer",
                borderBottom: activeTab === "live" ? "2px solid var(--cyan)" : "2px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              <Users size={16} />
              Live Presence ({activeList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                border: "none",
                borderRadius: "10px 10px 0 0",
                background: activeTab === "history" ? "var(--panel)" : "transparent",
                color: activeTab === "history" ? "var(--cyan)" : "var(--muted)",
                fontWeight: 700,
                fontSize: "0.92rem",
                cursor: "pointer",
                borderBottom: activeTab === "history" ? "2px solid var(--cyan)" : "2px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              <Calendar size={16} />
              Attendance History &amp; Audit
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                border: "none",
                borderRadius: "10px 10px 0 0",
                background: activeTab === "analytics" ? "var(--panel)" : "transparent",
                color: activeTab === "analytics" ? "var(--cyan)" : "var(--muted)",
                fontWeight: 700,
                fontSize: "0.92rem",
                cursor: "pointer",
                borderBottom: activeTab === "analytics" ? "2px solid var(--cyan)" : "2px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              <Clock size={16} />
              Traffic Analytics
            </button>
          </div>

          {activeTab === "live" && activeList.length > 0 && (
            <button
              type="button"
              onClick={() => setShowExitAllModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255, 77, 87, 0.4)",
                background: "rgba(255, 77, 87, 0.12)",
                color: "#ff4d57",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <LogOut size={14} />
              Exit All Occupants ({activeList.length})
            </button>
          )}

          {activeTab === "history" && (
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={historyRecords.length === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--bg)",
                color: "var(--text)",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: historyRecords.length === 0 ? "not-allowed" : "pointer",
                opacity: historyRecords.length === 0 ? 0.6 : 1,
              }}
            >
              <Download size={14} />
              Export CSV
            </button>
          )}
        </div>

        {/* TAB 1: LIVE PRESENCE */}
        {activeTab === "live" && (
          <section
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 16,
              padding: "20px",
            }}
          >
            {/* Header with Search and Headcount */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 20,
                    background: "rgba(24, 209, 143, 0.15)",
                    color: "#18d18f",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#18d18f",
                      boxShadow: "0 0 8px #18d18f",
                    }}
                  />
                  LIVE MONITORING
                </span>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                  Active Students in {selectedLabObj?.name || "Laboratory"}
                </h3>
              </div>

              <div style={{ position: "relative", minWidth: 260 }}>
                <input
                  type="text"
                  value={liveSearch}
                  onChange={(e) => setLiveSearch(e.target.value)}
                  placeholder="Filter by name, reg no, group..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "var(--bg)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: "8px 12px 8px 34px",
                    color: "var(--text)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
                <Search
                  size={15}
                  style={{
                    position: "absolute",
                    left: 11,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--muted)",
                  }}
                />
              </div>
            </div>

            {/* Active Students Table / Empty State */}
            {liveLoading && activeList.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                <RefreshCw size={24} className="spin" style={{ margin: "0 auto 10px" }} />
                Loading current occupants...
              </div>
            ) : filteredActive.length === 0 ? (
              <div
                style={{
                  padding: "50px 20px",
                  textAlign: "center",
                  background: "rgba(5, 12, 29, 0.4)",
                  borderRadius: 12,
                  border: "1px dashed var(--line)",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "rgba(126, 165, 214, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    color: "var(--muted)",
                  }}
                >
                  <Users size={28} />
                </div>
                <h4 style={{ margin: "0 0 6px", fontSize: "1rem", color: "var(--text)" }}>
                  {liveSearch ? "No matching students found" : "No students currently inside"}
                </h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
                  {liveSearch
                    ? "Try adjusting your search filter keywords."
                    : `Scan student barcodes at the entry station to register attendance into ${selectedLabObj?.name || "this lab"}.`}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left", color: "var(--muted)" }}>
                      <th style={{ padding: "12px 14px", fontWeight: 600 }}>Student</th>
                      <th style={{ padding: "12px 14px", fontWeight: 600 }}>Reg No / ID</th>
                      <th style={{ padding: "12px 14px", fontWeight: 600 }}>Group</th>
                      <th style={{ padding: "12px 14px", fontWeight: 600 }}>Entry Time</th>
                      <th style={{ padding: "12px 14px", fontWeight: 600 }}>Elapsed Time</th>
                      <th style={{ padding: "12px 14px", fontWeight: 600 }}>Method</th>
                      <th style={{ padding: "12px 14px", fontWeight: 600, textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActive.map((student) => {
                      const initials = student.fullName
                        ? student.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()
                        : "ST";

                      return (
                        <tr
                          key={student.recordId}
                          style={{
                            borderBottom: "1px solid rgba(32, 64, 114, 0.5)",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "rgba(18, 42, 84, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                          }}
                        >
                          {/* Student Name & Avatar */}
                          <td style={{ padding: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: "50%",
                                  background: "linear-gradient(135deg, #18d18f, #1dd5e6)",
                                  color: "#041224",
                                  fontWeight: 700,
                                  fontSize: "0.8rem",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                {initials}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: "var(--text)" }}>{student.fullName}</div>
                                <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>{student.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Reg No */}
                          <td style={{ padding: "14px" }}>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontWeight: 700,
                                color: "var(--cyan)",
                                background: "rgba(29, 213, 230, 0.08)",
                                padding: "4px 8px",
                                borderRadius: 6,
                                border: "1px solid rgba(29, 213, 230, 0.2)",
                              }}
                            >
                              {student.regNo || "—"}
                            </span>
                          </td>

                          {/* Group Code */}
                          <td style={{ padding: "14px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "3px 8px",
                                borderRadius: 6,
                                background: "rgba(61, 131, 246, 0.12)",
                                color: "var(--blue)",
                                fontWeight: 600,
                                fontSize: "0.78rem",
                              }}
                            >
                              <GraduationCap size={13} />
                              {student.groupCode || "General"}
                            </span>
                          </td>

                          {/* Entry Time */}
                          <td style={{ padding: "14px", color: "var(--text)" }}>
                            {new Date(student.entryTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          {/* Elapsed Time */}
                          <td style={{ padding: "14px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                color: "#18d18f",
                                fontWeight: 600,
                              }}
                            >
                              <Clock size={14} />
                              {student.durationFormatted}
                            </span>
                          </td>

                          {/* Method */}
                          <td style={{ padding: "14px" }}>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: "var(--muted)",
                                textTransform: "uppercase",
                              }}
                            >
                              {student.method || "BARCODE"}
                            </span>
                          </td>

                          {/* Action Button: Mark Exit */}
                          <td style={{ padding: "14px", textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => handleManualExit(student.recordId, student.fullName)}
                              disabled={exitingId === student.recordId}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 14px",
                                borderRadius: 8,
                                border: "1px solid rgba(255, 77, 87, 0.3)",
                                background: "rgba(255, 77, 87, 0.1)",
                                color: "#ff4d57",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                cursor: exitingId === student.recordId ? "not-allowed" : "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <LogOut size={13} />
                              {exitingId === student.recordId ? "Exiting..." : "Mark Exit"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: AUDIT HISTORY */}
        {activeTab === "history" && (
          <section
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 16,
              padding: "20px",
            }}
          >
            {/* History Filter Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={16} style={{ color: "var(--muted)" }} />
                  <input
                    type="date"
                    value={historyDate}
                    onChange={(e) => {
                      setHistoryDate(e.target.value);
                      setHistoryPage(1);
                    }}
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "var(--text)",
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ position: "relative", minWidth: 240 }}>
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => {
                      setHistorySearch(e.target.value);
                      setHistoryPage(1);
                    }}
                    placeholder="Search name, reg no, group..."
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "var(--bg)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      padding: "8px 12px 8px 34px",
                      color: "var(--text)",
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  />
                  <Search
                    size={15}
                    style={{
                      position: "absolute",
                      left: 11,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--muted)",
                    }}
                  />
                </div>
              </div>

              <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                Showing <strong>{historyRecords.length}</strong> of <strong>{historyTotal}</strong> records
              </div>
            </div>

            {/* History Table */}
            {historyLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                <RefreshCw size={24} className="spin" style={{ margin: "0 auto 10px" }} />
                Loading attendance history...
              </div>
            ) : historyRecords.length === 0 ? (
              <div
                style={{
                  padding: "50px 20px",
                  textAlign: "center",
                  background: "rgba(5, 12, 29, 0.4)",
                  borderRadius: 12,
                  border: "1px dashed var(--line)",
                }}
              >
                <Clock size={32} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
                <h4 style={{ margin: "0 0 6px", fontSize: "1rem", color: "var(--text)" }}>
                  No attendance records found
                </h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
                  No student check-ins logged for the selected date or filter query.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left", color: "var(--muted)" }}>
                      <th style={{ padding: "12px 14px", fontWeight: 600 }}>Student</th>
                      <th style={{ padding: "12px 14px", fontWeight: 600 }}>Reg No</th>
                      <th style={{ padding: "12px 14px", fontWeight: 600 }}>Group</th>
                      <th style={{ padding: "12px 14px", fontWeight: 600 }}>Laboratory</th>
                      <th style={{ padding: "12px 14px", fontWeight: 600 }}>Entry</th>
                      <th style={{ padding: "12px 14px", fontWeight: 600 }}>Exit</th>
                      <th style={{ padding: "12px 14px", fontWeight: 600 }}>Duration</th>
                      <th style={{ padding: "12px 14px", fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRecords.map((r) => (
                      <tr
                        key={r.recordId}
                        style={{
                          borderBottom: "1px solid rgba(32, 64, 114, 0.4)",
                        }}
                      >
                        <td style={{ padding: "12px 14px" }}>
                          <strong style={{ color: "var(--text)" }}>{r.fullName}</strong>
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{r.email}</div>
                        </td>
                        <td style={{ padding: "12px 14px", fontFamily: "monospace", color: "var(--cyan)" }}>
                          {r.regNo || "—"}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: "rgba(61, 131, 246, 0.1)",
                              color: "var(--blue)",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                            }}
                          >
                            {r.groupCode || "General"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", color: "var(--text)" }}>{r.labName}</td>
                        <td style={{ padding: "12px 14px", color: "var(--text)" }}>
                          {new Date(r.entryTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td style={{ padding: "12px 14px", color: "var(--text)" }}>
                          {r.exitTime ? (
                            new Date(r.exitTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          ) : (
                            <span style={{ color: "#18d18f", fontWeight: 600 }}>Active Inside</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px", color: "var(--amber)", fontWeight: 600 }}>
                          {r.durationFormatted}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "3px 8px",
                              borderRadius: 6,
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              background:
                                r.status === "ACTIVE"
                                  ? "rgba(24, 209, 143, 0.15)"
                                  : "rgba(61, 131, 246, 0.15)",
                              color: r.status === "ACTIVE" ? "#18d18f" : "#60a5fa",
                            }}
                          >
                            {r.status === "ACTIVE" ? (
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: "#18d18f",
                                }}
                              />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {historyTotal > historyLimit && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: "1px solid var(--line)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage <= 1}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: "1px solid var(--line)",
                    background: "var(--bg)",
                    color: "var(--text)",
                    fontSize: "0.82rem",
                    cursor: historyPage <= 1 ? "not-allowed" : "pointer",
                    opacity: historyPage <= 1 ? 0.5 : 1,
                  }}
                >
                  Previous
                </button>

                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  Page {historyPage} of {Math.ceil(historyTotal / historyLimit)}
                </span>

                <button
                  type="button"
                  onClick={() => setHistoryPage((p) => p + 1)}
                  disabled={historyPage >= Math.ceil(historyTotal / historyLimit)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: "1px solid var(--line)",
                    background: "var(--bg)",
                    color: "var(--text)",
                    fontSize: "0.82rem",
                    cursor:
                      historyPage >= Math.ceil(historyTotal / historyLimit) ? "not-allowed" : "pointer",
                    opacity: historyPage >= Math.ceil(historyTotal / historyLimit) ? 0.5 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: ANALYTICS & PEAK TRAFFIC */}
        {activeTab === "analytics" && (
          <section
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 16,
              padding: "24px",
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 700 }}>
                Hourly Entry vs Exit Traffic Distribution — Today
              </h3>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
                Analysis of peak student arrival and departure patterns for {selectedLabObj?.name || "Selected Lab"}
              </p>
            </div>

            {/* Dual Bar Chart Component */}
            {stats.hourly && stats.hourly.length > 0 ? (
              <div>
                <div className="dual-bar-chart">
                  {stats.hourly.map((h) => {
                    const maxVal = Math.max(
                      10,
                      ...stats.hourly.map((x) => Math.max(x.entries, x.exits))
                    );
                    const entryH = Math.round((h.entries / maxVal) * 160);
                    const exitH = Math.round((h.exits / maxVal) * 160);

                    return (
                      <div key={h.hour} className="dual-bar-col">
                        <div className="dual-bar-bars">
                          <div
                            className="dual-bar-entry"
                            style={{ height: Math.max(4, entryH) }}
                            title={`Hour: ${h.label}\nEntries: ${h.entries}`}
                          />
                          <div
                            className="dual-bar-exit"
                            style={{ height: Math.max(4, exitH) }}
                            title={`Hour: ${h.label}\nExits: ${h.exits}`}
                          />
                        </div>
                        <span className="dual-bar-label">{h.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 24,
                    marginTop: 20,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: "#1dd5e6" }} />
                    <span>Check-Ins (Entries)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: "#3d83f6" }} />
                    <span>Check-Outs (Exits)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                No hourly distribution data logged yet for today.
              </div>
            )}
          </section>
        )}
      </div>

      {/* MODAL 1: CAMERA BARCODE SCANNER */}
      {cameraModalOpen && (
        <CameraScannerModal
          onScan={(decoded) => {
            setCameraModalOpen(false);
            handleProcessScan(decoded, "CAMERA");
          }}
          onClose={() => setCameraModalOpen(false)}
        />
      )}

      {/* MODAL 2: CONFIRM EXIT ALL OCCUPANTS */}
      {showExitAllModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid #ff4d57",
              borderRadius: 16,
              maxWidth: 440,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(255, 77, 87, 0.15)",
                  color: "#ff4d57",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LogOut size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text)" }}>
                  Exit All Active Students?
                </h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)" }}>
                  Laboratory session closeout
                </p>
              </div>
            </div>

            <p style={{ margin: "0 0 20px", fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.5 }}>
              This will mark all <strong>{activeList.length} students</strong> currently inside{" "}
              <strong>{selectedLabObj?.name || "this lab"}</strong> as exited with the current timestamp.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowExitAllModal(false)}
                disabled={isExitingAll}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "transparent",
                  color: "var(--text)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExitAll}
                disabled={isExitingAll}
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "#ff4d57",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: isExitingAll ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {isExitingAll ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    Checking out...
                  </>
                ) : (
                  <>Confirm Exit All</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// Inline Camera Scanner Modal using html5-qrcode
function CameraScannerModal({
  onScan,
  onClose,
}: {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}) {
  const scannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let scannerInstance: any = null;

    async function initScanner() {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        scannerInstance = new Html5QrcodeScanner(
          "attendance-qr-reader",
          {
            fps: 10,
            qrbox: { width: 280, height: 180 },
          },
          /* verbose= */ false
        );

        scannerInstance.render(
          (decodedText: string) => {
            scannerInstance.clear().catch(console.error);
            onScan(decodedText);
          },
          () => {
            // Frame scan miss, normal
          }
        );
      } catch (err) {
        console.error("Camera scanner init error:", err);
      }
    }

    initScanner();

    return () => {
      if (scannerInstance) {
        scannerInstance.clear().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--cyan)",
          borderRadius: 16,
          maxWidth: 480,
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Camera size={18} style={{ color: "var(--cyan)" }} />
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
              Scan Student ID Barcode
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          <div
            id="attendance-qr-reader"
            ref={scannerRef}
            style={{
              width: "100%",
              borderRadius: 10,
              overflow: "hidden",
              background: "#000",
            }}
          />
          <p
            style={{
              margin: "14px 0 0",
              textAlign: "center",
              fontSize: "0.82rem",
              color: "var(--muted)",
            }}
          >
            Align the barcode on the back or front of the Student ID card within the frame.
          </p>
        </div>
      </div>
    </div>
  );
}
