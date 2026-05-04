"""
ELABS RAG (Retrieval-Augmented Generation) Pipeline
Dual mode: Uses Ollama LLM when available, falls back to built-in knowledge base.
"""
import os
import logging

logger = logging.getLogger(__name__)

# ─── Built-in Knowledge Base (works without Ollama) ────────────────────────

KNOWLEDGE_BASE = {
    "oscilloscope": (
        "The Oscilloscope (ELABS-EL-0001) is a Tektronix TBS1052B digital oscilloscope. "
        "It is currently **available** in the Electronics Lab (Lab 1, Floor 2). "
        "Bandwidth: 50 MHz, 2 channels. To borrow it, visit the technician desk with your student ID "
        "and scan the barcode on the equipment."
    ),
    "multimeter": (
        "We have 15 digital multimeters (Fluke 117) available across Labs 1-3. "
        "Current status: 12 available, 2 borrowed, 1 under maintenance. "
        "To borrow one, use the ELABS inventory page and scan the barcode."
    ),
    "borrow": (
        "To borrow lab equipment:\n"
        "1. Go to the **Inventory** page on the ELABS dashboard\n"
        "2. Find the item you need and click **Borrow**\n"
        "3. Scan the equipment's barcode using your device camera\n"
        "4. The technician will approve the request\n"
        "5. Return the item before the due date to avoid penalties"
    ),
    "barcode": (
        "ELABS uses a barcode scanning system for equipment tracking. Each item has a unique ELABS tag "
        "(e.g., ELABS-EL-0001). To scan:\n"
        "1. Open the **Inventory** page\n"
        "2. Click the **Scan Barcode** button\n"
        "3. Allow camera access and point at the barcode\n"
        "4. The system will automatically identify the equipment"
    ),
    "occupancy": (
        "Current lab occupancy levels:\n"
        "- **Electronics Lab (Lab 1)**: 12/30 students (40%)\n"
        "- **Power Systems Lab (Lab 2)**: 8/25 students (32%)\n"
        "- **Computing Lab (Lab 3)**: 22/40 students (55%)\n"
        "- **Digital Lab (Lab 4)**: 5/20 students (25%)\n\n"
        "Occupancy is monitored in real-time using YOLOv8 computer vision on CCTV feeds."
    ),
    "schedule": (
        "Your upcoming lab sessions this week:\n"
        "- **Monday 9:00 AM** - EE3202 Power Electronics Lab (Lab 2)\n"
        "- **Wednesday 2:00 PM** - EE3104 Digital Signal Processing Lab (Lab 3)\n"
        "- **Friday 10:00 AM** - EE3301 Control Systems Lab (Lab 1)\n\n"
        "Check the **Calendar** page for full schedule details."
    ),
    "session": (
        "Your upcoming lab sessions this week:\n"
        "- **Monday 9:00 AM** - EE3202 Power Electronics Lab (Lab 2)\n"
        "- **Wednesday 2:00 PM** - EE3104 Digital Signal Processing Lab (Lab 3)\n"
        "- **Friday 10:00 AM** - EE3301 Control Systems Lab (Lab 1)\n\n"
        "Check the **Calendar** page for full schedule details."
    ),
    "attendance": (
        "ELABS tracks attendance automatically using computer vision (YOLOv8 + face recognition). "
        "When you enter a lab, the CCTV camera detects your face and logs your entry time. "
        "Your exit time is recorded when you leave. View your attendance history on the **Dashboard** page."
    ),
    "safety": (
        "Lab Safety Guidelines:\n"
        "1. Always wear closed-toe shoes in the electronics lab\n"
        "2. Never work alone with high-voltage equipment\n"
        "3. Report any equipment malfunction to the technician immediately\n"
        "4. Emergency exits are marked with green signs at both ends of each lab\n"
        "5. First aid kits are located near the entrance of each lab\n"
        "6. Fire extinguishers are mounted on the wall near the power panels"
    ),
    "maintenance": (
        "To report an equipment issue:\n"
        "1. Go to the **Inventory** page\n"
        "2. Find the item and click **Report Issue**\n"
        "3. Select the issue type: Calibration, Repair, or Inspection\n"
        "4. Add a description and submit\n"
        "The technician will be notified and schedule maintenance."
    ),
    "prelab": (
        "Pre-lab submissions:\n"
        "1. Go to the **Courses** page and select your module\n"
        "2. Click on the upcoming lab session\n"
        "3. Upload your pre-lab report as a PDF\n"
        "4. Deadline is 24 hours before the lab session\n"
        "Late submissions will receive a 20% penalty."
    ),
    "report": (
        "Lab report submissions:\n"
        "1. Go to the **Courses** page and select your module\n"
        "2. Click on the completed lab session\n"
        "3. Upload your lab report as a PDF\n"
        "4. Reports are due within 7 days of the lab session\n"
        "Your instructor will grade it and provide feedback."
    ),
    "available": (
        "Currently available equipment in the Electronics Lab:\n"
        "- Oscilloscope (ELABS-EL-0001) - Available\n"
        "- Function Generator (ELABS-EL-0015) - Available\n"
        "- Digital Multimeter x12 - Available\n"
        "- Power Supply (ELABS-EL-0008) - Borrowed\n"
        "- Logic Analyzer (ELABS-EL-0022) - Under Maintenance\n\n"
        "Visit the **Inventory** page for the full list with real-time status."
    ),
    "hello": (
        "Hello! I'm ELABS AI, your intelligent laboratory assistant. I can help you with:\n"
        "- 🔬 Equipment availability and borrowing\n"
        "- 📊 Lab occupancy and schedules\n"
        "- 📝 Pre-lab and report submissions\n"
        "- ⚠️ Safety guidelines and procedures\n"
        "- 🛠️ Maintenance requests\n\n"
        "What would you like to know?"
    ),
    "hi": (
        "Hi there! I'm ELABS AI, your smart lab assistant. "
        "Ask me about equipment, lab schedules, borrowing procedures, or safety guidelines!"
    ),
    "help": (
        "I can assist you with:\n"
        "- **Equipment**: Ask about availability, borrowing, or returning items\n"
        "- **Labs**: Check occupancy, schedules, and locations\n"
        "- **Submissions**: Pre-lab reports, lab reports, and quizzes\n"
        "- **Safety**: Lab safety rules and emergency procedures\n"
        "- **Attendance**: Your attendance records and history\n\n"
        "Just type your question naturally!"
    ),
}

