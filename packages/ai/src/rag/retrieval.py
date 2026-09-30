from .vectorstore import search_chunks


def retrieve(query: str, doc_id: str = None) -> list[str]:
    """Retrieve relevant context from uploaded documents"""
    return search_chunks(query, doc_id)
