from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./onionlens.db"
    SECRET_KEY: str = "onionlens360-dev-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    DEMO_MODE: bool = True
    # Storage layout
    STORAGE_ROOT: str = "storage"
    UPLOAD_DIR: str = "storage/originals"
    VIDEO_DIR: str = "storage/videos"
    FRAMES_DIR: str = "storage/frames"
    EVIDENCE_DIR: str = "storage/evidence"
    REPORTS_DIR: str = "storage/reports"
    DATASET_DIR: str = "storage/dataset"
    MODEL_PATH: str = "models/yolov8n.pt"
    INFERENCE_EVERY_N_FRAMES: int = 5
    MAX_FRAMES_PER_ONION: int = 3
    CONFIDENCE_GATE_ACCEPT: float = 0.85
    CONFIDENCE_GATE_REVIEW: float = 0.60
    # Active model version label (demo)
    ACTIVE_MODEL_VERSION: str = "v0.3-demo"
    ACTIVE_MODEL_NAME: str = "OnionLens YOLO v0.3-demo"

    class Config:
        env_file = ".env"


settings = Settings()

# Ensure all storage directories exist
for d in [
    settings.UPLOAD_DIR, settings.VIDEO_DIR, settings.FRAMES_DIR,
    settings.EVIDENCE_DIR, settings.REPORTS_DIR, settings.DATASET_DIR,
]:
    os.makedirs(d, exist_ok=True)
