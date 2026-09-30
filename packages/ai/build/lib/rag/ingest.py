def ingest_document(path: str) -> dict[str, str]:
    return {"status": "queued", "path": path}