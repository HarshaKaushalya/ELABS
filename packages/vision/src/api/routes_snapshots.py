from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/vision/snapshots", tags=["Snapshots"])

SNAPSHOTS_DIR = Path(__file__).parent.parent / "storage" / "snapshots"
SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/{filename}")
async def get_snapshot(filename: str):
    """Serve a snapshot image by filename."""
    file_path = SNAPSHOTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return FileResponse(str(file_path))
