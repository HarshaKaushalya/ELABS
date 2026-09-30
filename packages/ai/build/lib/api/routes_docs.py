from pathlib import Path

from fastapi import APIRouter, File, UploadFile

from ..core.config import settings

router = APIRouter()


@router.post("/docs/upload")
async def upload_doc(file: UploadFile = File(...)) -> dict[str, str | int]:
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    target = upload_dir / file.filename
    content = await file.read()
    target.write_bytes(content)

    return {
        "status": "stored",
        "filename": file.filename,
        "bytes": len(content),
        "path": str(target)
    }