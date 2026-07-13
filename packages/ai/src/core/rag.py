"""
rag.py  —  ELABS AI Assistant Core
────────────────────────────────────────────────────────────────────────────────
Architecture:
  1. build_context()  → pulls live DB data (inventory, borrows, schedule, etc.)
  2. A rich system prompt is constructed with that context
  3. Ollama llama3.2 generates the answer (streaming or non-streaming)
  4. Falls back to direct DB query if Ollama is offline
"""

from __future__ import annotations

import os
import logging
import re
from typing import Generator

import requests

from .context_builder import build_context
from ..tools.inventory_tool import get_item_status, get_borrowed_items
from ..tools.location_tool import locate_item, locate_lab
from ..tools.schedule_tool import get_upcoming_labs
from ..tools.occupancy_tool import get_lab_occupancy
from ..tools.user_tool import (
    get_user_profile,
    get_all_overdue_transactions,
    search_student,
    get_attendance_summary,
)

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.environ.get("OLLAMA_MODEL", "llama3.2")


# ─── System Prompt Builder ────────────────────────────────────────────────────

def _build_system_prompt(db_context: str, is_staff: bool, doc_context: str = "") -> str:
    role_note = (
        "You are speaking with a STAFF MEMBER (lecturer, admin, or lab technician). "
        "You have full access to all data including overdue transactions, all student records, "
        "and system-wide statistics. Provide detailed administrative insights."
        if is_staff else
        "You are speaking with a STUDENT. Only show data relevant to them personally "
        "(their own borrows, their own schedule, their own notifications). "
        "Never show other students' personal information."
    )

    doc_section = f"\n\nUPLOADED DOCUMENT CONTEXT:\n{doc_context}\n" if doc_context else ""

    return f"""You are ELABS AI, the intelligent assistant for the DEIE (Department of Electrical and Information Engineering) Smart Laboratory Management System at the University of Ruhuna.

{role_note}

You have real-time access to the laboratory database. The following data was fetched LIVE from the database just now — use it to answer accurately:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIVE DATABASE CONTEXT (as of this moment):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{db_context}
{doc_section}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GUIDELINES:
- Use **bold** for equipment names, lab names, dates, and important values
- Use bullet lists when listing multiple items
- Format dates as "Jan 15, 2026"
- If asked about something not in the context above, say "I don't have that information in my current database snapshot" — never make up data
- Be concise but complete. If there's nothing (e.g. no borrows), say so clearly
- For overdue items, always mention the urgency
- You are friendly, professional, and helpful
"""


# ─── Ollama Health Check ──────────────────────────────────────────────────────

def _ollama_is_up() -> bool:
    try:
        r = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=(2.0, 5.0))
        return r.status_code == 200
    except Exception:
        return False


def _model_is_available() -> bool:
    try:
        r = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=(2.0, 5.0))
        if r.status_code != 200:
            return False
        models = [m.get("name", "") for m in r.json().get("models", [])]
        return any(OLLAMA_MODEL in m for m in models)
    except Exception:
        return False


# ─── RAG Vector Store (for uploaded docs) ────────────────────────────────────

def _get_doc_context(document_id: str | None, question: str) -> str:
    if not document_id:
        return ""
    try:
        from ..rag.retrieval import retrieve
        chunks = retrieve(question, document_id)
        return "\n\n".join(chunks) if chunks else ""
    except Exception as e:
        logger.warning(f"Doc retrieval failed: {e}")
        return ""


# ─── Non-streaming answer ─────────────────────────────────────────────────────

def ask_question(
    question: str,
    user_email: str | None = None,
    document_id: str | None = None,
    history: list[dict] | None = None,
) -> str:
    """Returns a complete answer string (used by mobile / non-streaming clients)."""

    # 1. Build live DB context
    db_context, is_staff = build_context(user_email)

    # 2. Get doc context if a document was uploaded
    doc_context = _get_doc_context(document_id, question)

    # 3. Build system prompt
    system_prompt = _build_system_prompt(db_context, is_staff, doc_context)

    # 4. Try Ollama
    if _ollama_is_up() and _model_is_available():
        try:
            messages = [{"role": "system", "content": system_prompt}]
            # Inject conversation history (last 6 turns)
            for h in (history or [])[-6:]:
                messages.append(h)
            messages.append({"role": "user", "content": question})

            resp = requests.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL, 
                    "messages": messages, 
                    "stream": False,
                    "options": {"num_ctx": 1024}
                },
                timeout=(10.0, 300.0),
            )
            if resp.status_code == 200:
                return resp.json()["message"]["content"].strip()
            logger.warning(f"Ollama returned {resp.status_code}: {resp.text[:200]}")
        except requests.exceptions.Timeout:
            return "⏱️ The AI took too long to respond. The database data is available — please try a shorter question."
        except Exception as e:
            logger.error(f"Ollama error: {e}")

    # 5. Fallback — direct DB routing
    return _fallback_db_answer(question, user_email, db_context)


