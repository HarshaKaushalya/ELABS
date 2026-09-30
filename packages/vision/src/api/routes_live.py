"""
ELABS Vision Service — WebSocket Real-time Streaming Endpoint
─────────────────────────────────────────────────────────────
Streams per-frame analysis results as JSON over WebSocket so the
frontend can draw live bounding boxes, poses, activity labels,
fire/smoke alerts and human counts on a <canvas> overlay.

Supports:
  • Uploaded video file (multipart upload then WS session)
  • CCTV / RTSP / webcam URL (send as JSON message)
"""
from __future__ import annotations

import asyncio
import logging
import time
import uuid
from pathlib import Path

import cv2
import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect, status
from fastapi.responses import JSONResponse

from ..core.config import settings
from ..pipelines import yolo_analyzer as _ya   # direct reference to module singleton

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vision/live", tags=["vision-live"])

# ── COCO skeleton pairs (17 keypoints) ───────────────────────────────────────
SKELETON: list[tuple[int, int]] = [
    (0, 1), (0, 2), (1, 3), (2, 4),
    (5, 6), (5, 7), (7, 9), (6, 8), (8, 10),
    (5, 11), (6, 12), (11, 12),
    (11, 13), (13, 15), (12, 14), (14, 16),
]


def _uploads_dir() -> Path:
    d = Path(settings.uploads_dir)
    d.mkdir(parents=True, exist_ok=True)
    return d


# ── Upload endpoint ───────────────────────────────────────────────────────────

@router.post("/upload", summary="Upload video and get session_id for WS stream")
async def upload_for_live(file: UploadFile = File(...)) -> JSONResponse:
    if file.content_type not in (
        "video/mp4", "video/mpeg", "video/quicktime", "application/octet-stream",
    ):
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported type: {file.content_type}",
        )

    session_id = uuid.uuid4().hex
    dst = _uploads_dir() / f"{session_id}_{file.filename or 'video.mp4'}"

    with dst.open("wb") as f:
        while chunk := await file.read(2 * 1024 * 1024):
            f.write(chunk)

    logger.info("Uploaded %s → %s", file.filename, dst.name)
    return JSONResponse({"session_id": session_id, "path": str(dst)})


# ── Per-frame analysis (runs in thread-pool executor) ────────────────────────

def _analyze_frame_sync(
    frame: np.ndarray,
    prev_centroids: dict[int, tuple[float, float]],
    prev_time: float,
    curr_time: float,
    seen_ids: set[int],
    frame_width: float,
) -> dict:
    """
    Synchronous per-frame analysis using module-level model cache from yolo_analyzer.
    Returns a JSON-serialisable dict. Mutates seen_ids in place.
    """
    # Access models from the yolo_analyzer module singleton
    people_model = _ya._people_model
    pose_model   = _ya._pose_model
    fire_model   = _ya._fire_model

    h, w = frame.shape[:2]

    detections: list[dict]             = []
    curr_centroids: dict[int, tuple]   = {}
    curr_ids: set[int]                 = set()
    pose_data: list[dict]              = []
    alerts: list[dict]                 = []

    # ── 1. People detection + ByteTrack tracking ─────────────────────────────
    if people_model is not None:
        det_res = people_model.track(
            frame,
            classes=[_ya.PERSON_CLASS_ID],
            conf=_ya.CONF_THRESHOLD,
            persist=True,
            verbose=False,
            tracker="bytetrack.yaml",
        )
        if det_res and det_res[0].boxes is not None:
            boxes = det_res[0].boxes
            ids = (
                boxes.id.cpu().numpy().astype(int).tolist()
                if boxes.id is not None else []
            )
            xyxy  = boxes.xyxy.cpu().numpy()
            confs = boxes.conf.cpu().numpy()

            for tid, box, conf in zip(ids, xyxy, confs):
                x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
                cx = float((x1 + x2) / 2)
                cy = float((y1 + y2) / 2)
                curr_ids.add(tid)
                curr_centroids[tid] = (cx, cy)

                is_new = tid not in seen_ids
                if is_new:
                    seen_ids.add(tid)
                    alerts.append({"type": "entry", "detail": f"Person #{tid} entered"})

                detections.append({
                    "id": tid, "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                    "conf": round(float(conf), 2), "is_new": is_new,
                })

    # ── 2. Activity classification ────────────────────────────────────────────
    elapsed = max(curr_time - prev_time, 0.001)
    activities = _ya._classify_activity(prev_centroids, curr_centroids, elapsed, frame_width)

    for det in detections:
        det["activity"] = activities.get(det["id"], "standing")

    # ── 3. Pose estimation ────────────────────────────────────────────────────
    if pose_model is not None and detections:
        try:
            pose_res = pose_model(frame, conf=0.35, verbose=False)
            if pose_res and pose_res[0].keypoints is not None:
                kps_xy   = pose_res[0].keypoints.xy.cpu().numpy()   # (N, 17, 2)
                kps_conf = (
                    pose_res[0].keypoints.conf.cpu().numpy()
                    if pose_res[0].keypoints.conf is not None
                    else None
                )
                for i, person_kps in enumerate(kps_xy):
                    kp_list = []
                    for j, (kx, ky) in enumerate(person_kps):
                        c = float(kps_conf[i][j]) if kps_conf is not None else 1.0
                        kp_list.append({"x": float(kx), "y": float(ky), "conf": round(c, 2)})
                    pose_data.append({"keypoints": kp_list})
        except Exception as exc:
            logger.warning("Pose estimation failed on frame: %s", exc)

    # ── 4. Fire / smoke detection ─────────────────────────────────────────────
    fire_flag  = False
    smoke_flag = False

    if fire_model is not None:
        try:
            fire_res = fire_model.predict(frame, conf=_ya.FIRE_CONF_THRESHOLD, verbose=False)
            if fire_res and fire_res[0].boxes is not None:
                for cls_id in fire_res[0].boxes.cls.cpu().numpy().tolist():
                    name = fire_model.names.get(int(cls_id), "").lower()
                    if "fire"  in name: fire_flag  = True
                    if "smoke" in name: smoke_flag = True
        except Exception as exc:
            logger.warning("Fire detection failed: %s", exc)
    else:
        fire_flag, smoke_flag = _ya._hsv_fire_smoke_check(frame)

    if fire_flag:
        alerts.append({"type": "fire",  "detail": "Fire detected!"})
    if smoke_flag:
        alerts.append({"type": "smoke", "detail": "Smoke detected!"})

    # Encode raw frame as JPEG for frontend to display
    try:
        _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 65])
        import base64
        image_b64 = base64.b64encode(buffer).decode('utf-8')
    except Exception:
        image_b64 = ""

    return {
        "type":       "frame",
        "time_sec":   round(curr_time, 3),
        "frame_w":    w,
        "frame_h":    h,
        "count":      len(curr_ids),
        "total_seen": len(seen_ids),
        "detections": detections,
        "poses":      pose_data,
        "skeleton":   SKELETON,
        "fire":       fire_flag,
        "smoke":      smoke_flag,
        "alerts":     alerts,
        "curr_centroids": {str(k): list(v) for k, v in curr_centroids.items()},
        "image_b64":  image_b64,
    }



