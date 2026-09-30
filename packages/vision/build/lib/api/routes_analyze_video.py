from fastapi import APIRouter
from pydantic import BaseModel

from ..pipelines.occupancy import analyze_occupancy

router = APIRouter()


class AnalyzeVideoRequest(BaseModel):
    video_path: str = "demo.mp4"


@router.post("/analyze-video")
def analyze_video(payload: AnalyzeVideoRequest) -> dict[str, object]:
    result = analyze_occupancy(payload.video_path)
    return {
        "status": "processed",
        "input": payload.video_path,
        "result": result
    }