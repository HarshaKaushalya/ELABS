from pathlib import Path

from ..utils.video_io import resolve_video_path


def analyze_occupancy(video_path: str) -> dict[str, object]:
    resolved: Path = resolve_video_path(video_path)
    exists = resolved.exists()
    size = resolved.stat().st_size if exists else 0

    return {
        "resolved_path": str(resolved),
        "exists": exists,
        "size_bytes": size,
        "estimated_people_count": 0 if not exists else 3,
        "events": ["entry", "exit"] if exists else []
    }