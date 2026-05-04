"use client";

import { useCallback, useState } from "react";
import { UploadZone } from "./UploadZone";
import { AnalysisStats } from "./AnalysisStats";
import { SafetyPanel } from "./SafetyPanel";
import { EventTimeline } from "./EventTimeline";
import { FramePreviews } from "./FramePreviews";

// ── types ──────────────────────────────────────────────────────────────────

interface ActivityBreakdown {
  standing: number;
  walking: number;
  running: number;
}

interface TimelineEvent {
  time_sec: number;
  event: string;
  detail: string;
}

interface FramePreview {
  time_sec: number;
  label: string;
  thumbnail: string;
}

interface AnalysisResult {
  total_people_entered: number;
  peak_occupancy: number;
  activity: ActivityBreakdown;
  fire_detected: boolean;
  fire_timestamps: number[];
  smoke_detected: boolean;
  smoke_timestamps: number[];
  timeline: TimelineEvent[];
  frame_previews: FramePreview[];
  processing_time_sec: number;
  video_duration_sec: number;
  frames_analysed: number;
}

// ── stage labels shown during processing ────────────────────────────────────

const STAGES = [
  { label: "Uploading video …",          pct: 15 },
  { label: "Extracting frames …",        pct: 30 },
  { label: "Running YOLOv8 detection …", pct: 60 },
  { label: "Classifying activity …",     pct: 80 },
  { label: "Detecting fire & smoke …",   pct: 92 },
  { label: "Aggregating results …",      pct: 99 },
];

// ── Vision service URL ───────────────────────────────────────────────────────
// Uses Next.js public env var (falls back to port 8001 in dev)
const VISION_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_VISION_BASE ?? "http://localhost:8001")
    : "http://localhost:8001";

// ── component ────────────────────────────────────────────────────────────────

type Phase = "idle" | "processing" | "done" | "error";

