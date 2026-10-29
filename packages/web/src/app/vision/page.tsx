"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import { 
  Zap, Activity, Wrench, Radio, Network, FlaskConical,
  Users, UserPlus, TrendingUp, Flame, Cloud, Play, Square, RotateCcw,
  FileVideo, Video, Eye, ClipboardList, Trash2, X, Plus,
  AlertTriangle, UploadCloud, VideoOff, PlayCircle, Grid, Monitor,
  Maximize2, Shield, Settings2, Sliders, CheckCircle2
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Detection {
  id: number; x1: number; y1: number; x2: number; y2: number;
  conf: number; activity: "standing" | "walking" | "running"; is_new: boolean;
}
interface Keypoint { x: number; y: number; conf: number; }
interface PoseData { keypoints: Keypoint[]; }
interface Alert { type: "fire" | "smoke" | "entry" | "exit"; detail: string; }
interface FrameData {
  type: "frame" | "meta" | "end" | "error";
  time_sec: number; frame_w: number; frame_h: number;
  count: number; total_seen: number;
  detections: Detection[]; poses: PoseData[];
  fire: boolean; smoke: boolean; alerts: Alert[];
  image_b64?: string;
  fps?: number; duration_sec?: number; width?: number; height?: number;
  detail?: string;
}

interface CCTVCamera {
  id: string;
  name: string;
  url: string;
  location?: string;
}

const VISION_URL = process.env.NEXT_PUBLIC_VISION_BASE ?? "http://127.0.0.1:8002";
const VISION_WS  = VISION_URL.replace(/^http/, "ws");

// ── Activity color map ────────────────────────────────────────────────────────
const ACT_COLOR: Record<string, string> = {
  standing: "#3d83f6",
  walking:  "#18d18f",
  running:  "#f3ae2a",
};

// ── COCO skeleton pairs (17 keypoints) ───────────────────────────────────────
const SKELETON: [number, number][] = [
  [0,1],[0,2],[1,3],[2,4],[5,6],[5,7],[7,9],[6,8],[8,10],
  [5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16],
];
const KP_COLORS = [
  "#ff0000","#ff5500","#ffaa00","#ffff00","#aaff00","#55ff00",
  "#00ff00","#00ff55","#00ffaa","#00ffff","#00aaff","#0055ff",
  "#0000ff","#5500ff","#aa00ff","#ff00ff","#ff00aa",
];

