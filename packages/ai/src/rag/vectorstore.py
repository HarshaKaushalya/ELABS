import json
from pathlib import Path

VECTORSTORE_FILE = Path("src/storage/vector_db/store.json")
VECTORSTORE_FILE.parent.mkdir(parents=True, exist_ok=True)


def load_store() -> dict:
    """Load the vector store from disk"""
    if VECTORSTORE_FILE.exists():
        with open(VECTORSTORE_FILE, "r") as f:
            return json.load(f)
    return {}


def save_store(store: dict) -> None:
    """Save the vector store to disk"""
    with open(VECTORSTORE_FILE, "w") as f:
        json.dump(store, f)


def store_chunks(doc_id: str, chunks: list[str]) -> None:
    """Store document chunks in the vector store"""
    store = load_store()
    store[doc_id] = {"chunks": chunks}
    save_store(store)


def search_chunks(query: str, doc_id: str = None) -> list[str]:
    """Search for relevant chunks (simple keyword matching)"""
    store = load_store()
    results = []

    if doc_id and doc_id in store:
        chunks = store[doc_id].get("chunks", [])
    else:
        chunks = []
        for doc in store.values():
            chunks.extend(doc.get("chunks", []))

    # Simple keyword matching
    query_words = [w for w in query.lower().split() if len(w) > 3] # Ignore stop words like "the", "a", "it"
    if not query_words:
        query_words = query.lower().split()

    for chunk in chunks:
        chunk_lower = chunk.lower()
        if any(word in chunk_lower for word in query_words):
            results.append(chunk)

    # If no keywords matched, but they asked about a specific document, return the first few chunks as context anyway
    if not results and doc_id and chunks:
        results = chunks[:3]

    return results[:3]  # Return top 3 results


def upsert_vector(doc_id: str, vector: list[float]) -> dict[str, str]:
    return {"status": "upserted", "doc_id": doc_id, "size": str(len(vector))}