# ── WebSocket streaming endpoint ──────────────────────────────────────────────

@router.websocket("/ws/{session_id}")
async def live_stream_ws(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time per-frame analysis.

    Protocol
    --------
    Client → {"path": "/abs/path/video.mp4"}  or  {"rtsp": "rtsp://..."}
    Server → stream of JSON frame objects
    Client → {"seek": 12.5}   to scrub
    Client → {"stop": true}   to end
    """
    await websocket.accept()

    # Ensure models are loaded (first call takes 10-20 s)
    _ya._load_models()

    logger.info("WS connected: %s", session_id)

    try:
        init_msg = await asyncio.wait_for(websocket.receive_json(), timeout=30.0)
    except asyncio.TimeoutError:
        await websocket.close(code=1008)
        return

    video_source = (
        init_msg.get("path")
        or init_msg.get("rtsp")
        or init_msg.get("webcam", "0")
    )
    target_fps = float(init_msg.get("fps", 12))

    # Open capture
    src = str(video_source) if not isinstance(video_source, int) else video_source
    cap = cv2.VideoCapture(src)
    if not cap.isOpened():
        await websocket.send_json({"type": "error", "detail": f"Cannot open source: {video_source}"})
        await websocket.close()
        return

    source_fps   = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_w      = cap.get(cv2.CAP_PROP_FRAME_WIDTH)  or 640.0
    frame_h      = cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 480.0
    duration_sec = total_frames / source_fps if total_frames > 0 else 0

    # Send metadata to client
    await websocket.send_json({
        "type":         "meta",
        "fps":          source_fps,
        "total_frames": total_frames,
        "duration_sec": round(duration_sec, 2),
        "width":        int(frame_w),
        "height":       int(frame_h),
    })

    frame_interval  = 1.0 / target_fps
    skip_n          = max(1, int(round(source_fps / target_fps)))

    seen_ids:       set[int]                       = set()
    prev_centroids: dict[int, tuple[float, float]] = {}
    prev_time       = 0.0
    frame_idx       = 0

    logger.info(
        "Streaming %s @ src=%.0ffps target=%.0ffps skip=%d",
        video_source, source_fps, target_fps, skip_n,
    )

    loop = asyncio.get_event_loop()

    try:
        while True:
            # Non-blocking check for client control messages
            try:
                ctrl = await asyncio.wait_for(websocket.receive_json(), timeout=0.001)
                if "seek" in ctrl:
                    cap.set(cv2.CAP_PROP_POS_MSEC, float(ctrl["seek"]) * 1000)
                    seen_ids.clear()
                    prev_centroids.clear()
                    frame_idx = 0
                if ctrl.get("stop"):
                    break
            except (asyncio.TimeoutError, Exception):
                pass

            ret, frame = cap.read()
            if not ret:
                await websocket.send_json({"type": "end"})
                break

            frame_idx += 1
            curr_time  = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0

            if frame_idx % skip_n != 0:
                continue

            t0 = time.perf_counter()

            # Run analysis in thread-pool so we don't block the event loop
            data = await loop.run_in_executor(
                None,
                _analyze_frame_sync,
                frame.copy(),
                dict(prev_centroids),
                prev_time,
                curr_time,
                seen_ids,          # mutated in place inside executor (safe: single thread)
                frame_w,
            )

            # Update centroid state from result
            prev_centroids = {
                int(k): tuple(v)
                for k, v in data.pop("curr_centroids", {}).items()
            }
            prev_time = curr_time

            await websocket.send_json(data)

            # Throttle to target fps
            elapsed = time.perf_counter() - t0
            sleep_t = frame_interval - elapsed
            if sleep_t > 0:
                await asyncio.sleep(sleep_t)

    except WebSocketDisconnect:
        logger.info("WS client disconnected: %s", session_id)
    except Exception as exc:
        logger.exception("WS stream error: %s", exc)
        try:
            await websocket.send_json({"type": "error", "detail": str(exc)})
        except Exception:
            pass
    finally:
        cap.release()
        logger.info("WS stream closed: %s", session_id)
