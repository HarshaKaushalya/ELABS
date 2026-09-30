"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import { 
  Zap, Sun, Activity, Wrench, Radio, Laptop, Network, FlaskConical,
  Users, UserPlus, TrendingUp, Flame, Cloud, Play, Square, RotateCcw,
  FileVideo, Video, Webcam, Eye, ClipboardList, Cpu, Trash2, X, Plus,
  AlertTriangle, UploadCloud, VideoOff, PlayCircle
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
    ctx.lineWidth   = 2;
    ctx.setLineDash(is_new ? [6, 3] : []);
    ctx.strokeRect(x1, y1, w, h);
    ctx.setLineDash([]);

    // Label bar
    ctx.fillStyle = color + "cc";
    ctx.fillRect(x1, y1 - 24, w, 24);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px monospace";
    ctx.fillText(`#${id} ${activity} ${Math.round(conf * 100)}%`, x1 + 4, y1 - 7);
  }

  // Pose skeletons
  for (const pose of data.poses) {
    const kps = pose.keypoints;
    ctx.lineWidth = 2;
    for (const [a, b] of SKELETON) {
      const ka = kps[a], kb = kps[b];
      if (!ka || !kb || ka.conf < 0.3 || kb.conf < 0.3) continue;
      ctx.strokeStyle = "#ffffff80";
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
      ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // Fire overlay
  if (data.fire) {
    const grad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height * 0.8, 0,
      canvas.width / 2, canvas.height * 0.8, canvas.height * 0.5,
    );
    grad.addColorStop(0, "rgba(255,60,0,0.35)");
    grad.addColorStop(1, "rgba(255,60,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff3d00";
    ctx.font = `bold ${Math.max(18, canvas.height * 0.03)}px sans-serif`;
    ctx.fillText("FIRE DETECTED", 16, 44);
  }
  if (data.smoke) {
    ctx.fillStyle = "rgba(180,180,180,0.12)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ccc";
    ctx.font = `bold ${Math.max(18, canvas.height * 0.03)}px sans-serif`;
    ctx.fillText("SMOKE DETECTED", 16, data.fire ? 80 : 44);
  }
}

// ── Alert toast ───────────────────────────────────────────────────────────────
function AlertToast({ alerts }: { alerts: { msg: string; type: string; ts: number }[] }) {
  const colors: Record<string, string> = {
    fire: "#ff4d57", smoke: "#94a3b8", entry: "#18d18f", exit: "#f3ae2a"
  };
  return (
    <div style={{ position: "absolute", top: 8, right: 8, display: "flex", flexDirection: "column", gap: 6, zIndex: 10, maxWidth: 240, pointerEvents: "none" }}>
      {alerts.slice(-4).reverse().map(a => (
        <div key={a.ts} style={{ background: `${colors[a.type] ?? "#3d83f6"}22`, border: `1px solid ${colors[a.type] ?? "#3d83f6"}60`, borderRadius: 8, padding: "8px 12px", color: colors[a.type] ?? "var(--text-main)", fontSize: "0.78rem", fontWeight: 600, backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 8 }}>
          {a.type === "fire" ? <Flame size={14} /> : a.type === "smoke" ? <Cloud size={14} /> : a.type === "entry" ? <UserPlus size={14} /> : <Users size={14} />}
          {a.msg}
        </div>
      ))}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function Stat({ label, value, color, icon: Icon }: { label: string; value: string | number; color: string; icon: React.ComponentType<any> }) {
  return (
    <div style={{ background: "var(--bg-card)", border: `1px solid ${color}30`, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 110 }}>
      <div style={{ color, marginBottom: 6 }}><Icon size={20} /></div>
      <div style={{ color, fontSize: "1.5rem", fontWeight: 700, fontFamily: "monospace" }}>{value}</div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 600, letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

// ── Fixed laboratory sections ──────────────────────────────────────────────────
const LABS = [
  { id: 3, name: "Electric Machines and Power Systems Laboratory", icon: Zap },
  { id: 10, name: "High Voltage and Renewable Energy Laboratory", icon: Sun },
  { id: 2, name: "Electronics and Measurements Laboratory", icon: Activity },
  { id: 16, name: "Electronics Workshop", icon: Wrench },
  { id: 4, name: "Communication and Systems Laboratory", icon: Radio },
  { id: 6, name: "Computer and Information Engineering Laboratory", icon: Laptop },
  { id: 14, name: "Networking Laboratory", icon: Network },
  { id: 13, name: "Undergraduate Project Development Laboratory", icon: FlaskConical }
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function VisionMonitoringPage() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef     = useRef<WebSocket | null>(null);

  const [phase, setPhase]           = useState<"idle" | "uploading" | "live" | "done" | "error">("idle");
  const [file, setFile]             = useState<File | null>(null);
  const [cctvUrl, setCctvUrl]       = useState("");
  const [sourceTab, setSourceTab]   = useState<"upload" | "cctv" | "webcam">("upload");
  const [error, setError]           = useState("");
  const [uploadPct, setUploadPct]   = useState(0);

  // ── Lab Selector and CCTV streams states
  const [selectedLabId, setSelectedLabId] = useState<number>(3);
  const [cctvStreams, setCctvStreams] = useState<Record<number, { id: string; name: string; url: string }[]>>({});
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);

  // Add stream form states
  const [addStreamName, setAddStreamName] = useState("");
  const [addStreamUrl, setAddStreamUrl] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Keep ref of lab ID to read inside WebSocket handle callback without recreation
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
          setSourceTab("cctv");
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaults = {
        6: [
          { id: "cctv_cie_1", name: "CIE Front Entrance", url: "rtsp://127.0.0.1:8554/cie-main" },
          { id: "cctv_cie_2", name: "Computing Cluster Cam 2", url: "rtsp://127.0.0.1:8554/cie-cluster" }
        ],
        3: [
          { id: "cctv_mps_1", name: "Power Lab Entrance", url: "rtsp://127.0.0.1:8554/power-entrance" }
        ],
        14: [
          { id: "cctv_net_1", name: "Networking Main Rack", url: "rtsp://127.0.0.1:8554/net-rack" }
        ]
      };
      localStorage.setItem("elabs_cctv_streams", JSON.stringify(defaults));
      setCctvStreams(defaults);
      setActiveStreamId("cctv_mps_1");
      setCctvUrl("rtsp://127.0.0.1:8554/power-entrance");
      setSourceTab("cctv");
    }
  }, []);

  // ── Video source for the <video> element (blob URL)
  const [videoSrcUrl, setVideoSrcUrl] = useState<string>("");

  // ── Analytics state
  const [lastFrame, setLastFrame]   = useState<FrameData | null>(null);
  const [peakOcc, setPeakOcc]       = useState(0);
  const [totalSeen, setTotalSeen]   = useState(0);
  const [alerts, setAlerts]         = useState<{ msg: string; type: string; ts: number }[]>([]);
  const [sessionLog, setSessionLog] = useState<{ time: number; event: string; color: string }[]>([]);
  const [actCounts, setActCounts]   = useState({ standing: 0, walking: 0, running: 0 });

  // Debounce repeated alerts (same type within 3s)
  const lastAlertAt = useRef<Record<string, number>>({});
  const lastSyncedCountRef = useRef<number>(-1);

  const isLive = phase === "live";

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

  const handleAddStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStreamName.trim() || !addStreamUrl.trim()) return;

    const newStream = {
      id: `stream_${Date.now()}`,
      name: addStreamName.trim(),
      url: addStreamUrl.trim()
    };

    const nextStreams = {
      ...cctvStreams,
      [selectedLabId]: [...(cctvStreams[selectedLabId] || []), newStream]
    };

    setCctvStreams(nextStreams);
    localStorage.setItem("elabs_cctv_streams", JSON.stringify(nextStreams));
    
    setActiveStreamId(newStream.id);
    setCctvUrl(newStream.url);
    setSourceTab("cctv");

    setAddStreamName("");
    setAddStreamUrl("");
    setShowAddForm(false);
  };

  const handleDeleteStream = (streamId: string) => {
    const nextStreams = {
      ...cctvStreams,
      [selectedLabId]: (cctvStreams[selectedLabId] || []).filter(s => s.id !== streamId)
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

  // ── Handle incoming WS frame ──────────────────────────────────────────────
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

    // ── Draw on AI canvas ─────────────────────────────────────────────────
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

  // ── Start analysis ────────────────────────────────────────────────────────
  const startLive = useCallback(async () => {
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

    if (sourceTab === "upload" && file) {
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
            resolve(r.path);
          } catch { reject(new Error("Upload failed")); }
        };
        xhr.onerror = () => reject(new Error("Network Error: Could not connect to the Vision Service. Please ensure the Vision backend is running on port 8002."));
        xhr.send(form);
      });

    } else if (sourceTab === "cctv" && cctvUrl) {
      videoPath = cctvUrl;
      sessionId = `cctv_${Date.now()}`;
    } else if (sourceTab === "webcam") {
      videoPath = "0";
      sessionId = `webcam_${Date.now()}`;
    } else {
      setError("Please select a video file or configure a CCTV stream.");
      return;
    }

    setPhase("live");

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

  }, [sourceTab, file, cctvUrl, handleFrameData]);

  const stopStream = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ stop: true }));
    wsRef.current?.close();
    wsRef.current = null;
    videoRef.current?.pause();
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
    setLastFrame(null);
    setError("");
    setUploadPct(0);
    setVideoSrcUrl("");
  }, [stopStream]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("video/")) setFile(f);
  }, []);

  const currentLab = LABS.find(l => l.id === selectedLabId) || LABS[0];
  const currentStreams = cctvStreams[selectedLabId] || [];

  return (
    <AppShell title="Vision Monitoring" subtitle="Real-time AI-powered lab surveillance — YOLOv8 people tracking, pose estimation, fire & smoke detection">
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .lab-btn {
          width: 100%;
          text-align: left;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 10px 14px;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .lab-btn:hover {
          background: var(--panel-2);
          color: var(--text);
          border-color: var(--line);
        }
        .lab-btn.active {
          background: rgba(61, 131, 246, 0.08);
          border-color: var(--blue);
          color: var(--blue);
          font-weight: 600;
          box-shadow: inset 0 0 8px rgba(61, 131, 246, 0.05);
        }
        .stream-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 6px;
          background: var(--bg-app);
          border: 1px solid var(--line);
          font-size: 0.8rem;
          color: var(--text);
          cursor: pointer;
          transition: all 0.15s;
        }
        .stream-item:hover {
          border-color: var(--blue);
          background: rgba(61, 131, 246, 0.03);
        }
        .stream-item.active {
          border-color: var(--cyan);
          background: rgba(29, 213, 230, 0.05);
          color: var(--cyan);
          font-weight: 600;
        }
        .stream-item-delete {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 1.1rem;
          padding: 0 4px;
          line-height: 1;
        }
        .stream-item-delete:hover {
          color: var(--red);
        }
      `}</style>

      {/* ── Controls bar ── */}
      <div className="panel" style={{ marginBottom: 16, padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 10, color: "var(--text)" }}>
            {(() => {
              const Icon = currentLab.icon;
              return <Icon size={18} />;
            })()}
            <strong style={{ fontSize: "0.95rem" }}>{currentLab.name}</strong>
          </div>

          {/* Source tabs */}
          <div style={{ display: "flex", background: "var(--bg-app)", borderRadius: 10, border: "1px solid var(--border-color)", overflow: "hidden" }}>
            {(["upload", "cctv", "webcam"] as const).map(tab => (
              <button key={tab} onClick={() => setSourceTab(tab)} disabled={isLive}
                style={{ padding: "8px 18px", border: "none", borderRight: "1px solid var(--border-color)", fontWeight: 600, fontSize: "0.82rem",
                  cursor: isLive ? "not-allowed" : "pointer", transition: "all 0.2s",
                  background: sourceTab === tab ? "#3d83f620" : "transparent",
                  color:      sourceTab === tab ? "#3d83f6"   : "var(--text-muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {tab === "upload" ? <FileVideo size={14} /> : tab === "cctv" ? <Video size={14} /> : <Webcam size={14} />}
                  {tab === "upload" ? "Video File" : tab === "cctv" ? "CCTV Stream" : "Webcam"}
                </span>
              </button>
            ))}
          </div>

          {!isLive ? (
            <button onClick={startLive} disabled={phase === "uploading"}
              style={{ padding: "9px 24px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Play size={14} />
              {phase === "uploading" ? `Uploading ${uploadPct}%…` : "Start Analysis"}
            </button>
          ) : (
            <button onClick={stopStream}
              style={{ padding: "9px 24px", background: "#ff4d5720", border: "1px solid #ff4d5760", borderRadius: 8, color: "#ff4d57", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Square size={14} />
              Stop
            </button>
          )}

          {(phase === "done" || phase === "error") && (
            <button onClick={reset}
              style={{ padding: "9px 24px", background: "var(--border-color)", border: "1px solid #2a4060", borderRadius: 8, color: "var(--text-muted)", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <RotateCcw size={14} />
              Reset
            </button>
          )}

          <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
            {isLive && <span style={{ background: "#18d18f20", border: "1px solid #18d18f40", borderRadius: 20, color: "#18d18f", fontSize: "0.75rem", fontWeight: 700, padding: "4px 12px", animation: "pulse 1.5s ease-in-out infinite" }}>● LIVE</span>}
            {lastFrame?.fire  && <span style={{ background: "#ff4d5720", border: "1px solid #ff4d5760", borderRadius: 20, color: "#ff4d57", fontSize: "0.75rem", fontWeight: 700, padding: "4px 12px", display: "flex", alignItems: "center", gap: 4 }}><Flame size={12} /> FIRE</span>}
            {lastFrame?.smoke && <span style={{ background: "#94a3b820", border: "1px solid #94a3b860", borderRadius: 20, color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700, padding: "4px 12px", display: "flex", alignItems: "center", gap: 4 }}><Cloud size={12} /> SMOKE</span>}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, background: "#ff4d5715", border: "1px solid #ff4d5740", borderRadius: 8, padding: "10px 14px", color: "#ff4d57", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} />
            {error}
          </div>
        )}
      </div>

      {/* ── Main grid (3 Columns) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 300px", gap: 14, alignItems: "start" }}>

        {/* COLUMN 1: Lab Sections List & Stream manager */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          
          {/* Labs list panel */}
          <div className="panel" style={{ padding: 14 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "0.88rem", color: "var(--text)", fontWeight: 700, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 8 }}><FlaskConical size={16} /> LAB SECTIONS</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {LABS.map(l => {
                const Icon = l.icon;
                return (
                  <button
                    key={l.id}
                    className={`lab-btn ${selectedLabId === l.id ? "active" : ""}`}
                    onClick={() => handleLabChange(l.id)}
                    disabled={isLive}
                  >
                    <Icon size={16} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name.replace(" Laboratory", "")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CCTV Feed manager panel */}
          <div className="panel" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: "0.88rem", color: "var(--text)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><Video size={16} /> CCTV FEEDS</h3>
              {!isLive && (
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  style={{ background: "transparent", border: "none", color: "var(--blue)", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}
                >
                  {showAddForm ? "Cancel" : "+ Add"}
                </button>
              )}
            </div>

            {/* Add stream form */}
            {showAddForm && (
              <form onSubmit={handleAddStream} style={{ background: "var(--bg-app)", padding: 10, borderRadius: 8, border: "1px dashed var(--line)", marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  required
                  placeholder="Stream Name (e.g. Rack 1)"
                  value={addStreamName}
                  onChange={e => setAddStreamName(e.target.value)}
                  style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 4, padding: "5px 8px", fontSize: "0.8rem", color: "var(--text)" }}
                />
                <input
                  required
                  placeholder="RTSP / HTTP stream URL"
                  value={addStreamUrl}
                  onChange={e => setAddStreamUrl(e.target.value)}
                  style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 4, padding: "5px 8px", fontSize: "0.8rem", color: "var(--text)" }}
                />
                <button
                  type="submit"
                  style={{ width: "100%", background: "var(--blue)", border: "none", color: "#fff", borderRadius: 4, padding: "5px 0", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                >
                  Save Stream
                </button>
              </form>
            )}

            {/* Configured streams list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {currentStreams.length === 0 && (
                <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", padding: "10px 0", textAlign: "center" }}>
                  No cameras configured.
                </div>
              )}
              {currentStreams.map(s => (
                <div
                  key={s.id}
                  className={`stream-item ${activeStreamId === s.id && sourceTab === "cctv" ? "active" : ""}`}
                  onClick={() => {
                    if (isLive) return;
                    setActiveStreamId(s.id);
                    setCctvUrl(s.url);
                    setSourceTab("cctv");
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {s.name}
                  </span>
                  {!isLive && (
                    <button
                      type="button"
                      className="stream-item-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStream(s.id);
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* COLUMN 2: Main video analysis area */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Drop zone — shown when idle in upload mode */}
          {(phase === "idle" || phase === "uploading") && sourceTab === "upload" && (
            <div className="panel" style={{ padding: 0 }}>
              <div onDrop={onDrop} onDragOver={e => e.preventDefault()}
                onClick={() => !isLive && document.getElementById("visionFileInput")?.click()}
                style={{ minHeight: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
                  cursor: "pointer", border: `2px dashed ${file ? "#3d83f6" : "var(--border-color)"}`, borderRadius: 14, padding: 32,
                  background: file ? "#3d83f608" : "transparent", transition: "all 0.2s" }}>
                <input id="visionFileInput" type="file" accept="video/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
                <div style={{ color: "var(--text-muted)" }}><FileVideo size={48} /></div>
                {file ? (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#3d83f6", fontWeight: 700 }}>{file.name}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{(file.size / 1e6).toFixed(1)} MB — ready to analyse</div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "var(--text-main)", fontWeight: 600 }}>Drop a video or click to browse</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 4 }}>MP4, MOV, AVI</div>
                  </div>
                )}
                {phase === "uploading" && (
                  <div style={{ width: "100%", maxWidth: 300 }}>
                    <div style={{ background: "var(--border-color)", borderRadius: 20, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${uploadPct}%`, height: "100%", background: "linear-gradient(90deg,#3d83f6,#1dd5e6)", transition: "width 0.3s" }} />
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: 6, textAlign: "center" }}>{uploadPct}% uploaded</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Idle CCTV/webcam placeholder */}
          {phase === "idle" && sourceTab !== "upload" && (
            <div className="panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 220, gap: 12 }}>
              <div style={{ color: "var(--text-muted)" }}><VideoOff size={48} /></div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>
                {sourceTab === "cctv" ? (
                  cctvUrl ? `Configured Feed: ${cctvUrl}\nClick Start Analysis above to connect.` : "No feed configured. Select or add a CCTV stream in the left panel."
                ) : (
                  "Click Start Analysis to activate Webcam feed."
                )}
              </div>
            </div>
          )}

          {/* ── Video panels (side by side) ── */}
          {(isLive || phase === "done") && (
            <div style={{ display: "grid", gridTemplateColumns: sourceTab === "upload" ? "1fr 1fr" : "1fr", gap: 14 }}>

              {/* LEFT: Original video player — only for file upload */}
              {sourceTab === "upload" && (
                <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "10px 16px", background: "var(--border-color)", borderBottom: "1px solid #2a4060", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
                    Original Video
                  </div>
                  <video
                    ref={videoRef}
                    src={videoSrcUrl}
                    autoPlay
                    controls
                    muted
                    playsInline
                    style={{ width: "100%", display: "block", background: "#000", maxHeight: 420 }}
                    onSeeked={e => {
                      if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ seek: (e.target as HTMLVideoElement).currentTime }));
                      }
                    }}
                  />
                </div>
              )}

              {/* RIGHT: AI Analysis canvas */}
              <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", background: "var(--border-color)", borderBottom: "1px solid #2a4060", fontSize: "0.85rem", fontWeight: 700, color: "#1dd5e6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>AI Analysis</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 400 }}>{lastFrame?.count ?? 0} people detected</span>
                </div>
                <div style={{ position: "relative", background: "#000" }}>
                  <canvas
                    ref={canvasRef}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                  <AlertToast alerts={alerts} />
                  {!lastFrame && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                      Waiting for first frame…
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ── Stats row ── */}
          {(isLive || phase === "done") && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Stat label="PEOPLE NOW"     value={lastFrame?.count ?? 0}                       color="#1dd5e6" icon={Users} />
              <Stat label="TOTAL ENTERED"  value={totalSeen}                                   color="#3d83f6" icon={UserPlus} />
              <Stat label="PEAK OCCUPANCY" value={peakOcc}                                     color="#f3ae2a" icon={TrendingUp} />
              <Stat label="FIRE"  value={lastFrame?.fire  ? "YES" : "NO"} color={lastFrame?.fire  ? "#ff4d57" : "#18d18f"} icon={Flame} />
              <Stat label="SMOKE" value={lastFrame?.smoke ? "YES" : "NO"} color={lastFrame?.smoke ? "#94a3b8" : "#18d18f"} icon={Cloud} />
            </div>
          )}

          {/* ── Activity breakdown ── */}
          {(isLive || phase === "done") && (
            <div className="panel" style={{ padding: "16px 20px" }}>
              <h3 style={{ margin: "0 0 14px", color: "var(--text-main)", fontSize: "0.95rem" }}>Activity Breakdown</h3>
              {(["standing", "walking", "running"] as const).map(act => {
                const total = actCounts.standing + actCounts.walking + actCounts.running || 1;
                const pct   = Math.round((actCounts[act] / total) * 100);
                const icons = { standing: "standing", walking: "walking", running: "running" };
                return (
                  <div key={act} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "var(--text-main)", fontSize: "0.85rem" }}>{act.charAt(0).toUpperCase() + act.slice(1)}</span>
                      <span style={{ color: ACT_COLOR[act], fontWeight: 700, fontFamily: "monospace" }}>{pct}%</span>
                    </div>
                    <div style={{ background: "var(--border-color)", borderRadius: 20, height: 6 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: ACT_COLOR[act], borderRadius: 20, transition: "width 0.4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMN 3: Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Detection list */}
          <div className="panel" style={{ padding: 16 }}>
            <h3 style={{ margin: "0 0 12px", color: "var(--text-main)", fontSize: "0.88rem", display: "flex", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Eye size={16} /> Detections</span>
              <span style={{ color: "#1dd5e6", fontFamily: "monospace" }}>{lastFrame?.count ?? 0}</span>
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
              {!lastFrame?.detections.length && <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center", padding: 20 }}>No detections yet…</div>}
              {lastFrame?.detections.map(det => (
                <div key={det.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-app)", borderRadius: 8, padding: "7px 10px", border: `1px solid ${ACT_COLOR[det.activity]}30` }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACT_COLOR[det.activity], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "var(--text-main)", fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 600 }}>Person #{det.id}</div>
                    <div style={{ color: ACT_COLOR[det.activity], fontSize: "0.72rem" }}>{det.activity} · {Math.round(det.conf * 100)}%</div>
                  </div>
                  {det.is_new && <span style={{ background: "#18d18f20", border: "1px solid #18d18f40", borderRadius: 20, color: "#18d18f", fontSize: "0.65rem", fontWeight: 700, padding: "1px 7px" }}>NEW</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Event log */}
          <div className="panel" style={{ padding: 16 }}>
            <h3 style={{ margin: "0 0 12px", color: "var(--text-main)", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 8 }}><ClipboardList size={16} /> Event Log</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 280, overflowY: "auto" }}>
              {!sessionLog.length && <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center", padding: 20 }}>Events will appear here…</div>}
              {[...sessionLog].reverse().map((ev, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: "0.72rem", flexShrink: 0, marginTop: 2 }}>{ev.time.toFixed(1)}s</span>
                  <span style={{ color: ev.color, fontSize: "0.78rem" }}>{ev.event}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI models status */}
          <div className="panel" style={{ padding: "14px 16px" }}>
            <h3 style={{ margin: "0 0 10px", color: "var(--text-muted)", fontSize: "0.78rem", letterSpacing: 1, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><Cpu size={14} /> AI MODELS</h3>
            {[
              { name: "YOLOv8n Detection", desc: "People tracking", icon: Eye },
              { name: "YOLOv8n-Pose",      desc: "Skeleton estimation", icon: Users },
              { name: "Fire / Smoke",      desc: "HSV + YOLO", icon: Flame },
              { name: "ByteTrack",         desc: "Multi-object tracking", icon: Activity },
            ].map(m => {
              const Icon = m.icon;
              return (
                <div key={m.name} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: "var(--text-muted)" }}><Icon size={16} /></span>
                  <div>
                    <div style={{ color: "var(--text-main)", fontSize: "0.8rem", fontWeight: 600 }}>{m.name}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{m.desc}</div>
                  </div>
                  <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#18d18f" }} />
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </AppShell>
  );
}
