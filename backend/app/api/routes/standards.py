from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ...database import get_db
from ...models import Standard
from ...schemas import StandardCreate, StandardOut
from ...services.auth import get_current_user, require_admin
from ...grading.engine import DEMO_STANDARD
from ...models import User

router = APIRouter(prefix="/api/standards", tags=["standards"])


@router.get("/", response_model=List[StandardOut])
def list_standards(db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    return db.query(Standard).filter(Standard.is_active == True).all()


@router.get("/{standard_id}", response_model=StandardOut)
def get_standard(standard_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    s = db.query(Standard).filter(Standard.id == standard_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Standard not found")
    return s


@router.post("/", response_model=StandardOut)
def create_standard(standard_in: StandardCreate, db: Session = Depends(get_db),
                    current_user: User = Depends(require_admin)):
    s = Standard(**standard_in.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.put("/{standard_id}", response_model=StandardOut)
def update_standard(standard_id: int, standard_in: StandardCreate, db: Session = Depends(get_db),
                    current_user: User = Depends(require_admin)):
    s = db.query(Standard).filter(Standard.id == standard_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Standard not found")
    for k, v in standard_in.model_dump().items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{standard_id}")
def delete_standard(standard_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(require_admin)):
    s = db.query(Standard).filter(Standard.id == standard_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Standard not found")
    s.is_active = False
    db.commit()
    return {"status": "deactivated"}
