from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ...database import get_db
from ...models import Batch, Onion, Standard, Report, User
from ...schemas import BatchCreate, BatchOut, BatchSummary, DashboardStats
from ...services.auth import get_current_user
from ...grading.engine import compute_batch_stats, DEMO_STANDARD
from datetime import datetime, timedelta
import random

router = APIRouter(prefix="/api/batches", tags=["batches"])


def _batch_code():
    import random
    year = datetime.now().year
    num = random.randint(10000, 99999)
    return f"ON-{year}-{num:05d}"


@router.post("/", response_model=BatchSummary)
def create_batch(batch_in: BatchCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    # Get or use default standard
    standard = None
    if batch_in.standard_id:
        standard = db.query(Standard).filter(Standard.id == batch_in.standard_id).first()
    if not standard:
        standard = db.query(Standard).filter(Standard.is_active == True).first()

    batch = Batch(
        batch_code=_batch_code(),
        inspection_mode=batch_in.inspection_mode,
        camera_type=batch_in.camera_type,
        standard_id=standard.id if standard else None,
        inspector_id=current_user.id,
        is_demo=batch_in.is_demo,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.get("/", response_model=List[BatchSummary])
def list_batches(skip: int = 0, limit: int = 50, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    batches = db.query(Batch).order_by(Batch.started_at.desc()).offset(skip).limit(limit).all()
    return batches


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    batches = db.query(Batch).filter(Batch.status == "completed").all()
    total_batches = len(batches)
    total_onions = sum(b.total_onions for b in batches)

    avg_conf = (sum(b.inspection_confidence for b in batches) / total_batches) if total_batches else 0
    avg_grade_a = (sum(b.grade_a_pct for b in batches) / total_batches) if total_batches else 0
    avg_urs = (sum(b.urs_pct for b in batches) / total_batches) if total_batches else 0
    avg_reject = (sum(b.reject_pct for b in batches) / total_batches) if total_batches else 0

    recent = db.query(Batch).order_by(Batch.started_at.desc()).limit(5).all()

    # Defect distribution across all batches
    defect_dist = {
        "healthy": sum(b.healthy_count for b in batches),
        "damaged": sum(b.damaged_count for b in batches),
        "rotten": sum(b.rotten_count for b in batches),
        "sprouted": sum(b.sprouted_count for b in batches),
        "undersized": sum(b.undersized_count for b in batches),
        "unknown": sum(b.unknown_count for b in batches),
    }

    grade_dist = {
        "A": len([b for b in batches if b.final_grade == "A"]),
        "URS": len([b for b in batches if b.final_grade == "URS"]),
        "REJECT": len([b for b in batches if b.final_grade == "REJECT"]),
    }

    # Batch trend — last 7 completed batches
    trend = []
    for b in sorted(batches, key=lambda x: x.started_at)[-7:]:
        trend.append({
            "date": b.completed_at.strftime("%m/%d") if b.completed_at else "",
            "grade_a": b.grade_a_pct,
            "urs": b.urs_pct,
            "reject": b.reject_pct,
            "batch_code": b.batch_code,
        })

    return DashboardStats(
        total_batches=total_batches,
        total_onions=total_onions,
        avg_confidence=round(avg_conf, 3),
        avg_grade_a_pct=round(avg_grade_a, 2),
        avg_urs_pct=round(avg_urs, 2),
        avg_reject_pct=round(avg_reject, 2),
        recent_batches=recent,
        defect_distribution=defect_dist,
        grade_distribution=grade_dist,
        batch_trend=trend,
    )


@router.get("/{batch_id}", response_model=BatchOut)
def get_batch(batch_id: int, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.get("/code/{batch_code}", response_model=BatchOut)
def get_batch_by_code(batch_code: str, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    batch = db.query(Batch).filter(Batch.batch_code == batch_code).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.post("/{batch_id}/complete")
def complete_batch(batch_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Get standard grade rules
    standard = db.query(Standard).filter(Standard.id == batch.standard_id).first()
    grade_rules = standard.grade_rules if standard else DEMO_STANDARD["grade_rules"]

    # Compute stats from stored onions
    onion_dicts = [
        {
            "defect_class": o.defect_class,
            "size_category": o.size_category,
            "inspection_confidence": o.inspection_confidence,
        }
        for o in batch.onions
    ]
    stats = compute_batch_stats(onion_dicts, grade_rules)

    # Update batch
    batch.status = "completed"
    batch.completed_at = datetime.utcnow()
    batch.total_onions = stats["total_onions"]
    batch.healthy_count = stats["healthy_count"]
    batch.damaged_count = stats["damaged_count"]
    batch.rotten_count = stats["rotten_count"]
    batch.sprouted_count = stats["sprouted_count"]
    batch.undersized_count = stats["undersized_count"]
    batch.unknown_count = stats["unknown_count"]
    batch.reject_count = stats["reject_count"]
    batch.healthy_pct = stats["healthy_pct"]
    batch.defective_pct = stats["defective_pct"]
    batch.grade_a_pct = stats["grade_a_pct"]
    batch.urs_pct = stats["urs_pct"]
    batch.reject_pct = stats["reject_pct"]
    batch.final_grade = stats["final_grade"]
    batch.uniformity_score = stats["uniformity_score"]
    batch.inspection_confidence = stats["inspection_confidence"]

    db.commit()
    db.refresh(batch)
    return {"status": "completed", "batch_code": batch.batch_code, "stats": stats}
