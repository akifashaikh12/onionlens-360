from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .database import init_db
from .api.routes.auth import router as auth_router
from .api.routes.batches import router as batches_router
from .api.routes.inspect import router as inspect_router
from .api.routes.reports import router as reports_router
from .api.routes.standards import router as standards_router
from .api.routes.verify import router as verify_router
from .api.routes.dataset import router as dataset_router
from .api.routes.models import router as models_router
from .api.routes.intelligence import router as intelligence_router
from .api.routes.share import router as share_router
from .config import settings

app = FastAPI(
    title="ONIONLENS 360 API",
    description="AI-powered onion quality assessment and procurement decision-support system.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files for all storage directories
for directory in [
    settings.UPLOAD_DIR, settings.VIDEO_DIR, settings.FRAMES_DIR,
    settings.EVIDENCE_DIR, settings.REPORTS_DIR, settings.DATASET_DIR,
]:
    os.makedirs(directory, exist_ok=True)

app.mount("/storage/originals", StaticFiles(directory=settings.UPLOAD_DIR), name="originals")
app.mount("/storage/videos", StaticFiles(directory=settings.VIDEO_DIR), name="videos")
app.mount("/storage/frames", StaticFiles(directory=settings.FRAMES_DIR), name="frames")
app.mount("/storage/evidence", StaticFiles(directory=settings.EVIDENCE_DIR), name="evidence")
app.mount("/storage/reports", StaticFiles(directory=settings.REPORTS_DIR), name="reports_files")
app.mount("/storage/dataset", StaticFiles(directory=settings.DATASET_DIR), name="dataset")
# Legacy evidence path kept for backward compat
app.mount("/evidence", StaticFiles(directory=settings.EVIDENCE_DIR), name="evidence_legacy")
app.mount("/reports_files", StaticFiles(directory=settings.REPORTS_DIR), name="reports_legacy")

# Include routers
app.include_router(auth_router)
app.include_router(batches_router)
app.include_router(inspect_router)
app.include_router(reports_router)
app.include_router(standards_router)
app.include_router(verify_router)
app.include_router(dataset_router)
app.include_router(models_router)
app.include_router(intelligence_router)
app.include_router(share_router)


@app.on_event("startup")
def startup():
    init_db()
    _seed_demo_data()
    _seed_model_version()


def _seed_demo_data():
    """Seed default standard and admin user if not present."""
    from .database import SessionLocal
    from .models import User, Standard
    from .services.auth import hash_password
    from .grading.engine import DEMO_STANDARD

    db = SessionLocal()
    try:
        # Create admin user
        if not db.query(User).filter(User.username == "admin").first():
            admin = User(
                username="admin",
                email="admin@onionlens.demo",
                hashed_password=hash_password("admin123"),
                role="admin",
            )
            db.add(admin)

        # Create inspector user
        if not db.query(User).filter(User.username == "inspector").first():
            inspector = User(
                username="inspector",
                email="inspector@onionlens.demo",
                hashed_password=hash_password("inspect123"),
                role="inspector",
            )
            db.add(inspector)

        # Create demo standard
        if not db.query(Standard).filter(Standard.standard_name == DEMO_STANDARD["standard_name"]).first():
            standard = Standard(**DEMO_STANDARD)
            db.add(standard)

        db.commit()
    finally:
        db.close()


def _seed_model_version():
    """Seed the demo model version record."""
    from .database import SessionLocal
    from .models import ModelVersion
    db = SessionLocal()
    try:
        from .config import settings
        if not db.query(ModelVersion).filter(
            ModelVersion.model_version == settings.ACTIVE_MODEL_VERSION
        ).first():
            mv = ModelVersion(
                model_name=settings.ACTIVE_MODEL_NAME,
                model_version=settings.ACTIVE_MODEL_VERSION,
                dataset_version="demo-dataset-v1.0",
                training_date="2024-01-01",
                notes="Demo inference mode — no real model weights. Swap demo_inference() for production.",
                metrics={"mAP50": None, "note": "Demo mode — metrics unavailable"},
                is_demo=True,
                is_active=True,
            )
            db.add(mv)
            db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "app": "ONIONLENS 360",
        "version": "1.0.0",
        "tagline": "From any camera to a trusted, evidence-backed procurement decision.",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok", "demo_mode": settings.DEMO_MODE}
