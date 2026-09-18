"""Intelligence API — computed insights for a batch."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ...database import get_db
from ...models import Batch, Standard
from ...services.auth import get_current_user
from ...models import User
from ...grading.intelligence import compute_all_intelligence

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])


@router.get("/{batch_id}")
def get_intelligence(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    standard = db.query(Standard).filter(Standard.id == batch.standard_id).first() if batch.standard_id else None
    defect_limits = standard.defect_limits if standard else None

    stats = {
        "total_onions": batch.total_onions,
        "healthy_count": batch.healthy_count,
        "damaged_count": batch.damaged_count,
        "rotten_count": batch.rotten_count,
        "sprouted_count": batch.sprouted_count,
        "undersized_count": batch.undersized_count,
        "unknown_count": batch.unknown_count,
        "reject_count": batch.reject_count,
        "healthy_pct": batch.healthy_pct,
        "damaged_pct": batch.damaged_count / max(batch.total_onions, 1) * 100,
        "rotten_pct": batch.rotten_count / max(batch.total_onions, 1) * 100,
        "sprouted_pct": batch.sprouted_count / max(batch.total_onions, 1) * 100,
        "undersized_pct": batch.undersized_count / max(batch.total_onions, 1) * 100,
        "defective_pct": batch.defective_pct,
        "grade_a_pct": batch.grade_a_pct,
        "urs_pct": batch.urs_pct,
        "reject_pct": batch.reject_pct,
        "final_grade": batch.final_grade,
    }

    result = compute_all_intelligence(
        stats=stats,
        batch_code=batch.batch_code,
        uniformity_score=batch.uniformity_score or 0.0,
        inspection_confidence=batch.inspection_confidence or 0.0,
        standard_defect_limits=defect_limits,
    )
    result["batch_id"] = batch_id
    result["batch_code"] = batch.batch_code
    result["final_grade"] = batch.final_grade
    result["is_demo"] = batch.is_demo
    return result
