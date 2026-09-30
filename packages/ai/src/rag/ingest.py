import os
from pathlib import Path
from .chunking import chunk_text
from .vectorstore import store_chunks


def ingest_document(path: str) -> dict[str, str]:
    """Ingest a PDF document into the vector store"""
    try:
        # Extract text from PDF
        text = extract_pdf_text(path)

        # Chunk the text
        chunks = chunk_text(text, chunk_size=500)

        # Store in vector database
        doc_id = Path(path).name
        store_chunks(doc_id, chunks)

        return {"status": "ingested", "path": path, "chunks": len(chunks)}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def extract_pdf_text(pdf_path: str) -> str:
    """Extract text from PDF file"""
    try:
        import pypdf
        text = ""
        with open(pdf_path, "rb") as file:
            reader = pypdf.PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() or ""
        return text
    except ImportError:
        # Fallback if pypdf not available
        return f"PDF document at {pdf_path}"
    except Exception as e:
        raise Exception(f"Failed to extract PDF text: {str(e)}")
