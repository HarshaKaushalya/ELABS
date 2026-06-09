from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes_analyze_video import router as analyze_router
from .api.routes_health import router as health_router
from .api.routes_live import router as live_router
from .core.logging import configure_logging

configure_logging()

app = FastAPI(
    title="ELABS Vision Service",
    version="0.3.0",
    description="YOLOv8-powered lab video analytics with real-time WebSocket streaming",
)

# Allow requests from the Next.js frontend (both direct and via nginx)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(analyze_router)
app.include_router(live_router)