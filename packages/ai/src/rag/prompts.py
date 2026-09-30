def build_prompt(question: str, context: str) -> str:
    return f"Context:\n{context}\n\nQuestion: {question}\nAnswer:"