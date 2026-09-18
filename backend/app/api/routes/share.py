"""
Share Links — create and retrieve read-only share links.
Recipient sees the same stored certificate/results. Never recalculated.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from ...database import get_db
from ...models import Batch, Report, Standard, Onion
from ...services.auth import get_current_user
from ...models import User

router = APIRouter(prefix="/api/share", tags=["share"])


@router.post("/{batch_id}")
def create_share_link(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create (or return existing) a secure read-only share link for a batch."""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Use existing verification token (from report) or create standalone
    report = db.query(Report).filter(Report.batch_id == batch_id).first()
    if report and report.verification_token:
        token = report.verification_token
    else:
        # Create a report record with just a token (no PDF yet)
        token = uuid.uuid4().hex
        if report:
            report.verification_token = token
        else:
            report = Report(batch_id=batch_id, verification_token=token)
            db.add(report)
        db.commit()

    return {
        "share_token": token,
        "share_url": f"/share/{token}",
        "batch_code": batch.batch_code,
    }


@router.get("/{token}")
def get_shared_batch(token: str, db: Session = Depends(get_db)):
    """
    Public endpoint — returns the stored inspection data for a share token.
    Never exposes private user data or recalculates results.
    """
    report = db.query(Report).filter(Report.verification_token == token).first()
    if not report:
        raise HTTPException(status_code=404, detail="Share link not found")

    batch = report.batch
    standard = db.query(Standard).filter(Standard.id == batch.standard_id).first() if batch.standard_id else None
    onions = db.query(Onion).filter(Onion.batch_id == batch.id).all()

    # Evidence: list of evidence frame filenames (never private paths)
    evidence = []
    for o in onions[:20]:  # limit for public view
        if o.best_frame_path:
            evidence.append({
                "onion_uid": o.onion_uid,
                "defect_class": o.defect_class,
                "confidence": o.confidence,
                "evidence_filename": o.best_frame_path.split("/")[-1] if o.best_frame_path else None,
            })

    return {
        "batch_code": batch.batch_code,
        "inspection_date": batch.completed_at.isoformat() if batch.completed_at else None,
        "inspection_mode": batch.inspection_mode,
        "final_grade": batch.final_grade,
        "grade_a_pct": batch.grade_a_pct,
        "urs_pct": batch.urs_pct,
        "reject_pct": batch.reject_pct,
        "total_onions": batch.total_onions,
        "healthy_count": batch.healthy_count,
        "damaged_count": batch.damaged_count,
        "rotten_count": batch.rotten_count,
        "sprouted_count": batch.sprouted_count,
        "undersized_count": batch.undersized_count,
        "inspection_confidence": batch.inspection_confidence,
        "uniformity_score": batch.uniformity_score,
        "standard_name": standard.standard_name if standard else "Demo Standard",
        "standard_version": standard.standard_version if standard else "v1.0-DEMO",
        "is_demo": batch.is_demo,
        "verification_status": "VERIFIED",
        "evidence_frames": evidence,
        "model_version": "ONIONLENS CV v0.3-demo" if batch.is_demo else "ONIONLENS CV v1.0",
        "has_report": bool(report.file_path),
        "note": "DEMO DATA — Not for commercial use." if batch.is_demo else None,
    }
