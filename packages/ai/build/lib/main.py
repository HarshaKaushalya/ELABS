from fastapi import FastAPI

from .api.routes_chat import router as chat_router
from .api.routes_docs import router as docs_router
from .api.routes_health import router as health_router
from .core.logging import configure_logging

configure_logging()

app = FastAPI(title="ELABS AI Service", version="0.1.0")
app.include_router(health_router)
app.include_router(chat_router)
app.include_router(docs_router)