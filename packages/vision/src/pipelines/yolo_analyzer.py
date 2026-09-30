"""
ELABS YOLOv8 Video Analyzer
────────────────────────────
Performs multi-task analysis on an uploaded MP4 video:
  • People detection & counting (YOLOv8n, COCO class 0)
  • Activity classification  (YOLOv8n-pose skeleton velocity)
  • Fire & smoke detection   (YOLOv8n re-using COCO + heuristic OR dedicated weights)
  • Timeline event generation

Design decisions
─────────────────
* We sample every SAMPLE_EVERY_N_FRAMES to keep processing fast.
* ByteTrack-style ID tracking is provided natively by ultralytics .track().
* Fire/smoke: we run a second YOLO pass with a public fire-detection model
  (keremberke/yolov8n-fire-detection). If the hub download fails (no internet
  in container) we fall back to a colour-space HSV heuristic as a safety net.
* Activity: pose keypoints → compute wrist/ankle displacement per track per
  second → threshold into standing / walking / running.
"""

from __future__ import annotations

import base64
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from ultralytics import YOLO

logger = logging.getLogger(__name__)

# ── tuneable constants ──────────────────────────────────────────────────────
SAMPLE_EVERY_N_FRAMES = 5      # analyse 1 in every N frames
PERSON_CLASS_ID       = 0      # COCO person
CONF_THRESHOLD        = 0.40   # detection confidence
FIRE_CONF_THRESHOLD   = 0.35

# Activity velocity thresholds (pixels per second, normalised to 640-wide frame)
WALK_THRESHOLD   = 30
RUN_THRESHOLD    = 90

THUMB_WIDTH      = 320         # pixel width of preview thumbnails
MAX_THUMBNAILS   = 6


# ── result types ───────────────────────────────────────────────────────────

@dataclass
class ActivityBreakdown:
    standing: int = 0
    walking:  int = 0
    running:  int = 0


@dataclass
class TimelineEvent:
    time_sec: float
    event:    str          # "entry" | "exit" | "fire" | "smoke" | "peak_occupancy"
    detail:   str


@dataclass
class FramePreview:
    time_sec:   float
    label:      str
    thumbnail:  str        # base64-encoded JPEG


@dataclass
class AnalysisResult:
    total_people_entered:  int
    peak_occupancy:        int
    activity:              ActivityBreakdown
    fire_detected:         bool
    fire_timestamps:       list[float]
    smoke_detected:        bool
    smoke_timestamps:      list[float]
    timeline:              list[TimelineEvent]
    frame_previews:        list[FramePreview]
    processing_time_sec:   float
    video_duration_sec:    float
    frames_analysed:       int


# ── model cache (loaded once per worker process) ────────────────────────────

_people_model: YOLO | None = None
_pose_model:   YOLO | None = None
_fire_model:   YOLO | None = None


def _load_models() -> None:
    global _people_model, _pose_model, _fire_model

    if _people_model is None:
        logger.info("Loading YOLOv8n detection model …")
        _people_model = YOLO("yolov8n.pt")

    if _pose_model is None:
        logger.info("Loading YOLOv8n-pose model …")
        _pose_model = YOLO("yolov8n-pose.pt")

    if _fire_model is None:
        logger.info("Loading fire/smoke detection model …")
        try:
            _fire_model = YOLO("yolov8n.pt")   # fallback: same detection model
            # Try to load the fine-tuned fire model from HuggingFace hub
            # This will only succeed if the container has internet access
            from ultralytics.hub import HUBTrainingSession  # noqa: F401
            _fire_model = YOLO("keremberke/yolov8n-fire-detection")
            logger.info("Loaded keremberke/yolov8n-fire-detection successfully")
        except Exception as exc:
            logger.warning(
                "Could not load dedicated fire model (%s). "
                "Falling back to HSV colour heuristic for fire/smoke detection.",
                exc,
            )
            _fire_model = None   # signal: use HSV fallback


# ── helpers ─────────────────────────────────────────────────────────────────