# ─── Streaming answer ─────────────────────────────────────────────────────────

def ask_question_stream(
    question: str,
    user_email: str | None = None,
    document_id: str | None = None,
    history: list[dict] | None = None,
) -> Generator[str, None, None]:
    """
    Yields token strings one at a time for SSE streaming.
    Falls back to yielding the full DB answer at once if Ollama is offline.
    """

    # 1. Build live DB context
    db_context, is_staff = build_context(user_email)
    doc_context = _get_doc_context(document_id, question)
    system_prompt = _build_system_prompt(db_context, is_staff, doc_context)

    # 2. Try streaming from Ollama
    if _ollama_is_up() and _model_is_available():
        try:
            messages = [{"role": "system", "content": system_prompt}]
            for h in (history or [])[-6:]:
                messages.append(h)
            messages.append({"role": "user", "content": question})

            with requests.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL, 
                    "messages": messages, 
                    "stream": True,
                    "options": {"num_ctx": 1024}
                },
                timeout=(10.0, 300.0),
                stream=True,
            ) as resp:
                if resp.status_code == 200:
                    import json
                    for line in resp.iter_lines():
                        if line:
                            try:
                                chunk = json.loads(line)
                                token = chunk.get("message", {}).get("content", "")
                                if token:
                                    yield token
                                if chunk.get("done"):
                                    return
                            except Exception:
                                continue
                    return
                logger.warning(f"Ollama stream returned {resp.status_code}")
        except requests.exceptions.Timeout:
            yield "⏱️ The AI took too long to respond. Please try again."
            return
        except Exception as e:
            logger.error(f"Ollama stream error: {e}")

    # 3. Fallback — stream the DB answer in one chunk
    fallback = _fallback_db_answer(question, user_email, db_context)
    yield fallback


# ─── Fallback DB Router ───────────────────────────────────────────────────────

def _fallback_db_answer(question: str, user_email: str | None, db_context: str) -> str:
    """
    When Ollama is offline, route the question directly to DB tools
    and return a formatted answer. Much better than a static error message.
    """
    q = question.lower().strip()
    email = user_email or ""

    def has(*words):
        return any(re.search(rf"\b{w}\b", q) for w in words)

    # Schedule
    if has("schedule", "upcoming", "timetable", "session", "when", "my lab"):
        if email:
            return get_upcoming_labs(email)

    # Personal borrows
    if has("borrow", "borrowed", "checkout", "my items", "what did i"):
        if email:
            return get_borrowed_items(email)

    # Occupancy
    if has("occupancy", "how many", "crowded", "people", "students inside", "headcount"):
        for lab in ["software", "electronics", "power", "biomedical", "control",
                    "microprocessor", "telecommunication", "circuit"]:
            if lab in q:
                return get_lab_occupancy(lab)
        return get_lab_occupancy("Software Laboratory")

    # Item lookup
    if has("locate", "where is", "where are", "find", "status of", "available"):
        tag = re.search(r"elabs-[a-z0-9\-]+", q)
        if tag:
            return get_item_status(tag.group())
        # Try to extract equipment name
        for kw in ["oscilloscope", "multimeter", "soldering", "power supply", "arduino",
                   "raspberry", "breadboard", "function generator", "microscope"]:
            if kw in q:
                return get_item_status(kw)

    # Profile
    if has("my profile", "my account", "who am i", "my details"):
        if email:
            return get_user_profile(email)

    # Overdue (admin)
    if has("overdue", "late", "not returned"):
        return get_all_overdue_transactions()

    # Search student (admin)
    if has("find student", "search student", "look up"):
        words = q.split()
        if len(words) > 2:
            term = " ".join(words[2:])
            return search_student(term)

    # Attendance
    if has("attendance", "scanned", "entry", "exit records"):
        if email:
            return get_attendance_summary(email)

    # Generic — return the DB context summary
    return (
        "🤖 The AI model is currently offline. Here's what I can tell you from the database:\n\n"
        + db_context
        + "\n\n*Start Ollama to get intelligent conversational answers.*"
    )
