def upsert_vector(doc_id: str, vector: list[float]) -> dict[str, str]:
    return {"status": "upserted", "doc_id": doc_id, "size": str(len(vector))}