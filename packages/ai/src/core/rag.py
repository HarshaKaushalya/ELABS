import os
import logging
import requests
import re

# Import our database tools
from ..tools.inventory_tool import get_item_status, get_borrowed_items
from ..tools.location_tool import locate_item, locate_lab
from ..tools.schedule_tool import get_upcoming_labs
from ..tools.occupancy_tool import get_lab_occupancy

logger = logging.getLogger(__name__)

# ─── Fallback Direct Database Router (no LLM required) ──────────────────

def _match_intent_and_query_db(question: str, user_email: str | None) -> str | None:
    """
    Analyzes the question for keywords/intents and routes directly to database tools.
    Returns the formatted string response if matched, or None to fall back.
    """
    q = question.lower().strip()
    email = user_email or "student@elabs.local"  # Default fallback email for testing

    def has_word(words):
        return any(re.search(fr"\b{w}\b", q) for w in words)

    # 1. Schedule intent
    if has_word(["schedule", "upcoming", "timetable", "sessions", "my lab", "when is my"]):
        return get_upcoming_labs(email)

    # 2. Personal borrowed items intent
    if has_word(["my borrowed", "what did i borrow", "items i borrowed", "my items", "checkouts"]):
        return get_borrowed_items(email)

    # 3. Lab Occupancy intent
    if has_word(["occupancy", "active students", "how many students", "crowded", "people inside", "number of students"]):
        # Try to identify which lab is being referred to
        matched_lab = "Software Laboratory"  # Default
        for lab in ["software", "electronics", "power", "biomedical", "control", "microprocessor", "telecommunication", "circuit"]:
            if lab in q:
                matched_lab = lab
                break
        return get_lab_occupancy(matched_lab)

    # 4. Item Location intent
    if has_word(["locate", "where is", "where are", "find location of", "which floor"]):
        # Extract the tag or equipment name
        # Look for tag format ELABS-XX-0000
        tag_match = re.search(r"elabs-[a-z0-9\-]+", q)
        if tag_match:
            return locate_item(tag_match.group(0).upper())
            
        # Extract name by removing location keywords using word boundaries
        cleaned = re.sub(r"\b(locate|where|is|are|find|location|of|the|a|an|which|floor)\b", "", q)
        cleaned = re.sub(r"[?!.,]", "", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if cleaned:
            # If lab location requested
            if "lab" in cleaned or "laboratory" in cleaned:
                return locate_lab(cleaned)
            return locate_item(cleaned)

    # 5. Availability / Status intent
    if has_word(["available", "status of", "is there a", "is it available", "borrow an item", "check out"]):
        tag_match = re.search(r"elabs-[a-z0-9\-]+", q)
        if tag_match:
            return get_item_status(tag_match.group(0).upper())
            
        # Clean up question to isolate item name using word boundaries
        cleaned = re.sub(r"\b(is|there|a|an|available|status|of|the|check|out|it|borrow|item)\b", "", q)
        cleaned = re.sub(r"[?!.,]", "", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if cleaned:
            return get_item_status(cleaned)

    # 6. Basic Greetings / Help fallbacks
    if has_word(["hello", "hi", "hey"]):
        return (
            "Hello! I'm ELABS AI, your database-connected laboratory assistant. I can help you with:\n"
            "- Real-time equipment status and locations\n"
            "- Live lab occupancy levels (monitored via YOLOv8 CCTV)\n"
            "- Your upcoming lab session schedule and registered modules\n"
            "- Borrowed equipment list and due dates\n\n"
            "What would you like to query today?"
        )
    if has_word(["help", "what can you do"]):
        return (
            "You can ask me questions like:\n"
            "- *'Is Development Laptop available?'*\n"
            "- *'Where is ELABS-SW-0001 located?'*\n"
            "- *'What are my upcoming lab sessions?'*\n"
            "- *'What is the current occupancy of the Software Laboratory?'*\n"
            "- *'What equipment do I currently have checked out?'*"
        )

    return None


def ask_question(question: str, user_email: str | None = None, document_id: str | None = None) -> str:
    """
    Processes a query.
    1. Tries to match database intent routing directly first.
    2. Falls back to Ollama LLM if running.
    3. Falls back to a default helpful message.
    """
    # ─── Step 1: Check Database Intent Match ─────────────────────────────────
    db_response = _match_intent_and_query_db(question, user_email)

    # ─── Step 2: Try Ollama LLM ──────────────────────────────────────────────
    ollama_base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    try:
        health = requests.get(f"{ollama_base_url}/api/tags", timeout=(2.0, 5.0), proxies={"http": None, "https": None})
        if health.status_code == 200:
            models = health.json().get("models", [])
            if models:
                model_name = models[0]["name"]
                
                # Fetch database context to feed into LLM system prompt
                email = user_email or "student@elabs.local"
                schedule_context = get_upcoming_labs(email)
                borrowed_context = get_borrowed_items(email)
                
                # Fetch RAG Context if document_id is provided
                rag_context = ""
                if document_id:
                    from ..rag.retrieval import retrieve
                    chunks = retrieve(question, document_id)
                    if chunks:
                        rag_context = "\n".join(chunks)
                
                # Build the system prompt
                system_prompt = (
                    "You are ELABS AI, an expert, friendly, and highly conversational laboratory assistant for a university "
                    "Smart Laboratory Management System. You have access to real-time database details.\n\n"
                    f"Current User Context:\n"
                    f"- Email: {email}\n"
                    f"- Upcoming Schedule: {schedule_context}\n"
                    f"- Checked out items: {borrowed_context}\n\n"
                )
                
                if rag_context:
                    system_prompt += (
                        f"The user has uploaded a document ({document_id}) and asked a question. Here is the relevant text from the document:\n"
                        f"--- UPLOADED DOCUMENT CONTENT ---\n{rag_context}\n---------------------------------\n\n"
                        "IMPORTANT: Use the uploaded document content above to answer the user's question. Explicitly mention the document name in your response.\n"
                    )
                elif db_response:
                    system_prompt += (
                        "The system successfully executed a query for the user's question and found the following data:\n"
                        f"--- DATABASE QUERY RESULTS ---\n{db_response}\n------------------------------\n\n"
                        "IMPORTANT: Use the data above to answer the user's question. Formulate a highly conversational, friendly, and helpful response. Format it nicely with markdown, using bullet points or bold text to highlight key info (like Status and Location).\n"
                    )
                else:
                    system_prompt += "Respond clearly, concisely, and helpfully using your knowledge and context when answering the student."
                
                response = requests.post(
                    f"{ollama_base_url}/api/generate",
                    json={
                        "model": model_name,
                        "prompt": f"{system_prompt}\n\nStudent question: {question}",
                        "stream": False,
                        "options": {"temperature": 0.7, "num_predict": 300},
                    },
                    timeout=60.0,
                    proxies={"http": None, "https": None}
                )
                response.raise_for_status()
                answer = response.json().get("response", "").strip()
                if answer:
                    return answer
            else:
                logger.warning("Ollama is reachable but has no models loaded.")
        else:
            logger.warning(f"Ollama health check failed with status: {health.status_code}")
    except requests.exceptions.Timeout:
        logger.error("Ollama connection or generation timed out.")
        if document_id:
            return "I am currently experiencing high load or Ollama took too long to respond while reading your document. Please try again in a moment."
    except Exception as e:
        logger.error(f"Ollama not available or error occurred: {e}")

    # Fallback if LLM is offline but we have a DB response
    if db_response:
        return db_response

    # ─── Step 3: Default generic response ────────────────────────────────────
    return (
        "I couldn't locate specific database records or details for that query. "
        "Try asking about equipment availability, lab occupancy, or your upcoming schedule. "
        "For example: 'Is Development Laptop available?'"
    )
