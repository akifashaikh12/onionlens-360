"""
Dataset Manager API — Admin interface for labelling training images.
Supports upload, labelling, filtering, and YOLO export.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import uuid, os, io, zipfile, json

from ...database import get_db
from ...models import DatasetItem, MediaFile, User
from ...services.auth import get_current_user, require_admin
from ...cv.pipeline import save_dataset_image
from ...config import settings

router = APIRouter(prefix="/api/dataset", tags=["dataset"])

VALID_LABELS = ["healthy", "damaged", "rotten", "sprouted", "undersized", "unknown", "unlabelled"]


@router.get("/items")
def list_items(
    label: Optional[str] = None,
    status: Optional[str] = None,
    is_active_learning: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(DatasetItem)
    if label:
        q = q.filter(DatasetItem.label == label)
    if status:
        q = q.filter(DatasetItem.annotation_status == status)
    if is_active_learning is not None:
        q = q.filter(DatasetItem.is_active_learning == is_active_learning)
    items = q.order_by(DatasetItem.created_at.desc()).offset(skip).limit(limit).all()
    return items


@router.get("/stats")
def dataset_stats(db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    total = db.query(DatasetItem).count()
    by_label = {}
    for lbl in VALID_LABELS:
        by_label[lbl] = db.query(DatasetItem).filter(DatasetItem.label == lbl).count()
    al_pending = db.query(DatasetItem).filter(
        DatasetItem.is_active_learning == True,
        DatasetItem.annotation_status == "unlabelled"
    ).count()
    return {"total": total, "by_label": by_label, "active_learning_pending": al_pending}


@router.post("/upload")
async def upload_item(
    file: UploadFile = File(...),
    label: str = Form("unlabelled"),
    camera_type: str = Form(""),
    lighting: str = Form(""),
    view_angle: str = Form(""),
    batch_ref: str = Form(""),
    capture_date: str = Form(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contents = await file.read()
    safe_name = f"ds_{uuid.uuid4().hex[:12]}_{file.filename or 'image.jpg'}"
    safe_name = safe_name.replace(" ", "_")[:200]
    path = save_dataset_image(contents, safe_name)

    item = DatasetItem(
        stored_path=path,
        original_filename=file.filename,
        label=label if label in VALID_LABELS else "unlabelled",
        annotation_status="labelled" if label not in ("unlabelled", "") else "unlabelled",
        camera_type=camera_type,
        lighting=lighting,
        view_angle=view_angle,
        batch_ref=batch_ref,
        capture_date=capture_date,
        annotator=current_user.username,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/items/{item_id}/label")
def update_label(
    item_id: int,
    label: str = Form(...),
    bbox_annotation: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(DatasetItem).filter(DatasetItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if label not in VALID_LABELS:
        raise HTTPException(status_code=400, detail=f"Invalid label. Valid: {VALID_LABELS}")
    item.label = label
    item.annotation_status = "labelled"
    item.annotator = current_user.username
    if bbox_annotation:
        try:
            item.bbox_annotation = json.loads(bbox_annotation)
        except Exception:
            pass
    db.commit()
    db.refresh(item)
    return item


@router.put("/items/{item_id}/review")
def mark_reviewed(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    item = db.query(DatasetItem).filter(DatasetItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.annotation_status = "reviewed"
    db.commit()
    return {"status": "reviewed"}


@router.delete("/items/{item_id}")
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    item = db.query(DatasetItem).filter(DatasetItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"status": "deleted"}


@router.get("/export/yolo")
def export_yolo(
    label_filter: Optional[str] = None,
    status_filter: str = "reviewed",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Export labelled dataset items as a YOLO-format zip.
    Each item with a bbox_annotation gets an accompanying .txt label file.
    Items without bbox are included as image-only.
    """
    q = db.query(DatasetItem).filter(DatasetItem.annotation_status == status_filter)
    if label_filter:
        q = q.filter(DatasetItem.label == label_filter)
    items = q.all()

    label_map = {l: i for i, l in enumerate(
        ["healthy", "damaged", "rotten", "sprouted", "undersized", "unknown"]
    )}

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # Write classes.txt
        zf.writestr("classes.txt", "\n".join(label_map.keys()))

        # Write data.yaml
        yaml_content = (
            f"nc: {len(label_map)}\n"
            f"names: {list(label_map.keys())}\n"
            "train: images/train\nval: images/val\n"
        )
        zf.writestr("data.yaml", yaml_content)

        for item in items:
            if not os.path.exists(item.stored_path):
                continue
            fname = os.path.basename(item.stored_path)
            zf.write(item.stored_path, f"images/{fname}")

            # Write YOLO label file if annotation exists
            if item.bbox_annotation and item.label in label_map:
                cls_id = label_map[item.label]
                ann = item.bbox_annotation  # expected: {cx, cy, w, h} normalised
                if isinstance(ann, dict):
                    cx = ann.get("cx", 0.5)
                    cy = ann.get("cy", 0.5)
                    w = ann.get("w", 0.5)
                    h = ann.get("h", 0.5)
                    label_line = f"{cls_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\n"
                    zf.writestr(f"labels/{fname.rsplit('.', 1)[0]}.txt", label_line)

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=onionlens_dataset.zip"},
    )