// ── Draw AI overlay onto canvas (canvas intrinsic = frame size, so scale = 1:1)
function drawOverlay(canvas: HTMLCanvasElement, data: FrameData) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Bounding boxes
  for (const det of data.detections) {
    const { x1, y1, x2, y2, activity, conf, id, is_new } = det;
    const w = x2 - x1, h = y2 - y1;
    const color = ACT_COLOR[activity] ?? "#3d83f6";

    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    ctx.setLineDash(is_new ? [6, 3] : []);
    ctx.strokeRect(x1, y1, w, h);
    ctx.setLineDash([]);

    // Label bar
    ctx.fillStyle = color + "dd";
    ctx.fillRect(x1, y1 - 24, w, 24);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px monospace";
    ctx.fillText(`#${id} ${activity.toUpperCase()} ${Math.round(conf * 100)}%`, x1 + 5, y1 - 7);
  }

  // Pose skeletons
  for (const pose of data.poses) {
    const kps = pose.keypoints;
    ctx.lineWidth = 2.5;
    for (const [a, b] of SKELETON) {
      const ka = kps[a], kb = kps[b];
      if (!ka || !kb || ka.conf < 0.3 || kb.conf < 0.3) continue;
      ctx.strokeStyle = "#ffffff90";
      ctx.beginPath();
      ctx.moveTo(ka.x, ka.y);
      ctx.lineTo(kb.x, kb.y);
      ctx.stroke();
    }
    for (let i = 0; i < kps.length; i++) {
      const kp = kps[i];
      if (!kp || kp.conf < 0.3) continue;
      ctx.fillStyle = KP_COLORS[i] ?? "#fff";
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 4.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // Fire overlay
  if (data.fire) {
    const grad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height * 0.8, 0,
      canvas.width / 2, canvas.height * 0.8, canvas.height * 0.5,
    );
    grad.addColorStop(0, "rgba(255,60,0,0.4)");
    grad.addColorStop(1, "rgba(255,60,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff3d00";
    ctx.font = `bold ${Math.max(20, canvas.height * 0.035)}px sans-serif`;
    ctx.fillText("🔥 FIRE HAZARD DETECTED", 20, 50);
  }
  if (data.smoke) {
    ctx.fillStyle = "rgba(180,180,180,0.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = `bold ${Math.max(20, canvas.height * 0.035)}px sans-serif`;
    ctx.fillText("☁ SMOKE DETECTED", 20, data.fire ? 90 : 50);
  }
}

// ── Alert toast ───────────────────────────────────────────────────────────────
function AlertToast({ alerts }: { alerts: { msg: string; type: string; ts: number }[] }) {
  const colors: Record<string, string> = {
    fire: "#ff4d57", smoke: "#94a3b8", entry: "#18d18f", exit: "#f3ae2a"
  };
  return (
    <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 8, zIndex: 10, maxWidth: 280, pointerEvents: "none" }}>
      {alerts.slice(-4).reverse().map(a => (
        <div key={a.ts} style={{ background: `${colors[a.type] ?? "#3d83f6"}25`, border: `1px solid ${colors[a.type] ?? "#3d83f6"}70`, borderRadius: 8, padding: "9px 14px", color: colors[a.type] ?? "var(--text-main)", fontSize: "0.82rem", fontWeight: 700, backdropFilter: "blur(10px)", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}>
          {a.type === "fire" ? <Flame size={16} /> : a.type === "smoke" ? <Cloud size={16} /> : a.type === "entry" ? <UserPlus size={16} /> : <Users size={16} />}
          {a.msg}
        </div>
      ))}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function Stat({ label, value, color, icon: Icon }: { label: string; value: string | number; color: string; icon: React.ComponentType<any> }) {
  return (
    <div style={{ background: "var(--bg-card)", border: `1px solid ${color}35`, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 130 }}>
      <div style={{ color, marginBottom: 6 }}><Icon size={20} /></div>
      <div style={{ color, fontSize: "1.6rem", fontWeight: 700, fontFamily: "monospace" }}>{value}</div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

// ── Department Laboratories (6 Labs) ──────────────────────────────────────────
const LABS = [
  { id: 1, name: "Power Systems and High Voltage Laboratory", shortName: "Power Systems Lab", location: "Block C, Ground Floor", icon: Zap },
  { id: 2, name: "Electric Machines and Power Electronics Laboratory", shortName: "Electric Machines Lab", location: "Block C, 1st Floor", icon: Activity },
  { id: 3, name: "Electronics and Measurement Laboratory", shortName: "Electronics Lab", location: "Block A, 2nd Floor", icon: Wrench },
  { id: 4, name: "Communication and Systems Engineering Laboratory", shortName: "Communication Lab", location: "Block B, 1st Floor", icon: Radio },
  { id: 5, name: "Information Engineering Laboratory", shortName: "Information Eng Lab", location: "Block C, 4th Floor", icon: Network },
  { id: 6, name: "24 × 7 Undergraduate Development Project Laboratory", shortName: "24 × 7 Project Lab", location: "Block D, 4th Floor", icon: FlaskConical }
];

// ── Default CCTV Cameras across all 6 Department Laboratories ─────────────────
const DEFAULT_CCTV_STREAMS: Record<number, CCTVCamera[]> = {
  1: [
    { id: "cctv_hv_1", name: "High Voltage Bay 1 (Impulse Area)", url: "rtsp://127.0.0.1:8554/hv-bay1", location: "Block C, Ground Floor" },
    { id: "cctv_hv_2", name: "100kV AC Transformer Test Cell", url: "rtsp://127.0.0.1:8554/hv-cell", location: "Block C, Ground Floor" },
  ],
  2: [
    { id: "cctv_em_1", name: "Motor Dynamometer Test Benches", url: "rtsp://127.0.0.1:8554/machines-dyno", location: "Block C, 1st Floor" },
    { id: "cctv_em_2", name: "Siemens Sinamics VFD Drive Stations", url: "rtsp://127.0.0.1:8554/machines-vfd", location: "Block C, 1st Floor" },
  ],
  3: [
    { id: "cctv_mps_1", name: "Electronics Lab Entrance & Main Aisle", url: "rtsp://127.0.0.1:8554/power-entrance", location: "Block A, 2nd Floor" },
    { id: "cctv_mps_2", name: "Oscilloscope & Measurement Workbenches", url: "rtsp://127.0.0.1:8554/electronics-bench", location: "Block A, 2nd Floor" },
  ],
  4: [
    { id: "cctv_cm_1", name: "RF & USRP SDR Test Stations", url: "rtsp://127.0.0.1:8554/comm-rf", location: "Block B, 1st Floor" },
    { id: "cctv_cm_2", name: "Spectrum Analyzer & Antenna Bay", url: "rtsp://127.0.0.1:8554/comm-spectrum", location: "Block B, 1st Floor" },
  ],
  5: [
    { id: "cctv_cie_1", name: "CIE Front Entrance & Cisco Rack 1", url: "rtsp://127.0.0.1:8554/cie-main", location: "Block C, 4th Floor" },
    { id: "cctv_cie_2", name: "Computing Cluster & Network Switches", url: "rtsp://127.0.0.1:8554/cie-cluster", location: "Block C, 4th Floor" },
  ],
  6: [
    { id: "cctv_ur_1", name: "PCB Fabrication & Soldering Workstations", url: "rtsp://127.0.0.1:8554/proj-pcb", location: "Block D, 4th Floor" },
    { id: "cctv_ur_2", name: "3D Prototyping & CNC Machine Area", url: "rtsp://127.0.0.1:8554/proj-3dprint", location: "Block D, 4th Floor" },
  ],
};

// ── Main Page Component ───────────────────────────────────────────────────────
export default function VisionMonitoringPage() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef     = useRef<WebSocket | null>(null);

  // View state: Multi-feed Grid View vs Single-Stream Focus & AI
  const [viewMode, setViewMode] = useState<"grid" | "focus">("grid");
  const [focusLayout, setFocusLayout] = useState<"dual" | "ai-only" | "orig-only">("dual");

  // Stream & analysis states
  const [phase, setPhase]         = useState<"idle" | "uploading" | "live" | "done" | "error">("idle");
  const [file, setFile]           = useState<File | null>(null);
  const [cctvUrl, setCctvUrl]     = useState("");
  // Note: Webcam has been removed as requested; only cctv and upload modes remain
  const [sourceTab, setSourceTab] = useState<"cctv" | "upload">("cctv");
  const [error, setError]         = useState("");
  const [uploadPct, setUploadPct] = useState(0);

  // Lab Selector and CCTV streams states
  const [selectedLabId, setSelectedLabId] = useState<number>(3);
  const [cctvStreams, setCctvStreams]     = useState<Record<number, CCTVCamera[]>>(DEFAULT_CCTV_STREAMS);
  const [activeStreamId, setActiveStreamId] = useState<string | null>("cctv_mps_1");
  const [gridFilterLabId, setGridFilterLabId] = useState<number | "all">("all");

  // Add camera form modal states
  const [addStreamName, setAddStreamName] = useState("");
  const [addStreamUrl, setAddStreamUrl]   = useState("");
  const [addStreamLabId, setAddStreamLabId] = useState<number>(3);
  const [showAddForm, setShowAddForm]     = useState(false);

  // Clock time for CCTV OSD overlay
  const [clockTime, setClockTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setClockTime(d.toLocaleTimeString("en-US", { hour12: false }) + "." + String(Math.floor(d.getMilliseconds() / 100)));
    };
    updateTime();
    const timer = setInterval(updateTime, 250);
    return () => clearInterval(timer);
  }, []);

  const selectedLabIdRef = useRef<number>(3);
  useEffect(() => {
    selectedLabIdRef.current = selectedLabId;
  }, [selectedLabId]);

  // Load and save CCTV streams from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("elabs_cctv_streams");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCctvStreams(parsed);
        if (parsed[3] && parsed[3].length > 0) {
          setActiveStreamId(parsed[3][0].id);
          setCctvUrl(parsed[3][0].url);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      localStorage.setItem("elabs_cctv_streams", JSON.stringify(DEFAULT_CCTV_STREAMS));
      setCctvStreams(DEFAULT_CCTV_STREAMS);
      setActiveStreamId("cctv_mps_1");
      setCctvUrl("rtsp://127.0.0.1:8554/power-entrance");
    }
  }, []);

  // Video source for original feed
  const [videoSrcUrl, setVideoSrcUrl] = useState<string>("");
  const [sampleVideo, setSampleVideo] = useState<{ path: string; filename: string; url: string } | null>(null);
  const [isSampleLoading, setIsSampleLoading] = useState(false);

  // Analytics state
  const [lastFrame, setLastFrame]   = useState<FrameData | null>(null);
  const [peakOcc, setPeakOcc]       = useState(0);
  const [totalSeen, setTotalSeen]   = useState(0);
  const [alerts, setAlerts]         = useState<{ msg: string; type: string; ts: number }[]>([]);
  const [sessionLog, setSessionLog] = useState<{ time: number; event: string; color: string }[]>([]);
  const [actCounts, setActCounts]   = useState({ standing: 0, walking: 0, running: 0 });

  const lastAlertAt = useRef<Record<string, number>>({});
  const lastSyncedCountRef = useRef<number>(-1);

  // Clean up streaming on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const isLive = phase === "live";

  // Handle lab selection
  const handleLabChange = (labId: number) => {
    if (isLive) return;
    setSelectedLabId(labId);

    const streams = cctvStreams[labId] || [];
    if (streams.length > 0) {
      setActiveStreamId(streams[0].id);
      setCctvUrl(streams[0].url);
      setSourceTab("cctv");
    } else {
      setActiveStreamId(null);
      setCctvUrl("");
      setSourceTab("upload");
    }
  };

  // Add camera
  const handleAddStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStreamName.trim() || !addStreamUrl.trim()) return;

    const targetLab = LABS.find(l => l.id === addStreamLabId) || LABS[0];
    const newStream: CCTVCamera = {
      id: `stream_${Date.now()}`,
      name: addStreamName.trim(),
      url: addStreamUrl.trim(),
      location: targetLab.location
    };

    const nextStreams = {
      ...cctvStreams,
      [addStreamLabId]: [...(cctvStreams[addStreamLabId] || []), newStream]
    };

    setCctvStreams(nextStreams);
    localStorage.setItem("elabs_cctv_streams", JSON.stringify(nextStreams));
    
    setSelectedLabId(addStreamLabId);
    setActiveStreamId(newStream.id);
    setCctvUrl(newStream.url);
    setSourceTab("cctv");

    setAddStreamName("");
    setAddStreamUrl("");
    setShowAddForm(false);
  };

  // Delete camera
  const handleDeleteStream = (labId: number, streamId: string) => {
    const nextStreams = {
      ...cctvStreams,
      [labId]: (cctvStreams[labId] || []).filter(s => s.id !== streamId)
    };

    setCctvStreams(nextStreams);
    localStorage.setItem("elabs_cctv_streams", JSON.stringify(nextStreams));

    if (activeStreamId === streamId) {
      const remaining = nextStreams[selectedLabId] || [];
      if (remaining.length > 0) {
        setActiveStreamId(remaining[0].id);
        setCctvUrl(remaining[0].url);
      } else {
        setActiveStreamId(null);
        setCctvUrl("");
        setSourceTab("upload");
      }
    }
  };

  // Handle incoming WS frame
  const handleFrameData = useCallback((data: FrameData) => {
    if (data.type === "meta")  return;
    if (data.type === "end")   { setPhase("done"); return; }
    if (data.type === "error") { setError(data.detail ?? "Stream error"); setPhase("error"); return; }
    if (data.type !== "frame") return;

    setLastFrame(data);
    setTotalSeen(data.total_seen);
    setPeakOcc(prev => Math.max(prev, data.count));

    // Sync detection count with MySQL database
    if (lastSyncedCountRef.current !== data.count) {
      lastSyncedCountRef.current = data.count;
      apiFetch("/attendance/sync-occupancy", {
        method: "POST",
        body: JSON.stringify({ labId: selectedLabIdRef.current, count: data.count })
      }).catch(err => console.error("Error syncing occupancy:", err));
    }

    // Activity counts
    setActCounts(prev => {
      const next = { ...prev };
      for (const det of data.detections) {
        if (det.activity === "running")  next.running++;
        if (det.activity === "walking")  next.walking++;
        if (det.activity === "standing") next.standing++;
      }
      return next;
    });

    // Debounced alerts
    const now = Date.now();
    const newAlerts: { msg: string; type: string; ts: number }[] = [];
    for (const a of data.alerts) {
      const last = lastAlertAt.current[a.type] ?? 0;
      if (now - last > 3000) {
        lastAlertAt.current[a.type] = now;
        newAlerts.push({ msg: a.detail, type: a.type, ts: now + Math.random() });
      }
    }
    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts].slice(-10));
      const colorMap: Record<string, string> = { fire: "#ff4d57", smoke: "#94a3b8", entry: "#18d18f", exit: "#f3ae2a" };
      setSessionLog(prev => [
        ...prev,
        ...newAlerts.map(a => ({ time: data.time_sec, event: a.msg, color: colorMap[a.type] ?? "var(--text-muted)" }))
      ].slice(-50));
    }

    // Draw on AI canvas
    const cnv = canvasRef.current;
    if (!cnv) return;

    if (data.image_b64) {
      const img = new Image();
      img.onload = () => {
        cnv.width  = data.frame_w;
        cnv.height = data.frame_h;
        const ctx = cnv.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        drawOverlay(cnv, data);
      };
      img.src = `data:image/jpeg;base64,${data.image_b64}`;
    }
  }, []);

  // Load sample video
  const loadSampleVideo = async () => {
    try {
      setIsSampleLoading(true);
      setError("");
      const res = await fetch(`${VISION_URL}/vision/live/sample`);
      if (!res.ok) throw new Error("Could not load sample video from vision server.");
      const data = await res.json();
      setSampleVideo({
        path: data.path,
        filename: data.filename,
        url: `${VISION_URL}${data.url}`
      });
      setFile(null);
      setVideoSrcUrl(`${VISION_URL}${data.url}`);
    } catch (e: any) {
      setError(e.message || "Failed to load sample lab video");
    } finally {
      setIsSampleLoading(false);
    }
  };

  // Start analysis
  const startLive = useCallback(async (customCctvUrl?: string) => {
    setError("");
    setPeakOcc(0);
    setTotalSeen(0);
    setAlerts([]);
    setSessionLog([]);
    setActCounts({ standing: 0, walking: 0, running: 0 });
    lastAlertAt.current = {};
    lastSyncedCountRef.current = -1;

    let videoPath = "";
    let sessionId = `session_${Date.now()}`;

    const effectiveCctvUrl = customCctvUrl || cctvUrl;

    if (sourceTab === "upload") {
      if (file) {
        setPhase("uploading");
        setUploadPct(0);

        const blobUrl = URL.createObjectURL(file);
        setVideoSrcUrl(blobUrl);

        const form = new FormData();
        form.append("file", file);

        videoPath = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${VISION_URL}/vision/live/upload`);
          xhr.upload.onprogress = e => {
            if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => {
            try {
              const r = JSON.parse(xhr.responseText);
              sessionId = r.session_id;
              if (r.url) setVideoSrcUrl(`${VISION_URL}${r.url}`);
              resolve(r.path);
            } catch { reject(new Error("Upload failed")); }
          };
          xhr.onerror = () => reject(new Error("Network Error: Could not connect to the Vision Service. Please ensure the Vision backend is running on port 8002."));
          xhr.send(form);
        });
      } else if (sampleVideo) {
        videoPath = sampleVideo.path;
        setVideoSrcUrl(sampleVideo.url);
      } else {
        setError("Please select a video file or load the sample lab footage.");
        return;
      }
    } else if (sourceTab === "cctv" && effectiveCctvUrl) {
      videoPath = effectiveCctvUrl;
      sessionId = `cctv_${Date.now()}`;
    } else {
      setError("Please select a CCTV camera feed or video file.");
      return;
    }

    setPhase("live");
    setViewMode("focus");

    const ws = new WebSocket(`${VISION_WS}/vision/live/ws/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ path: videoPath, fps: 12 }));
      if (videoRef.current && sourceTab === "upload") {
        videoRef.current.play().catch(() => {});
      }
    };

    ws.onmessage = evt => {
      try { handleFrameData(JSON.parse(evt.data) as FrameData); } catch {}
    };

    ws.onerror  = () => { setError("WebSocket connection failed — is the vision service running on port 8002?"); setPhase("error"); };
    ws.onclose  = () => { setPhase(p => p === "live" ? "done" : p); };

  }, [sourceTab, file, sampleVideo, cctvUrl, handleFrameData]);

  // Stop analysis
  const stopStream = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    wsRef.current?.send(JSON.stringify({ stop: true }));
    wsRef.current?.close();
    wsRef.current = null;
    setPhase("idle");
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    apiFetch("/attendance/sync-occupancy", {
      method: "POST",
      body: JSON.stringify({ labId: selectedLabIdRef.current, count: 0 })
    }).catch(err => console.error("Error resetting occupancy:", err));
  }, []);

  const reset = useCallback(() => {
    stopStream();
    setFile(null);
    setSampleVideo(null);
    setLastFrame(null);
    setError("");
    setUploadPct(0);
    setVideoSrcUrl("");
  }, [stopStream]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("video/")) {
      setFile(f);
      setSourceTab("upload");
    }
  }, []);

  // Quick switch from grid view to focus & analysis on a camera
  const launchAnalysisOnCamera = (labId: number, cam: CCTVCamera) => {
    setSelectedLabId(labId);
    setActiveStreamId(cam.id);
    setCctvUrl(cam.url);
    setSourceTab("cctv");
    setViewMode("focus");
    startLive(cam.url);
  };

  const currentLab = LABS.find(l => l.id === selectedLabId) || LABS[0];
  const currentStreams = cctvStreams[selectedLabId] || [];

  // All streams across all labs for grid view
  const allStreamsList: { lab: typeof LABS[0]; cam: CCTVCamera }[] = [];
  LABS.forEach(lab => {
    const list = cctvStreams[lab.id] || [];
    list.forEach(cam => {
      allStreamsList.push({ lab, cam });
    });
  });

  const displayedGridStreams = gridFilterLabId === "all" 
    ? allStreamsList 
    : allStreamsList.filter(item => item.lab.id === gridFilterLabId);

  return (
    <AppShell title="Vision Monitoring" subtitle="Department CCTV surveillance matrix, live YOLOv8 tracking, and laboratory safety telemetry">
      {/* ── Top Master Header & View Switcher ── */}
      <div className="panel" style={{ marginBottom: 16, padding: "14px 20px" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          
          {/* View mode toggle: Grid View vs Focus View */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-app)", padding: 4, borderRadius: 10, border: "1px solid var(--border-color)" }}>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 8, border: "none",
                fontWeight: 700, fontSize: "0.84rem", cursor: "pointer", transition: "all 0.2s",
                background: viewMode === "grid" ? "var(--bg-card)" : "transparent",
                color: viewMode === "grid" ? "var(--cyan, #1dd5e6)" : "var(--text-muted)",
                boxShadow: viewMode === "grid" ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <Grid size={15} />
              <span>CCTV Grid View ({allStreamsList.length} Feeds)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("focus")}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 8, border: "none",
                fontWeight: 700, fontSize: "0.84rem", cursor: "pointer", transition: "all 0.2s",
                background: viewMode === "focus" ? "var(--bg-card)" : "transparent",
                color: viewMode === "focus" ? "#3d83f6" : "var(--text-muted)",
                boxShadow: viewMode === "focus" ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <Monitor size={15} />
              <span>Focus & AI Analysis</span>
              {isLive && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#18d18f", animation: "pulse 1.2s infinite" }} />}
            </button>
          </div>

          {/* Right actions & status */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              disabled={isLive}
              style={{
                padding: "8px 16px", background: "var(--bg-card)", border: "1px solid var(--border-color)",
                borderRadius: 8, color: "var(--text-main)", fontSize: "0.82rem", fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6
              }}
            >
              <Plus size={14} className="text-cyan-400" />
              <span>Add Camera Feed</span>
            </button>

            {/* Analysis Controls */}
            {viewMode === "focus" && (
              <>
                {!isLive ? (
                  <button onClick={() => startLive()} disabled={phase === "uploading"}
                    style={{ padding: "8px 22px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(61, 131, 246, 0.25)" }}>
                    <Play size={14} />
                    {phase === "uploading" ? `Uploading ${uploadPct}%…` : "Start Analysis"}
                  </button>
                ) : (
                  <button onClick={stopStream}
                    style={{ padding: "8px 22px", background: "#ff4d5720", border: "1px solid #ff4d5760", borderRadius: 8, color: "#ff4d57", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <Square size={14} />
                    Stop Analysis
                  </button>
                )}

                {(phase === "done" || phase === "error") && (
                  <button onClick={reset}
                    style={{ padding: "8px 18px", background: "var(--border-color)", border: "1px solid #2a4060", borderRadius: 8, color: "var(--text-muted)", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <RotateCcw size={14} />
                    Reset
                  </button>
                )}
              </>
            )}

            {isLive && <span style={{ background: "#18d18f20", border: "1px solid #18d18f40", borderRadius: 20, color: "#18d18f", fontSize: "0.75rem", fontWeight: 700, padding: "5px 12px" }}>● LIVE ANALYSIS</span>}
            {lastFrame?.fire  && <span style={{ background: "#ff4d5725", border: "1px solid #ff4d5770", borderRadius: 20, color: "#ff4d57", fontSize: "0.75rem", fontWeight: 700, padding: "5px 12px", display: "flex", alignItems: "center", gap: 4 }}><Flame size={13} /> FIRE ALERT</span>}
            {lastFrame?.smoke && <span style={{ background: "#94a3b825", border: "1px solid #94a3b870", borderRadius: 20, color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700, padding: "5px 12px", display: "flex", alignItems: "center", gap: 4 }}><Cloud size={13} /> SMOKE ALERT</span>}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, background: "#ff4d5715", border: "1px solid #ff4d5740", borderRadius: 8, padding: "10px 14px", color: "#ff4d57", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} />
            {error}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODE 1: MULTI-FEED CCTV GRID VIEW (Department Surveillance Matrix)
          ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === "grid" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Horizontal Lab Filter Strip */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }} className="scrollbar-none">
            <button
              type="button"
              onClick={() => setGridFilterLabId("all")}
              style={{
                padding: "8px 16px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer", transition: "all 0.15s",
                background: gridFilterLabId === "all" ? "var(--cyan, #1dd5e6)" : "var(--bg-card)",
                color: gridFilterLabId === "all" ? "#0b0f19" : "var(--text-muted)",
                border: `1px solid ${gridFilterLabId === "all" ? "transparent" : "var(--border-color)"}`
              }}
            >
              All Department Labs ({allStreamsList.length} Feeds)
            </button>

            {LABS.map(l => {
              const count = (cctvStreams[l.id] || []).length;
              const isSelected = gridFilterLabId === l.id;
              const Icon = l.icon;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setGridFilterLabId(l.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8,
                    fontSize: "0.82rem", fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", transition: "all 0.15s",
                    background: isSelected ? "rgba(61, 131, 246, 0.18)" : "var(--bg-card)",
                    color: isSelected ? "#3d83f6" : "var(--text-main)",
                    border: `1px solid ${isSelected ? "#3d83f6" : "var(--border-color)"}`
                  }}
                >
                  <Icon size={14} />
                  <span>{l.shortName}</span>
                  <span style={{ fontSize: "0.72rem", background: "rgba(0,0,0,0.15)", padding: "1px 6px", borderRadius: 10, opacity: 0.8 }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* CCTV Multi-Camera Video Matrix Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
            {displayedGridStreams.map(({ lab, cam }, idx) => {
              const isCurrentAnalyzing = isLive && activeStreamId === cam.id;
              return (
                <div
                  key={cam.id}
                  style={{
                    background: "#070b14",
                    borderRadius: 12,
                    border: `1.5px solid ${isCurrentAnalyzing ? "#1dd5e6" : "rgba(255,255,255,0.08)"}`,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: isCurrentAnalyzing ? "0 0 20px rgba(29, 213, 230, 0.2)" : "0 8px 24px rgba(0,0,0,0.3)"
                  }}
                >
                  {/* Camera Top Bar */}
                  <div style={{ padding: "8px 12px", background: "#0b1220", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 800, background: "#1e293b", color: "#94a3b8", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>
                        CAM {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                        {cam.name}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.7rem", color: "#18d18f", fontWeight: 700, fontFamily: "monospace" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#18d18f", animation: "pulse 1s infinite" }} />
                        LIVE
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteStream(lab.id, cam.id)}
                        style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: "2px 4px" }}
                        title="Delete camera feed"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* CCTV Viewport Preview / CRT Monitor Display */}
                  <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#020408", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {/* Simulated security monitor scanline / noise */}
                    <div style={{
                      position: "absolute", inset: 0,
                      backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))",
                      backgroundSize: "100% 3px, 6px 100%", pointerEvents: "none", zIndex: 1
                    }} />

                    {/* Camera OSD Overlays */}
                    <div style={{ position: "absolute", top: 8, left: 10, zIndex: 2, fontFamily: "monospace", fontSize: "0.72rem", color: "#38bdf8", textShadow: "0 1px 3px #000" }}>
                      REC ● {clockTime || "04:32:10.4"}
                    </div>
                    <div style={{ position: "absolute", top: 8, right: 10, zIndex: 2, fontFamily: "monospace", fontSize: "0.68rem", color: "rgba(255,255,255,0.7)", background: "rgba(0,0,0,0.5)", padding: "1px 5px", borderRadius: 3 }}>
                      1080p @ 25 FPS
                    </div>

                    <div style={{ position: "absolute", bottom: 8, left: 10, zIndex: 2, fontSize: "0.7rem", color: "#cbd5e1", textShadow: "0 1px 3px #000" }}>
                      📍 {lab.shortName} ({lab.location})
                    </div>

                    {/* Center CCTV Graphic */}
                    <div style={{ textAlign: "center", padding: 20, zIndex: 2 }}>
                      <Video size={36} style={{ color: isCurrentAnalyzing ? "#1dd5e6" : "#475569", margin: "0 auto 8px" }} />
                      <div style={{ color: "#94a3b8", fontSize: "0.78rem", fontFamily: "monospace", maxWidth: 280, wordBreak: "break-all" }}>
                        {cam.url}
                      </div>
                      {isCurrentAnalyzing && (
                        <div style={{ marginTop: 8, display: "inline-block", background: "rgba(29, 213, 230, 0.2)", border: "1px solid rgba(29, 213, 230, 0.5)", color: "#1dd5e6", fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>
                          YOLOv8 AI Tracking Active ({lastFrame?.count ?? 0} Headcount)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Camera Footer Actions */}
                  <div style={{ padding: "10px 14px", background: "#0b1220", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      RTSP Camera Stream
                    </span>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLabId(lab.id);
                          setActiveStreamId(cam.id);
                          setCctvUrl(cam.url);
                          setSourceTab("cctv");
                          setViewMode("focus");
                        }}
                        style={{
                          padding: "5px 10px", background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#cbd5e1", fontSize: "0.75rem",
                          fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5
                        }}
                      >
                        <Maximize2 size={12} />
                        <span>Focus</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => launchAnalysisOnCamera(lab.id, cam)}
                        style={{
                          padding: "5px 12px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", border: "none",
                          borderRadius: 6, color: "#fff", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 5, boxShadow: "0 2px 8px rgba(61, 131, 246, 0.3)"
                        }}
                      >
                        <Play size={11} />
                        <span>Analyze with AI</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODE 2: FOCUS & LARGE DUAL VIDEO ANALYSIS VIEW
          ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === "focus" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* Top Bar for Focus View: Lab Switcher + Feed Source + View Size */}
          <div className="panel" style={{ padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            {/* Lab & Camera selection */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Lab:</span>
                <select
                  value={selectedLabId}
                  onChange={e => handleLabChange(Number(e.target.value))}
                  disabled={isLive}
                  style={{
                    background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8,
                    padding: "6px 12px", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-main)", outline: "none", cursor: isLive ? "not-allowed" : "pointer"
                  }}
                >
                  {LABS.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* Source Tabs: CCTV Stream vs Video File (Webcam removed!) */}
              <div style={{ display: "flex", background: "var(--bg-app)", borderRadius: 8, border: "1px solid var(--border-color)", overflow: "hidden" }}>
                {(["cctv", "upload"] as const).map(tab => (
                  <button key={tab} onClick={() => setSourceTab(tab)} disabled={isLive}
                    style={{
                      padding: "6px 16px", border: "none", borderRight: tab === "cctv" ? "1px solid var(--border-color)" : "none",
                      fontWeight: 700, fontSize: "0.8rem", cursor: isLive ? "not-allowed" : "pointer", transition: "all 0.15s",
                      background: sourceTab === tab ? "rgba(61, 131, 246, 0.15)" : "transparent",
                      color: sourceTab === tab ? "#3d83f6" : "var(--text-muted)"
                    }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {tab === "cctv" ? <Video size={13} /> : <FileVideo size={13} />}
                      {tab === "cctv" ? "CCTV Stream" : "Video File / Sample"}
                    </span>
                  </button>
                ))}
              </div>

              {/* Camera selection dropdown if in CCTV mode */}
              {sourceTab === "cctv" && currentStreams.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Camera:</span>
                  <select
                    value={activeStreamId || ""}
                    onChange={e => {
                      if (isLive) return;
                      const s = currentStreams.find(item => item.id === e.target.value);
                      if (s) {
                        setActiveStreamId(s.id);
                        setCctvUrl(s.url);
                      }
                    }}
                    disabled={isLive}
                    style={{
                      background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8,
                      padding: "6px 12px", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-main)", outline: "none", cursor: isLive ? "not-allowed" : "pointer"
                    }}
                  >
                    {currentStreams.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.url})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Layout options: Dual View (Side-by-Side) vs AI-Only vs Original-Only */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-app)", padding: 3, borderRadius: 8, border: "1px solid var(--border-color)" }}>
              <button
                type="button"
                onClick={() => setFocusLayout("dual")}
                style={{
                  padding: "5px 12px", borderRadius: 6, border: "none", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer",
                  background: focusLayout === "dual" ? "var(--bg-card)" : "transparent",
                  color: focusLayout === "dual" ? "#3d83f6" : "var(--text-muted)"
                }}
              >
                Dual View (Side-by-Side)
              </button>
              <button
                type="button"
                onClick={() => setFocusLayout("ai-only")}
                style={{
                  padding: "5px 12px", borderRadius: 6, border: "none", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer",
                  background: focusLayout === "ai-only" ? "var(--bg-card)" : "transparent",
                  color: focusLayout === "ai-only" ? "var(--cyan, #1dd5e6)" : "var(--text-muted)"
                }}
              >
                AI Detection Only
              </button>
              <button
                type="button"
                onClick={() => setFocusLayout("orig-only")}
                style={{
                  padding: "5px 12px", borderRadius: 6, border: "none", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer",
                  background: focusLayout === "orig-only" ? "var(--bg-card)" : "transparent",
                  color: focusLayout === "orig-only" ? "var(--text-main)" : "var(--text-muted)"
                }}
              >
                Original Only
              </button>
            </div>
          </div>

          {/* ── MASSIVE VIDEO VIEWPORTS (PROPER LARGE SIZE WINDOWS) ── */}
          <div style={{ width: "100%" }}>
            
            {/* Idle / Uploading Video Dropzone if Upload Mode */}
            {(phase === "idle" || phase === "uploading") && sourceTab === "upload" && (
              <div className="panel" style={{ padding: 0, marginBottom: 16 }}>
                <div onDrop={onDrop} onDragOver={e => e.preventDefault()}
                  onClick={() => !isLive && document.getElementById("visionFileInput")?.click()}
                  style={{ minHeight: 380, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
                    cursor: "pointer", border: `2px dashed ${file || sampleVideo ? "#3d83f6" : "var(--border-color)"}`, borderRadius: 14, padding: 36,
                    background: file || sampleVideo ? "rgba(61, 131, 246, 0.05)" : "transparent", transition: "all 0.2s" }}>
                  <input id="visionFileInput" type="file" accept="video/*" style={{ display: "none" }} onChange={e => {
                    if (e.target.files?.[0]) {
                      setFile(e.target.files[0]);
                      setSampleVideo(null);
                    }
                  }} />
                  <div style={{ color: "#3d83f6" }}><UploadCloud size={56} /></div>
                  
                  {file ? (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ color: "#3d83f6", fontWeight: 700, fontSize: "1.1rem" }}>{file.name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>{(file.size / 1e6).toFixed(1)} MB — ready for real-time YOLOv8 analysis</div>
                    </div>
                  ) : sampleVideo ? (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ color: "#18d18f", fontWeight: 700, fontSize: "1.1rem" }}>Sample Laboratory Recording Selected</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>{sampleVideo.filename} — ready for analysis</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ color: "var(--text-main)", fontWeight: 700, fontSize: "1.1rem" }}>Drop laboratory video file here or click to browse</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 6 }}>Supports MP4, MOV, AVI lab CCTV surveillance recordings</div>
                    </div>
                  )}

                  {!file && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadSampleVideo();
                      }}
                      disabled={isSampleLoading}
                      style={{
                        marginTop: 6, padding: "10px 22px", background: "rgba(61, 131, 246, 0.12)", border: "1px solid rgba(61, 131, 246, 0.4)",
                        borderRadius: 8, color: "#3d83f6", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 8
                      }}
                    >
                      <PlayCircle size={18} />
                      {isSampleLoading ? "Loading Sample Video..." : sampleVideo ? "Reload Sample Lab Footage" : "Load Sample Lab Video (Instant Test)"}
                    </button>
                  )}

                  {phase === "uploading" && (
                    <div style={{ width: "100%", maxWidth: 360, marginTop: 10 }}>
                      <div style={{ background: "var(--border-color)", borderRadius: 20, height: 10, overflow: "hidden" }}>
                        <div style={{ width: `${uploadPct}%`, height: "100%", background: "linear-gradient(90deg,#3d83f6,#1dd5e6)", transition: "width 0.3s" }} />
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 8, textAlign: "center" }}>{uploadPct}% uploaded to vision processing engine</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Idle CCTV Placeholder if CCTV Mode & Idle */}
            {phase === "idle" && sourceTab === "cctv" && (
              <div className="panel" style={{ padding: 40, minHeight: 380, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 16, background: "#070b14", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
                <Video size={56} style={{ color: "#3d83f6" }} />
                <div style={{ textAlign: "center" }}>
                  <h3 style={{ margin: "0 0 6px", fontSize: "1.15rem", fontWeight: 700, color: "#f8fafc" }}>
                    {activeStreamId ? currentStreams.find(s => s.id === activeStreamId)?.name : "Department CCTV Stream"}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", fontFamily: "monospace" }}>
                    {cctvUrl || "No camera feed selected"}
                  </p>
                  <p style={{ margin: "8px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                    Connected to {currentLab.name} ({currentLab.location})
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => startLive()}
                  disabled={!cctvUrl}
                  style={{
                    marginTop: 8, padding: "11px 28px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", border: "none",
                    borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                    boxShadow: "0 4px 16px rgba(61, 131, 246, 0.3)"
                  }}
                >
                  <Play size={16} /> Connect & Start AI Live Analysis
                </button>
              </div>
            )}

            {/* LIVE / DONE DUAL VIEWPORT THEATER */}
            {(isLive || phase === "done") && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: focusLayout === "dual" ? "1fr 1fr" : "1fr",
                  gap: 16,
                  marginBottom: 16
                }}
              >
                {/* 1. ORIGINAL FOOTAGE WINDOW */}
                {(focusLayout === "dual" || focusLayout === "orig-only") && (
                  <div className="panel" style={{ padding: 0, overflow: "hidden", background: "#050810", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
                    <div style={{ padding: "10px 16px", background: "#0b1220", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3d83f6" }} />
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>
                          Original Camera Stream / Video Footage
                        </span>
                      </div>
                      <span style={{ fontSize: "0.74rem", fontFamily: "monospace", color: "#94a3b8", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 4 }}>
                        {sourceTab === "cctv" ? "RTSP FEED" : "RECORDING"}
                      </span>
                    </div>

                    <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", minHeight: 440, maxHeight: 560, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <video
                        ref={videoRef}
                        src={videoSrcUrl || undefined}
                        autoPlay
                        controls={sourceTab === "upload"}
                        muted
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                        onSeeked={e => {
                          if (sourceTab === "upload" && wsRef.current?.readyState === WebSocket.OPEN) {
                            wsRef.current.send(JSON.stringify({ seek: (e.target as HTMLVideoElement).currentTime }));
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 2. REAL-TIME AI DETECTION & POSE CANVAS WINDOW */}
                {(focusLayout === "dual" || focusLayout === "ai-only") && (
                  <div className="panel" style={{ padding: 0, overflow: "hidden", background: "#050810", border: "1.5px solid rgba(29, 213, 230, 0.35)", borderRadius: 12, boxShadow: "0 0 24px rgba(29, 213, 230, 0.15)" }}>
                    <div style={{ padding: "10px 16px", background: "#0b1626", borderBottom: "1px solid rgba(29, 213, 230, 0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1dd5e6", animation: "pulse 1.2s infinite" }} />
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--cyan, #1dd5e6)" }}>
                          AI Detection & Safety Analytics Feed
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: "#f8fafc", fontSize: "0.78rem", fontWeight: 700, fontFamily: "monospace", background: "rgba(29, 213, 230, 0.12)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(29, 213, 230, 0.3)" }}>
                          {lastFrame?.count ?? 0} {lastFrame?.count === 1 ? "person" : "people"} detected
                        </span>
                      </div>
                    </div>

                    <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", minHeight: 440, maxHeight: 560, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <canvas
                        ref={canvasRef}
                        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                      />
                      <AlertToast alerts={alerts} />
                      {!lastFrame && (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "0.9rem" }}>
                          Connecting to YOLOv8 inference pipeline…
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── STATS ROW (Positioned below the large video windows) ── */}
          {(isLive || phase === "done") && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", width: "100%" }}>
              <Stat label="HEADCOUNT (NOW)" value={lastFrame?.count ?? 0}                       color="#1dd5e6" icon={Users} />
              <Stat label="TOTAL ENTERED"   value={totalSeen}                                   color="#3d83f6" icon={UserPlus} />
              <Stat label="PEAK OCCUPANCY"  value={peakOcc}                                     color="#f3ae2a" icon={TrendingUp} />
              <Stat label="FIRE STATUS"     value={lastFrame?.fire  ? "ALERT" : "CLEAR"} color={lastFrame?.fire  ? "#ff4d57" : "#18d18f"} icon={Flame} />
              <Stat label="SMOKE STATUS"    value={lastFrame?.smoke ? "ALERT" : "CLEAR"} color={lastFrame?.smoke ? "#94a3b8" : "#18d18f"} icon={Cloud} />
            </div>
          )}

          {/* ── DETECTIONS & LOGS 3-COLUMN DASHBOARD (Below the video windows) ── */}
          {(isLive || phase === "done") && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 16 }}>
              
              {/* 1. Live Detections List */}
              <div className="panel" style={{ padding: 18 }}>
                <h3 style={{ margin: "0 0 14px", color: "var(--text-main)", fontSize: "0.88rem", fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Eye size={16} /> Tracked Detections</span>
                  <span style={{ color: "#1dd5e6", fontFamily: "monospace", fontSize: "0.95rem" }}>{lastFrame?.detections.length ?? 0}</span>
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 220, overflowY: "auto" }}>
                  {!lastFrame?.detections.length && <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center", padding: 24 }}>No persons in camera view…</div>}
                  {lastFrame?.detections.map(det => (
                    <div key={det.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-app)", borderRadius: 8, padding: "8px 12px", border: `1px solid ${ACT_COLOR[det.activity]}40` }}>
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: ACT_COLOR[det.activity], flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "var(--text-main)", fontFamily: "monospace", fontSize: "0.84rem", fontWeight: 700 }}>Person #{det.id}</div>
                        <div style={{ color: ACT_COLOR[det.activity], fontSize: "0.74rem", fontWeight: 600 }}>{det.activity.toUpperCase()} · {Math.round(det.conf * 100)}% Confidence</div>
                      </div>
                      {det.is_new && <span style={{ background: "#18d18f25", border: "1px solid #18d18f50", borderRadius: 20, color: "#18d18f", fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px" }}>NEW</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Activity Breakdown */}
              <div className="panel" style={{ padding: 18 }}>
                <h3 style={{ margin: "0 0 14px", color: "var(--text-main)", fontSize: "0.88rem", fontWeight: 700 }}>Activity Breakdown</h3>
                {(["standing", "walking", "running"] as const).map(act => {
                  const total = actCounts.standing + actCounts.walking + actCounts.running || 1;
                  const pct   = Math.round((actCounts[act] / total) * 100);
                  return (
                    <div key={act} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ color: "var(--text-main)", fontSize: "0.84rem", fontWeight: 600 }}>{act.charAt(0).toUpperCase() + act.slice(1)}</span>
                        <span style={{ color: ACT_COLOR[act], fontWeight: 700, fontFamily: "monospace" }}>{pct}%</span>
                      </div>
                      <div style={{ background: "var(--border-color)", borderRadius: 20, height: 7 }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: ACT_COLOR[act], borderRadius: 20, transition: "width 0.4s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 3. Event & Safety Log */}
              <div className="panel" style={{ padding: 18 }}>
                <h3 style={{ margin: "0 0 14px", color: "var(--text-main)", fontSize: "0.88rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><ClipboardList size={16} /> Event & Security Log</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                  {!sessionLog.length && <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center", padding: 24 }}>Session events and alerts will log here…</div>}
                  {[...sessionLog].reverse().map((ev, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "var(--bg-app)", padding: "6px 10px", borderRadius: 6 }}>
                      <span style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: "0.72rem", flexShrink: 0, marginTop: 2 }}>{ev.time.toFixed(1)}s</span>
                      <span style={{ color: ev.color, fontSize: "0.78rem", fontWeight: 600 }}>{ev.event}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ── MODAL: Add New CCTV Camera ── */}
      {showAddForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 460, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Video size={18} className="text-cyan-400" />
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-main)" }}>Add New CCTV Camera Feed</h3>
              </div>
              <button onClick={() => setShowAddForm(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
            </div>

            <form onSubmit={handleAddStream} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>DEPARTMENT LABORATORY</label>
                <select
                  value={addStreamLabId}
                  onChange={e => setAddStreamLabId(Number(e.target.value))}
                  style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "9px 12px", fontSize: "0.85rem", color: "var(--text-main)", outline: "none" }}
                >
                  {LABS.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>CAMERA NAME / ZONE</label>
                <input
                  required
                  placeholder="e.g. High Voltage Test Bench Cam 2"
                  value={addStreamName}
                  onChange={e => setAddStreamName(e.target.value)}
                  style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "9px 12px", fontSize: "0.85rem", color: "var(--text-main)", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>RTSP / HTTP STREAM URL</label>
                <input
                  required
                  placeholder="rtsp://192.168.1.50:554/ch0"
                  value={addStreamUrl}
                  onChange={e => setAddStreamUrl(e.target.value)}
                  style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "9px 12px", fontSize: "0.85rem", color: "var(--text-main)", outline: "none", fontFamily: "monospace" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "8px 20px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", border: "none", borderRadius: 8, color: "#fff", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}
                >
                  Save Camera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
