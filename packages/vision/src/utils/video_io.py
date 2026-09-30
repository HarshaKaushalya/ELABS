from pathlib import Path

from ..core.config import settings


def resolve_video_path(video_path: str) -> Path:
    path = Path(video_path)
    if path.is_absolute():
        return path
    return Path(settings.demo_video_dir) / video_path