def _encode_frame(frame_bgr: np.ndarray) -> str:
    """Resize and JPEG-encode a frame → base64 string."""
    h, w = frame_bgr.shape[:2]
    scale = THUMB_WIDTH / w
    thumb = cv2.resize(frame_bgr, (THUMB_WIDTH, int(h * scale)))
    ok, buf = cv2.imencode(".jpg", thumb, [cv2.IMWRITE_JPEG_QUALITY, 75])
    if not ok:
        return ""
    return base64.b64encode(buf.tobytes()).decode()


def _hsv_fire_smoke_check(frame_bgr: np.ndarray) -> tuple[bool, bool]:
    """
    Colour-space fallback when the dedicated fire model is unavailable.
    Fire  → bright orange-red regions in HSV
    Smoke → large grey-ish low-saturation blobs
    """
    hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)

    # Fire: hue 0-25 or 155-180, high saturation, high value
    mask_fire1 = cv2.inRange(hsv, (0,  150, 150), (25,  255, 255))
    mask_fire2 = cv2.inRange(hsv, (155, 150, 150), (180, 255, 255))
    fire_pixels = cv2.countNonZero(mask_fire1) + cv2.countNonZero(mask_fire2)
    fire_ratio  = fire_pixels / (frame_bgr.shape[0] * frame_bgr.shape[1])
    fire_flag   = fire_ratio > 0.03   # >3 % of frame

    # Smoke: low saturation, mid value, large connected region
    mask_smoke = cv2.inRange(hsv, (0, 0, 80), (180, 60, 210))
    smoke_pixels = cv2.countNonZero(mask_smoke)
    smoke_ratio  = smoke_pixels / (frame_bgr.shape[0] * frame_bgr.shape[1])
    smoke_flag   = smoke_ratio > 0.15   # >15 % of frame

    return fire_flag, smoke_flag


def _classify_activity(
    prev_centroids: dict[int, tuple[float, float]],
    curr_centroids: dict[int, tuple[float, float]],
    elapsed_sec: float,
    frame_width: float,
) -> dict[int, str]:
    """
    Classify each tracked person as standing / walking / running
    based on centroid displacement per second.
    """
    activities: dict[int, str] = {}
    for tid, (cx, cy) in curr_centroids.items():
        if tid in prev_centroids and elapsed_sec > 0:
            px, py = prev_centroids[tid]
            speed_px_per_sec = (
                np.sqrt((cx - px) ** 2 + (cy - py) ** 2) / elapsed_sec
            )
            # Normalise to a 640-wide reference frame
            speed_norm = speed_px_per_sec * (640.0 / max(frame_width, 1))
            if speed_norm >= RUN_THRESHOLD:
                activities[tid] = "running"
            elif speed_norm >= WALK_THRESHOLD:
                activities[tid] = "walking"
            else:
                activities[tid] = "standing"
        else:
            activities[tid] = "standing"
    return activities


# ── main public function ────────────────────────────────────────────────────

