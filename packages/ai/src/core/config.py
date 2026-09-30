from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ELABS AI Service"
    ai_host: str = "0.0.0.0"
    ai_port: int = 8000
    api_base_url: str = "http://localhost:4000"
    log_level: str = "INFO"
    upload_dir: str = "src/storage/uploads"
    vector_db_dir: str = "src/storage/vector_db"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()