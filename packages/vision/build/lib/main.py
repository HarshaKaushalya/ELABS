from fastapi import FastAPI

from .api.routes_analyze_video import router as analyze_router
from .api.routes_health import router as health_router
from .core.logging import configure_logging

configure_logging()

app = FastAPI(title="ELABS Vision Service", version="0.1.0")
app.include_router(health_router)
app.include_router(analyze_router)