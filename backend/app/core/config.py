from __future__ import annotations

import os
from pathlib import Path
from pydantic import BaseModel, Field

# Project root is two levels up from backend/app/core
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
OUTPUTS_DIR = PROJECT_ROOT / "outputs"
MODELS_DIR = OUTPUTS_DIR / "models"
METRICS_DIR = OUTPUTS_DIR / "metrics"
DATA_DIR = PROJECT_ROOT / "data"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
SAMPLES_DATA_DIR = DATA_DIR / "samples"
SAMPLE_TEST_DATA = SAMPLES_DATA_DIR / "sample_cic_binary.csv"
MULTICLASS_TEST_DATA = SAMPLES_DATA_DIR / "sample_cic_multiclass.csv"

class Settings(BaseModel):
    PROJECT_NAME: str = "Cyber-Attack Network Intrusion Profiler"
    API_V1_PREFIX: str = "/api"
    VERSION: str = "2.0.0"
    DEBUG: bool = False

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8501",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8501",
    ]
    CORS_ORIGIN_REGEX: str = r"https?://(localhost|127\.0\.0\.1)(:\d+)?"

    # Models
    MODEL_PATH: Path = MODELS_DIR / "ensemble_stacking.joblib"
    FALLBACK_MODEL_PATH: Path = MODELS_DIR / "ensemble_soft_voting.joblib"
    
    # Severity Thresholds (attack probability)
    SEVERITY_CRITICAL: float = 0.90
    SEVERITY_HIGH: float = 0.75
    SEVERITY_MEDIUM: float = 0.55

settings = Settings()
