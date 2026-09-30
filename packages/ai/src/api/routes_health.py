from fastapi import APIRouter
import requests
import os

router = APIRouter()

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.environ.get("OLLAMA_MODEL", "llama3.2")


@router.get("/health")
def health() -> dict:
    ollama_online = False
    model_loaded = False
    available_models: list[str] = []

    try:
        r = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3)
        if r.status_code == 200:
            ollama_online = True
            data = r.json()
            available_models = [m.get("name", "") for m in data.get("models", [])]
            model_loaded = any(OLLAMA_MODEL in m for m in available_models)
    except Exception:
        pass

    return {
        "service": "ai",
        "status": "ok",
        "ollama": {
            "online": ollama_online,
            "model": OLLAMA_MODEL,
            "model_loaded": model_loaded,
            "available_models": available_models,
        },
    }