"""Model versioning API — track every model used in any inspection."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ...database import get_db
from ...models import ModelVersion, User
from ...services.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/models", tags=["models"])


@router.get("/")
def list_model_versions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(ModelVersion).order_by(ModelVersion.created_at.desc()).all()


@router.get("/active")
def get_active_model(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mv = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
    if not mv:
        raise HTTPException(status_code=404, detail="No active model version found")
    return mv


@router.get("/{model_id}")
def get_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mv = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not mv:
        raise HTTPException(status_code=404, detail="Model version not found")
    return mv


@router.post("/{model_id}/activate")
def activate_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Set a model version as active. Deactivates all others."""
    mv = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not mv:
        raise HTTPException(status_code=404, detail="Model version not found")
    # Deactivate all
    db.query(ModelVersion).update({"is_active": False})
    mv.is_active = True
    db.commit()
    return {"status": "activated", "model_version": mv.model_version}
