"""
Vision Service — Video Analysis Endpoints
"""
from __future__ import annotations

import logging
import shutil
import uuid
from dataclasses import asdict
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse, StreamingResponse

from ..core.config import settings
from ..pipelines.yolo_analyzer import analyze_video

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vision", tags=["vision"])


def _ensure_dirs() -> Path:
    uploads = Path(settings.uploads_dir)
    uploads.mkdir(parents=True, exist_ok=True)
    return uploads


@router.post("/analyze-video", summary="Upload an MP4 and run YOLO analytics")
async def analyze_video_endpoint(
    file: UploadFile = File(..., description="MP4 video file (max 200 MB)"),
) -> JSONResponse:
    # ── validate ──────────────────────────────────────────────────────────
    if file.content_type not in (
        "video/mp4", "video/mpeg", "video/quicktime", "application/octet-stream"
    ):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}. Please upload an MP4.",
        )

    max_bytes = settings.max_video_size_mb * 1024 * 1024
    uploads_dir = _ensure_dirs()

    # ── save upload to temp file ──────────────────────────────────────────
    tmp_name = f"{uuid.uuid4().hex}_{file.filename or 'video.mp4'}"
    tmp_path = uploads_dir / tmp_name
    bytes_written = 0

    # Keep the file for streaming visualization
    keep_file = False

    try:
        with tmp_path.open("wb") as dst:
            while chunk := await file.read(1024 * 1024):   # 1 MB chunks
                bytes_written += len(chunk)
                if bytes_written > max_bytes:
                    dst.close()
                    tmp_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds {settings.max_video_size_mb} MB limit.",
                    )
                dst.write(chunk)

        logger.info("Saved upload: %s (%.1f MB)", tmp_path.name, bytes_written / 1e6)

        # ── run YOLO analysis ─────────────────────────────────────────────
        result = analyze_video(tmp_path)
        keep_file = True  # Keep file for streaming

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Video analysis failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {exc}",
        )
    finally:
        # Clean up only if analysis failed
        if not keep_file:
            tmp_path.unlink(missing_ok=True)

    # ── serialise result ──────────────────────────────────────────────────
    payload = asdict(result)
    # Include the video path for streaming visualization
    return JSONResponse(content={"status": "ok", "result": payload, "video_path": str(tmp_path)})

@router.post("/analyze-attendance", summary="Upload a CCTV clip to log attendance")
async def analyze_attendance_endpoint(
    lab_id: int,
    file: UploadFile = File(...),
) -> JSONResponse:
    from ..pipelines.face_recognition import recognize_faces
    
    uploads_dir = _ensure_dirs()
    tmp_name = f"att_{uuid.uuid4().hex}_{file.filename}"
    tmp_path = uploads_dir / tmp_name
    
    try:
        with tmp_path.open("wb") as dst:
            while chunk := await file.read(1024 * 1024):
                dst.write(chunk)
                
        student_ids = recognize_faces(str(tmp_path))
        
        # In a complete implementation, this microservice would make an HTTP call 
        # to the core API (e.g., POST http://api:4000/attendance/log) 
        # to record the recognized students in the database.
        
        return JSONResponse(content={
            "status": "ok", 
            "lab_id": lab_id,
            "detected_students": student_ids
        })
    finally:
        tmp_path.unlink(missing_ok=True)

@router.get("/stream", summary="Stream MJPEG video with live YOLO bounding boxes")
async def stream_video_endpoint(video_path: str):
    from ..pipelines.yolo_analyzer import stream_video_frames

    path = Path(video_path)
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video file not found: {video_path}"
        )

    return StreamingResponse(
        stream_video_frames(path),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/status", summary="Vision service health + model status")
def vision_status() -> dict:
    from ..pipelines.yolo_analyzer import _people_model, _pose_model, _fire_model
    return {
        "service": "elabs-vision",
        "models_loaded": {
            "people": _people_model is not None,
            "pose":   _pose_model   is not None,
            "fire":   _fire_model   is not None,
        },
    }