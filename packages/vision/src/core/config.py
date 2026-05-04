from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    vision_host: str = "0.0.0.0"
    vision_port: int = 8001
    log_level: str = "INFO"

    # Storage paths (relative to package root when running inside container)
    demo_video_dir: str = "src/storage/demo_videos"
    output_dir: str = "src/storage/outputs"
    uploads_dir: str = "src/storage/uploads"

    # YOLO model names (auto-downloaded by ultralytics on first use)
    yolo_model: str = "yolov8n.pt"
    yolo_pose_model: str = "yolov8n-pose.pt"

    # File upload limits
    max_video_size_mb: int = 200

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()