from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
import os
from pathlib import Path

router = APIRouter()


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    status: str


UPLOAD_DIR = Path("src/storage/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)) -> UploadResponse:
    """Upload a PDF document for RAG ingestion"""
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    try:
        document_id = file.filename.replace(".pdf", "").replace(" ", "_")
        file_path = UPLOAD_DIR / f"{document_id}.pdf"

        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        # Ingest the document
        from ..rag.ingest import ingest_document
        ingest_document(str(file_path))

        return UploadResponse(
            document_id=document_id,
            filename=file.filename,
            status="uploaded"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