DEFAULT_RESPONSE = (
    "Based on the ELABS laboratory database, I'd recommend checking the relevant section "
    "on your dashboard for the most up-to-date information. You can navigate to the "
    "**Inventory**, **Labs**, or **Courses** pages for detailed data. "
    "Is there anything specific I can help you with?"
)


def _match_knowledge(question: str) -> str:
    """Match a question to the built-in knowledge base using keyword matching."""
    q = question.lower().strip()

    best_match = None
    best_score = 0

    for keyword, answer in KNOWLEDGE_BASE.items():
        if keyword in q:
            score = len(keyword)
            if score > best_score:
                best_score = score
                best_match = answer

    return best_match or DEFAULT_RESPONSE


def process_document(file_path: str):
    """Placeholder for PDF document ingestion (requires ChromaDB)."""
    logger.info(f"Document ingestion requested for: {file_path}")
    return 0


def ask_question(question: str) -> str:
    """
    Answer a question. Tries Ollama first, falls back to knowledge base.
    """
    import requests

    ollama_base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")

    try:
        health = requests.get(f"{ollama_base_url}/api/tags", timeout=0.5)
        if health.status_code == 200:
            models = health.json().get("models", [])
            if models:
                model_name = models[0]["name"]
                system_prompt = (
                    "You are ELABS AI, an expert laboratory assistant for a university "
                    "Smart Laboratory Management System. Keep answers concise and helpful."
                )
                response = requests.post(
                    f"{ollama_base_url}/api/generate",
                    json={
                        "model": model_name,
                        "prompt": f"{system_prompt}\n\nStudent question: {question}",
                        "stream": False,
                        "options": {"temperature": 0.7, "num_predict": 500},
                    },
                    timeout=120,
                )
                response.raise_for_status()
                answer = response.json().get("response", "").strip()
                if answer:
                    return answer
    except Exception:
        logger.info("Ollama not available, using built-in knowledge base")

    return _match_knowledge(question)
