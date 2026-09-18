from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import uuid
import os

from ...database import get_db
from ...models import Batch, Report, Standard
from ...schemas import ReportOut
from ...services.auth import get_current_user
from ...reports.generator import generate_pdf_report, generate_qr_code
from ...models import User
from ...config import settings

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/{batch_id}/generate", response_model=ReportOut)
def generate_report(batch_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    standard = db.query(Standard).filter(Standard.id == batch.standard_id).first() if batch.standard_id else None
    onions = batch.onions

    # Generate verification token
    token = uuid.uuid4().hex

    # Verification URL (public endpoint)
    verification_url = f"http://localhost:8000/api/verify/{token}"

    # Generate QR
    qr_path = generate_qr_code(verification_url, f"qr_{batch.batch_code}.png")

    # Generate PDF
    pdf_path = generate_pdf_report(batch, onions, standard, verification_url)

    # Save report record
    existing = db.query(Report).filter(Report.batch_id == batch_id).first()
    if existing:
        existing.file_path = pdf_path
        existing.qr_path = qr_path
        existing.verification_token = token
        db.commit()
        db.refresh(existing)
        return existing

    report = Report(
        batch_id=batch_id,
        file_path=pdf_path,
        qr_path=qr_path,
        verification_token=token,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/{batch_id}")
def get_report(batch_id: int, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    report = db.query(Report).filter(Report.batch_id == batch_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/{batch_id}/download")
def download_report(batch_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    report = db.query(Report).filter(Report.batch_id == batch_id).first()
    if not report or not report.file_path or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found")
    return FileResponse(report.file_path, media_type="application/pdf",
                        filename=os.path.basename(report.file_path))


@router.get("/{batch_id}/qr")
def get_qr(batch_id: int, db: Session = Depends(get_db),
           current_user: User = Depends(get_current_user)):
    report = db.query(Report).filter(Report.batch_id == batch_id).first()
    if not report or not report.qr_path or not os.path.exists(report.qr_path):
        raise HTTPException(status_code=404, detail="QR code not found")
    return FileResponse(report.qr_path, media_type="image/png")