export function VisionMonitoringPanel() {
  const [phase, setPhase]         = useState<Phase>("idle");
  const [file, setFile]           = useState<File | null>(null);
  const [stageIdx, setStageIdx]   = useState(0);
  const [progress, setProgress]   = useState(0);
  const [result, setResult]       = useState<AnalysisResult | null>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]   = useState("");
  const [abortCtrl, setAbortCtrl] = useState<AbortController | null>(null);

  // ── advance fake progress bar while real XHR runs ─────────────────────
  const startProgressSimulation = useCallback(() => {
    let idx = 0;
    const tick = () => {
      if (idx >= STAGES.length - 1) return;
      idx++;
      setStageIdx(idx);
      setProgress(STAGES[idx].pct);
      // Slow down as we approach 99 %
      const delay = idx < 3 ? 800 : idx < 5 ? 2000 : 4000;
      setTimeout(tick, delay);
    };
    setStageIdx(0);
    setProgress(STAGES[0].pct);
    setTimeout(tick, 800);
  }, []);

  // ── submit ─────────────────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (!file) return;

    const ctrl = new AbortController();
    setAbortCtrl(ctrl);
    setPhase("processing");
    setErrorMsg("");
    startProgressSimulation();

    try {
      const form = new FormData();
      form.append("file", file);

      const resp = await fetch(`${VISION_URL}/vision/analyze-video`, {
        method: "POST",
        body: form,
        signal: ctrl.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData?.detail ?? `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      setResult(data.result as AnalysisResult);
      setVideoPath(data.video_path);
      setProgress(100);
      setPhase("done");
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") {
        setPhase("idle");
        setFile(null);
      } else {
        setErrorMsg((err as Error).message ?? "Unknown error");
        setPhase("error");
      }
    } finally {
      setAbortCtrl(null);
    }
  }, [file, startProgressSimulation]);

  const handleCancel = useCallback(() => {
    abortCtrl?.abort();
  }, [abortCtrl]);

  const handleReset = useCallback(() => {
    setPhase("idle");
    setFile(null);
    setResult(null);
    setVideoPath(null);
    setProgress(0);
    setStageIdx(0);
    setErrorMsg("");
  }, []);

  // ── renders ────────────────────────────────────────────────────────────

  return (
    <div className="vision-panel-root">
      {/* ── HEADER ── */}
      <div className="vision-panel-header">
        <div className="vision-panel-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="#1dd5e6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 7l-7 5 7 5V7z"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
          <span>Vision Monitoring</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="vision-beta-badge">BETA</span>
          {phase === "done" && (
            <span className="vision-yolo-badge">YOLOv8</span>
          )}
        </div>
      </div>

      {/* ── IDLE ── */}
      {phase === "idle" && (
        <div className="vision-idle-wrap">
          <UploadZone onFileSelected={setFile} />
          {file && (
            <button
              id="vision-analyze-btn"
              className="primary-btn vision-analyze-btn"
              type="button"
              onClick={handleAnalyze}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Analyse Video with YOLO
            </button>
          )}
          <p className="vision-hint">
            Upload an MP4 recording from your lab camera to run AI-powered
            people counting, activity classification, and fire &amp; smoke detection.
          </p>
        </div>
      )}

      {/* ── PROCESSING ── */}
      {phase === "processing" && (
        <div className="vision-processing-wrap">
          <div className="vision-processing-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
              stroke="#1dd5e6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className="vision-spin">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
              <path d="M12 2a10 10 0 0110 10"/>
            </svg>
          </div>
          <div className="vision-processing-label">
            {STAGES[stageIdx]?.label ?? "Processing …"}
          </div>
          <div className="vision-progress-track">
            <div
              className="vision-progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="vision-progress-pct">{progress}%</div>
          <button
            className="vision-cancel-btn"
            type="button"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── ERROR ── */}
      {phase === "error" && (
        <div className="vision-error-wrap">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="#ff4d57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div className="vision-error-title">Analysis Failed</div>
          <div className="vision-error-msg">{errorMsg}</div>
          <button className="primary-btn" type="button" onClick={handleReset}>
            Try Again
          </button>
        </div>
      )}

      {/* ── RESULTS ── */}
      {phase === "done" && result && (
        <div className="vision-results-wrap">

          {/* Summary bar */}
          <div className="vision-results-summary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#18d18f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>
              Analysis complete &mdash; {file?.name} &nbsp;·&nbsp;
              {result.frames_analysed} frames analysed
            </span>
            <button
              className="vision-reset-btn"
              type="button"
              onClick={handleReset}
            >
              ↩ Analyse Another Video
            </button>
          </div>

          {/* Stats row */}
          <AnalysisStats
            totalPeople={result.total_people_entered}
            peakOccupancy={result.peak_occupancy}
            activity={result.activity}
            videoDuration={result.video_duration_sec}
            processingTime={result.processing_time_sec}
          />

          {/* Video Stream with YOLO Annotations */}
          {videoPath && (
            <div style={{ marginTop: 24, borderRadius: 12, overflow: "hidden", border: "1px solid #334155", backgroundColor: "#0f172a" }}>
              <div style={{ padding: 16, borderBottom: "1px solid #334155" }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 500, color: "#e2e8f0", marginBottom: 8 }}>
                  📹 Live YOLO Annotations
                </div>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  Real-time people detection, activity classification, and fire/smoke detection with bounding boxes
                </div>
              </div>
              <div style={{ backgroundColor: "#000", aspectRatio: "16/9", overflow: "hidden" }}>
                <img
                  src={`${VISION_URL}/vision/stream?video_path=${encodeURIComponent(videoPath)}`}
                  alt="YOLO Analysis Stream"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  onError={() => {
                    console.error("Failed to load video stream");
                  }}
                />
              </div>
            </div>
          )}

          {/* Safety */}
          <SafetyPanel
            fireDetected={result.fire_detected}
            smokeDetected={result.smoke_detected}
            fireTimestamps={result.fire_timestamps}
            smokeTimestamps={result.smoke_timestamps}
          />

          {/* Key frames + Timeline side by side */}
          <div className="vision-bottom-grid">
            {result.frame_previews.length > 0 && (
              <FramePreviews previews={result.frame_previews} />
            )}
            <EventTimeline events={result.timeline} />
          </div>
        </div>
      )}
    </div>
  );
}
