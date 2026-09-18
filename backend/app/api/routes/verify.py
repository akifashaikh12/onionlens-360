"""Public verification endpoint — exposes only intended batch data."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database import get_db
from ...models import Report, Batch, Standard

router = APIRouter(prefix="/api/verify", tags=["verify"])


@router.get("/{token}")
def verify_batch(token: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.verification_token == token).first()
    if not report:
        raise HTTPException(status_code=404, detail="Verification token not found")

    batch = report.batch
    standard = db.query(Standard).filter(Standard.id == batch.standard_id).first() if batch.standard_id else None

    return {
        "batch_id": batch.batch_code,
        "inspection_date": batch.completed_at.isoformat() if batch.completed_at else None,
        "final_grade": batch.final_grade,
        "grade_a_pct": batch.grade_a_pct,
        "urs_pct": batch.urs_pct,
        "reject_pct": batch.reject_pct,
        "inspection_confidence": batch.inspection_confidence,
        "standard_name": standard.standard_name if standard else "Demo Standard",
        "standard_version": standard.standard_version if standard else "v1.0-DEMO",
        "is_demo": batch.is_demo,
        "verification_status": "VERIFIED",
        "note": "DEMO DATA — Not for commercial use." if batch.is_demo else None,
    }
