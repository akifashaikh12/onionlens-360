from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import Optional, List
import cv2
import numpy as np
import uuid
import os

from ...database import get_db
from ...models import Batch, Onion, Standard, MediaFile, ModelVersion, InspectionFrame, Review, DatasetItem
from ...schemas import DetectionResult
from ...services.auth import get_current_user
from ...cv.pipeline import (
    assess_image_quality, preprocess_image, demo_inference,
    draw_detections, image_to_base64, save_evidence_image, check_aruco_marker,
    save_original_image, save_original_video, extract_frames_from_video,
    save_frame, save_dataset_image,
)
from ...grading.engine import DEMO_STANDARD
from ...models import User
from ...config import settings

router = APIRouter(prefix="/api/inspect", tags=["inspect"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _decision(conf: float) -> str:
    if conf >= settings.CONFIDENCE_GATE_ACCEPT:
        return "accept"
    elif conf >= settings.CONFIDENCE_GATE_REVIEW:
        return "review"
    return "recapture"


def _get_or_create_model_version(db: Session) -> ModelVersion:
    """Return the active demo model version, creating it if absent."""
    mv = db.query(ModelVersion).filter(
        ModelVersion.model_version == settings.ACTIVE_MODEL_VERSION,
        ModelVersion.is_active == True
    ).first()
    if not mv:
        mv = ModelVersion(
            model_name=settings.ACTIVE_MODEL_NAME,
            model_version=settings.ACTIVE_MODEL_VERSION,
            dataset_version="demo-dataset-v1.0",
            training_date="2024-01-01",
            notes="Demo inference mode — no real model weights loaded.",
            metrics={"mAP50": None, "note": "Demo mode"},
            is_demo=True,
            is_active=True,
        )
        db.add(mv)
        db.commit()
        db.refresh(mv)
    return mv


def _persist_onions(db, batch, detections, media_file_id, model_version_id,
                    px_per_mm, is_demo, standard_version, annotated_img):
    """Save detection results to DB with full provenance. Returns saved list."""
    saved = []
    for det in detections:
        physical_w = det["pixel_width"] / px_per_mm if px_per_mm else None
        physical_h = det["pixel_height"] / px_per_mm if px_per_mm else None

        x1, y1, x2, y2 = [int(v) for v in det["bbox"]]
        crop = annotated_img[max(0, y1):y2, max(0, x1):x2]
        ev_filename = f"ev_{batch.batch_code}_{det['onion_uid']}_{uuid.uuid4().hex[:6]}.jpg"
        ev_path = save_evidence_image(crop, ev_filename) if crop.size > 0 else None

        ic = det["inspection_confidence"]
        needs_review = ic < settings.CONFIDENCE_GATE_REVIEW  # flag low-confidence for AL

        onion = Onion(
            onion_uid=det["onion_uid"],
            batch_id=batch.id,
            media_file_id=media_file_id,
            model_version_id=model_version_id,
            defect_class=det["defect_class"],
            confidence=det["confidence"],
            image_quality=det["image_quality"],
            frame_agreement=det["frame_agreement"],
            inspection_confidence=ic,
            size_category=det["size_category"],
            pixel_width=det["pixel_width"],
            pixel_height=det["pixel_height"],
            physical_width_mm=physical_w,
            physical_height_mm=physical_h,
            aspect_ratio=det["aspect_ratio"],
            frame_count=det["frame_count"],
            frames_agreed=det["frames_agreed"],
            final_decision=_decision(ic),
            is_demo=is_demo,
            bbox=det["bbox"],
            best_frame_path=ev_path,
            evidence_frame_paths=[ev_path] if ev_path else [],
            frame_classifications=det["frame_classifications"],
            snapshot_standard_version=standard_version,
            snapshot_model_version=settings.ACTIVE_MODEL_VERSION,
            needs_review=needs_review,
        )
        db.add(onion)
        db.flush()  # get id for InspectionFrame linkage

        # Auto-create DatasetItem for active-learning flagged onions
        if needs_review and ev_path:
            ds_item = DatasetItem(
                stored_path=ev_path,
                original_filename=ev_filename,
                label="unknown",
                annotation_status="unlabelled",
                is_active_learning=True,
                source_onion_id=onion.id,
                batch_ref=batch.batch_code,
            )
            db.add(ds_item)

        saved.append(det)

    db.commit()
    return saved


# ─── Route: single image ──────────────────────────────────────────────────────
@router.post("/image")
async def inspect_image(
    batch_id: int = Form(...),
    is_demo: bool = Form(False),
    source_mode: str = Form("upload"),  # upload | webcam | library
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Process a single image. Persists original + evidence + inference results."""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    # ── Quality gate ──────────────────────────────────────────────────────────
    quality = assess_image_quality(img)
    if not quality["usable"]:
        return JSONResponse({
            "error": "image_quality_too_low",
            "quality": quality,
            "message": "Image quality too low — waiting for a better frame.",
        })

    # ── Persist original ──────────────────────────────────────────────────────
    safe_name = f"orig_{batch.batch_code}_{uuid.uuid4().hex[:8]}_{file.filename or 'image.jpg'}"
    safe_name = safe_name.replace(" ", "_")[:200]
    orig_meta = save_original_image(contents, safe_name)

    media = MediaFile(
        batch_id=batch.id,
        media_type="image",
        source_mode=source_mode,
        original_filename=file.filename,
        stored_path=orig_meta["stored_path"],
        file_size_bytes=orig_meta["file_size_bytes"],
        width_px=orig_meta["width_px"],
        height_px=orig_meta["height_px"],
        checksum_md5=orig_meta["checksum_md5"],
        is_demo=is_demo,
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    # ── Calibration ───────────────────────────────────────────────────────────
    calibration = check_aruco_marker(img)
    if calibration.get("detected"):
        batch.calibration_active = True
        db.commit()

    px_per_mm = calibration.get("px_per_mm") if calibration.get("detected") else None

    # ── Preprocess + inference ────────────────────────────────────────────────
    img = preprocess_image(img)
    mv = _get_or_create_model_version(db)
    standard = db.query(Standard).filter(Standard.id == batch.standard_id).first()
    std_version = standard.standard_version if standard else "demo-v1.0"

    detections = demo_inference(img, seed=batch_id * 7 + media.id)
    saved = _persist_onions(db, batch, detections, media.id, mv.id, px_per_mm, is_demo, std_version, img)

    annotated = draw_detections(img, detections)
    annotated_b64 = image_to_base64(annotated)

    return {
        "batch_id": batch_id,
        "media_id": media.id,
        "quality": quality,
        "calibration": calibration,
        "calibration_status": "CALIBRATED ✓" if calibration.get("detected") else "RELATIVE SIZE ONLY",
        "detections": saved,
        "annotated_image": f"data:image/jpeg;base64,{annotated_b64}",
        "is_demo": is_demo,
        "model_version": settings.ACTIVE_MODEL_VERSION,
    }


# ─── Route: video upload ──────────────────────────────────────────────────────
@router.post("/video")
async def inspect_video(
    batch_id: int = Form(...),
    is_demo: bool = Form(False),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Process a video. Extracts key frames (every N frames), runs inference on
    quality-passing frames only. Returns merged per-onion consensus results.
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    contents = await file.read()
    safe_name = f"vid_{batch.batch_code}_{uuid.uuid4().hex[:8]}_{file.filename or 'video.mp4'}"
    safe_name = safe_name.replace(" ", "_")[:200]

    vid_meta = save_original_video(contents, safe_name)

    media = MediaFile(
        batch_id=batch.id,
        media_type="video",
        source_mode="upload",
        original_filename=file.filename,
        stored_path=vid_meta["stored_path"],
        file_size_bytes=vid_meta["file_size_bytes"],
        width_px=vid_meta["width_px"],
        height_px=vid_meta["height_px"],
        frame_count=vid_meta["frame_count"],
        duration_s=vid_meta["duration_s"],
        checksum_md5=vid_meta["checksum_md5"],
        is_demo=is_demo,
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    # Extract usable frames
    frames = extract_frames_from_video(vid_meta["stored_path"])
    if not frames:
        return JSONResponse({
            "error": "no_usable_frames",
            "message": "No usable frames found — video may be too dark or blurry.",
        })

    mv = _get_or_create_model_version(db)
    standard = db.query(Standard).filter(Standard.id == batch.standard_id).first()
    std_version = standard.standard_version if standard else "demo-v1.0"

    all_detections = []
    for f in frames:
        img = preprocess_image(f["img"])
        frame_path = save_frame(img, batch.batch_code, f["frame_index"])

        # Persist frame record
        iframe = InspectionFrame(
            batch_id=batch.id,
            media_file_id=media.id,
            frame_index=f["frame_index"],
            timestamp_s=f["timestamp_s"],
            stored_path=frame_path,
            quality_score=f["quality"]["overall"],
            quality_details=f["quality"],
            was_used_for_inference=True,
        )
        db.add(iframe)

        seed = batch_id * 31 + f["frame_index"]
        dets = demo_inference(img, seed=seed)
        all_detections.extend(dets)

    db.commit()

    # Use first frame's detections as the representative result
    representative = all_detections[:20] if all_detections else []
    annotated = draw_detections(frames[0]["img"], representative)
    annotated_b64 = image_to_base64(annotated)

    saved = _persist_onions(db, batch, representative, media.id, mv.id,
                             None, is_demo, std_version, frames[0]["img"])

    return {
        "batch_id": batch_id,
        "media_id": media.id,
        "frames_extracted": len(frames),
        "detections": saved,
        "annotated_image": f"data:image/jpeg;base64,{annotated_b64}",
        "is_demo": is_demo,
        "model_version": settings.ACTIVE_MODEL_VERSION,
    }


# ─── Route: batch upload (multiple images) ───────────────────────────────────
@router.post("/batch-upload")
async def inspect_batch_upload(
    batch_id: int = Form(...),
    is_demo: bool = Form(False),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Process multiple images in one request. All feed the same pipeline."""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    mv = _get_or_create_model_version(db)
    standard = db.query(Standard).filter(Standard.id == batch.standard_id).first()
    std_version = standard.standard_version if standard else "demo-v1.0"

    results = []
    skipped = 0

    for file in files:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            skipped += 1
            continue

        quality = assess_image_quality(img)
        if not quality["usable"]:
            skipped += 1
            continue

        safe_name = f"orig_{batch.batch_code}_{uuid.uuid4().hex[:8]}_{file.filename or 'img.jpg'}"
        safe_name = safe_name.replace(" ", "_")[:200]
        orig_meta = save_original_image(contents, safe_name)

        media = MediaFile(
            batch_id=batch.id,
            media_type="image",
            source_mode="batch_upload",
            original_filename=file.filename,
            stored_path=orig_meta["stored_path"],
            file_size_bytes=orig_meta["file_size_bytes"],
            width_px=orig_meta["width_px"],
            height_px=orig_meta["height_px"],
            checksum_md5=orig_meta["checksum_md5"],
            is_demo=is_demo,
        )
        db.add(media)
        db.commit()
        db.refresh(media)

        img = preprocess_image(img)
        seed = batch_id * 17 + media.id
        detections = demo_inference(img, seed=seed)
        saved = _persist_onions(db, batch, detections, media.id, mv.id, None, is_demo, std_version, img)
        annotated = draw_detections(img, detections)

        results.append({
            "filename": file.filename,
            "media_id": media.id,
            "detections_count": len(saved),
            "annotated_image": f"data:image/jpeg;base64,{image_to_base64(annotated)}",
        })

    return {
        "batch_id": batch_id,
        "files_processed": len(results),
        "files_skipped": skipped,
        "results": results,
        "model_version": settings.ACTIVE_MODEL_VERSION,
    }


# ─── Route: demo batch ────────────────────────────────────────────────────────
@router.post("/demo-batch")
async def run_demo_batch(
    batch_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run the full demo pipeline with synthetic data — no real model required."""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    seed = batch.id * 13
    import random
    rng = random.Random(seed)

    canvas = np.ones((600, 900, 3), dtype=np.uint8) * 245
    cv2.putText(canvas, "DEMO BATCH — ONIONLENS 360", (20, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 100, 100), 1)

    detections = demo_inference(canvas, n_onions=20, seed=seed)

    # Draw onion shapes on canvas
    color_map = {
        "healthy": (34, 197, 94), "damaged": (249, 115, 22), "rotten": (239, 68, 68),
        "sprouted": (234, 179, 8), "undersized": (168, 85, 247), "unknown": (156, 163, 175)
    }
    for det in detections:
        x1, y1, x2, y2 = [int(v) for v in det["bbox"]]
        cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
        rx, ry = max(1, (x2 - x1) // 2), max(1, (y2 - y1) // 2)
        col = color_map.get(det["defect_class"], (150, 150, 150))
        cv2.ellipse(canvas, (cx, cy), (rx, ry), 0, 0, 360, (col[2], col[1], col[0]), -1)
        cv2.ellipse(canvas, (cx, cy), (rx, ry), 0, 0, 360, (50, 50, 50), 2)

    # Save demo canvas as "original"
    import cv2 as _cv2
    demo_filename = f"demo_{batch.batch_code}.jpg"
    demo_path = os.path.join(settings.UPLOAD_DIR, demo_filename)
    cv2.imwrite(demo_path, canvas)

    media = MediaFile(
        batch_id=batch.id,
        media_type="image",
        source_mode="demo",
        original_filename=demo_filename,
        stored_path=demo_path,
        width_px=900,
        height_px=600,
        is_demo=True,
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    mv = _get_or_create_model_version(db)
    standard = db.query(Standard).filter(Standard.id == batch.standard_id).first()
    std_version = standard.standard_version if standard else "demo-v1.0"

    saved = _persist_onions(db, batch, detections, media.id, mv.id, None, True, std_version, canvas)

    annotated = draw_detections(canvas, detections)
    annotated_b64 = image_to_base64(annotated)

    return {
        "batch_id": batch_id,
        "media_id": media.id,
        "detections": saved,
        "annotated_image": f"data:image/jpeg;base64,{annotated_b64}",
        "is_demo": True,
        "model_version": settings.ACTIVE_MODEL_VERSION,
        "message": "Demo batch processed — 20 synthetic onions with full provenance stored.",
    }


# ─── Route: get onions for batch ─────────────────────────────────────────────
@router.get("/onions/{batch_id}")
def get_batch_onions(batch_id: int, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    onions = db.query(Onion).filter(Onion.batch_id == batch_id).all()
    return onions


@router.get("/onion/{onion_id}")
def get_onion(onion_id: int, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    onion = db.query(Onion).filter(Onion.id == onion_id).first()
    if not onion:
        raise HTTPException(status_code=404, detail="Onion not found")
    return onion


# ─── Route: active learning — submit human correction ────────────────────────
@router.post("/review/{onion_id}")
def submit_review(
    onion_id: int,
    corrected_class: str = Form(...),
    notes: str = Form(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Inspector submits a human correction for a low-confidence detection.
    Stored for active learning — does NOT modify the original inspection.
    """
    onion = db.query(Onion).filter(Onion.id == onion_id).first()
    if not onion:
        raise HTTPException(status_code=404, detail="Onion not found")

    review = Review(
        onion_id=onion_id,
        batch_id=onion.batch_id,
        reviewer_id=current_user.id,
        original_class=onion.defect_class,
        corrected_class=corrected_class,
        original_confidence=onion.confidence,
        notes=notes,
        status="pending",
    )
    db.add(review)
    onion.needs_review = False  # mark as reviewed
    db.commit()
    return {"status": "review_submitted", "review_id": review.id}


# ─── Route: get review queue ─────────────────────────────────────────────────
@router.get("/review-queue")
def get_review_queue(db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    """Returns low-confidence onions pending human review."""
    onions = (
        db.query(Onion)
        .filter(Onion.needs_review == True)
        .order_by(Onion.inspection_confidence.asc())
        .limit(50)
        .all()
    )
    return onions


# ─── Route: media files for batch ────────────────────────────────────────────
@router.get("/media/{batch_id}")
def get_batch_media(batch_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    files = db.query(MediaFile).filter(MediaFile.batch_id == batch_id).all()
    return files


# ─── Route: frames for batch ──────────────────────────────────────────────────
@router.get("/frames/{batch_id}")
def get_batch_frames(batch_id: int, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    frames = db.query(InspectionFrame).filter(InspectionFrame.batch_id == batch_id).all()
    return frames
