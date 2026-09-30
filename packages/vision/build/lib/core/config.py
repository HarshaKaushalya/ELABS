from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    vision_host: str = "0.0.0.0"
    vision_port: int = 8000
    log_level: str = "INFO"
    demo_video_dir: str = "src/storage/demo_videos"
    output_dir: str = "src/storage/outputs"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()