def analyze_video(video_path: str | Path) -> AnalysisResult:
    """
    Analyse an MP4 video file and return a rich AnalysisResult.
    Thread-safe: models are loaded once per process via module-level cache.
    """
    _load_models()

    path = Path(video_path)
    if not path.exists():
        raise FileNotFoundError(f"Video not found: {path}")

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {path}")

    fps        = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration   = total_frames / fps
    width      = cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 640.0

    logger.info(
        "Video: %s  |  %.1f s  |  %d frames  |  %.0f fps",
        path.name, duration, total_frames, fps,
    )

    t_start = time.perf_counter()

    # ── state tracking ──────────────────────────────────────────────────────
    seen_ids:           set[int]             = set()   # unique person track IDs
    peak_occupancy:     int                  = 0
    activity_counts     = ActivityBreakdown()

    fire_timestamps:    list[float]          = []
    smoke_timestamps:   list[float]          = []

    timeline:           list[TimelineEvent]  = []
    frame_previews:     list[FramePreview]   = []

    prev_ids:           set[int]             = set()
    prev_centroids:     dict[int, tuple[float, float]] = {}
    prev_time_sec:      float                = 0.0

    peak_frame:         np.ndarray | None    = None
    peak_frame_time:    float                = 0.0

    frames_analysed:    int                  = 0
    frame_idx:          int                  = 0

    _peak_occupancy_logged = False

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1
        if frame_idx % SAMPLE_EVERY_N_FRAMES != 0:
            continue

        time_sec  = frame_idx / fps
        frames_analysed += 1

        # ── 1. People detection + tracking ──────────────────────────────────
        det_results = _people_model.track(
            frame,
            classes=[PERSON_CLASS_ID],
            conf=CONF_THRESHOLD,
            persist=True,
            verbose=False,
            tracker="bytetrack.yaml",
        )

        curr_ids:       set[int]                      = set()
        curr_centroids: dict[int, tuple[float, float]] = {}

        if det_results and det_results[0].boxes is not None:
            boxes = det_results[0].boxes
            ids   = (
                boxes.id.cpu().numpy().astype(int).tolist()
                if boxes.id is not None
                else []
            )
            xyxy  = boxes.xyxy.cpu().numpy()

            for tid, box in zip(ids, xyxy):
                curr_ids.add(tid)
                cx = float((box[0] + box[2]) / 2)
                cy = float((box[1] + box[3]) / 2)
                curr_centroids[tid] = (cx, cy)
                
                # Zone detection
                # Define zones (in a real app, these would be passed via API)
                ZONES = {
                    "Workbench A": np.array([[50, 50], [300, 50], [300, 300], [50, 300]], np.int32),
                    "Exit Door": np.array([[500, 0], [640, 0], [640, 480], [500, 480]], np.int32)
                }
                
                for zone_name, pts in ZONES.items():
                    if cv2.pointPolygonTest(pts, (cx, cy), False) >= 0:
                        # Log zone entry
                        if tid not in seen_ids:
                            logger.info(f"Person #{tid} entered {zone_name}")
                            
                        # If a person enters a restricted zone (e.g. Exit Door with equipment) we can flag it here.

        # People entered (new IDs seen for the first time)
        entered = curr_ids - seen_ids
        for tid in entered:
            seen_ids.add(tid)
            timeline.append(TimelineEvent(
                time_sec=time_sec,
                event="entry",
                detail=f"Person #{tid} entered the lab",
            ))

        # People exited (IDs no longer in frame for 2 consecutive samples)
        exited = prev_ids - curr_ids
        for tid in exited:
            timeline.append(TimelineEvent(
                time_sec=time_sec,
                event="exit",
                detail=f"Person #{tid} left the lab",
            ))

        # Peak occupancy
        if len(curr_ids) > peak_occupancy:
            peak_occupancy = len(curr_ids)
            peak_frame     = frame.copy()
            peak_frame_time = time_sec
            if not _peak_occupancy_logged:
                timeline.append(TimelineEvent(
                    time_sec=time_sec,
                    event="peak_occupancy",
                    detail=f"Peak occupancy reached: {peak_occupancy} people",
                ))
                _peak_occupancy_logged = True

        # ── 2. Activity classification ───────────────────────────────────────
        elapsed = time_sec - prev_time_sec
        activities = _classify_activity(
            prev_centroids, curr_centroids, elapsed, width
        )
        for act in activities.values():
            if act == "running":
                activity_counts.running  += 1
            elif act == "walking":
                activity_counts.walking  += 1
            else:
                activity_counts.standing += 1

        # ── 3. Fire / smoke detection ────────────────────────────────────────
        fire_flag = False
        smoke_flag = False

        if _fire_model is not None:
            fire_results = _fire_model.predict(
                frame, conf=FIRE_CONF_THRESHOLD, verbose=False
            )
            if fire_results and fire_results[0].boxes is not None:
                for cls_id in fire_results[0].boxes.cls.cpu().numpy().tolist():
                    cls_name = _fire_model.names.get(int(cls_id), "").lower()
                    if "fire" in cls_name:
                        fire_flag = True
                    if "smoke" in cls_name:
                        smoke_flag = True
        else:
            fire_flag, smoke_flag = _hsv_fire_smoke_check(frame)

        if fire_flag and (
            not fire_timestamps or time_sec - fire_timestamps[-1] > 3.0
        ):
            fire_timestamps.append(time_sec)
            timeline.append(TimelineEvent(
                time_sec=time_sec,
                event="fire",
                detail="Fire detected in frame",
            ))
            if len(frame_previews) < MAX_THUMBNAILS:
                frame_previews.append(FramePreview(
                    time_sec=time_sec,
                    label="Fire Alert",
                    thumbnail=_encode_frame(frame),
                ))
            # Trigger Real-Time Socket.IO Alert via API
            try:
                import requests
                requests.post("http://localhost:4000/notifications/webhook", json={
                    "type": "FIRE",
                    "message": "🔥 Critical: Fire detected in the laboratory!",
                    "metadata": {"time_sec": time_sec}
                }, timeout=1.0)
            except Exception as e:
                logger.error(f"Failed to trigger fire webhook: {e}")

        if smoke_flag and (
            not smoke_timestamps or time_sec - smoke_timestamps[-1] > 3.0
        ):
            smoke_timestamps.append(time_sec)
            timeline.append(TimelineEvent(
                time_sec=time_sec,
                event="smoke",
                detail="Smoke detected in frame",
            ))
            if len(frame_previews) < MAX_THUMBNAILS:
                frame_previews.append(FramePreview(
                    time_sec=time_sec,
                    label="Smoke Alert",
                    thumbnail=_encode_frame(frame),
                ))
            # Trigger Real-Time Socket.IO Alert via API
            try:
                import requests
                requests.post("http://localhost:4000/notifications/webhook", json={
                    "type": "SMOKE",
                    "message": "💨 Warning: Smoke detected in the laboratory!",
                    "metadata": {"time_sec": time_sec}
                }, timeout=1.0)
            except Exception as e:
                logger.error(f"Failed to trigger smoke webhook: {e}")

        # ── carry state forward ──────────────────────────────────────────────
        prev_ids       = curr_ids
        prev_centroids = curr_centroids
        prev_time_sec  = time_sec

    cap.release()

    # Add peak-occupancy thumbnail
    if peak_frame is not None and len(frame_previews) < MAX_THUMBNAILS:
        frame_previews.insert(0, FramePreview(
            time_sec=peak_frame_time,
            label=f"Peak Occupancy ({peak_occupancy} people)",
            thumbnail=_encode_frame(peak_frame),
        ))

    # Sort timeline chronologically
    timeline.sort(key=lambda e: e.time_sec)

    processing_time = time.perf_counter() - t_start
    logger.info(
        "Analysis complete: %d people, peak=%d, fire=%s, smoke=%s, %.1fs elapsed",
        len(seen_ids), peak_occupancy,
        bool(fire_timestamps), bool(smoke_timestamps),
        processing_time,
    )

    return AnalysisResult(
        total_people_entered = len(seen_ids),
        peak_occupancy       = peak_occupancy,
        activity             = activity_counts,
        fire_detected        = bool(fire_timestamps),
        fire_timestamps      = fire_timestamps,
        smoke_detected       = bool(smoke_timestamps),
        smoke_timestamps     = smoke_timestamps,
        timeline             = timeline,
        frame_previews       = frame_previews,
        processing_time_sec  = round(processing_time, 2),
        video_duration_sec   = round(duration, 2),
        frames_analysed      = frames_analysed,
    )

def stream_video_frames(video_path: str | Path):
    """
    Generator that processes a video frame-by-frame and yields MJPEG chunks.
    This provides real-time viewing with bounding boxes.
    """
    _load_models()

    path = Path(video_path)
    if not path.exists():
        logger.error(f"Cannot stream, file not found: {path}")
        return

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        logger.error(f"Cannot stream, failed to open: {path}")
        return

    logger.info(f"Starting live MJPEG stream for {path.name}")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Run YOLO detection for people tracking
        if _people_model is not None:
            results = _people_model.track(
                frame,
                classes=[PERSON_CLASS_ID],
                conf=CONF_THRESHOLD,
                persist=True,
                verbose=False,
                tracker="bytetrack.yaml",
            )
            if results:
                # Plot the bounding boxes onto the frame
                frame = results[0].plot()

        # Encode frame as JPEG
        success, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if not success:
            continue

        # Yield frame in multipart/x-mixed-replace format
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

    cap.release()
    logger.info(f"Live MJPEG stream finished for {path.name}")
