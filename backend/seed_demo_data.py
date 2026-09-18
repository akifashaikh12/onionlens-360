"""
seed_demo_data.py — Run once to pre-populate demo onion images + a demo batch.
Usage: python seed_demo_data.py
"""
import os, sys, random
import numpy as np
import cv2

# Add app to path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import init_db, SessionLocal
from app.main import _seed_demo_data, _seed_model_version
from app.models import Batch, Onion, MediaFile, ModelVersion, Standard, DatasetItem
from app.cv.pipeline import demo_inference, draw_detections, save_evidence_image, image_to_base64
from app.grading.engine import compute_batch_stats, DEMO_STANDARD
from app.config import settings
from datetime import datetime

DEFECT_CLASSES = ["healthy", "damaged", "rotten", "sprouted", "undersized", "unknown"]
COLOR_MAP = {
    "healthy":    (34, 197, 94),
    "damaged":    (249, 115, 22),
    "rotten":     (239, 68, 68),
    "sprouted":   (234, 179, 8),
    "undersized": (168, 85, 247),
    "unknown":    (156, 163, 175),
}


def make_onion_image(defect_class: str, idx: int, size: int = 128) -> np.ndarray:
    """Generate a synthetic onion image with clear colour coding per defect class."""
    rng = random.Random(idx * 31 + hash(defect_class) % 1000)
    img = np.ones((size, size, 3), dtype=np.uint8) * 240

    col = COLOR_MAP.get(defect_class, (150, 150, 150))
    bgr = (col[2], col[1], col[0])

    cx, cy = size // 2, size // 2
    rx = rng.randint(38, 52)
    ry = rng.randint(36, 50)

    # Draw onion body
    cv2.ellipse(img, (cx, cy), (rx, ry), 0, 0, 360, bgr, -1)
    cv2.ellipse(img, (cx, cy), (rx, ry), 0, 0, 360, (30, 30, 30), 2)

    # Inner layer rings
    inner_col = tuple(min(255, c + 40) for c in bgr)
    cv2.ellipse(img, (cx, cy), (rx - 12, ry - 12), 0, 0, 360, inner_col, 1)
    cv2.ellipse(img, (cx, cy), (rx - 22, ry - 22), 0, 0, 360, inner_col, 1)

    # Defect markers
    if defect_class == "rotten":
        for _ in range(rng.randint(3, 6)):
            bx = cx + rng.randint(-rx + 8, rx - 8)
            by = cy + rng.randint(-ry + 8, ry - 8)
            cv2.circle(img, (bx, by), rng.randint(4, 9), (20, 20, 80), -1)
    elif defect_class == "damaged":
        pts = np.array([[cx - 15, cy - 8], [cx + 5, cy - 18], [cx + 18, cy + 5],
                        [cx, cy + 14], [cx - 18, cy + 4]], np.int32)
        cv2.fillPoly(img, [pts], (40, 40, 160))
    elif defect_class == "sprouted":
        cv2.line(img, (cx, cy - ry + 4), (cx, cy - ry - 18), (34, 139, 34), 3)
        cv2.ellipse(img, (cx, cy - ry - 14), (8, 5), 0, 0, 360, (34, 139, 34), -1)
    elif defect_class == "undersized":
        cv2.putText(img, "S", (cx - 8, cy + 7), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (80, 80, 80), 1)

    # Label
    label = defect_class[:3].upper()
    cv2.putText(img, label, (4, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (60, 60, 60), 1)

    return img


def seed_dataset_images(db, n_per_class: int = 5):
    """Generate synthetic labelled dataset images for each defect class."""
    print("  Seeding dataset images...")
    count = 0
    for cls in DEFECT_CLASSES:
        for i in range(n_per_class):
            img = make_onion_image(cls, i)
            filename = f"demo_{cls}_{i:02d}.jpg"
            path = os.path.join(settings.DATASET_DIR, filename)
            if not os.path.exists(path):
                cv2.imwrite(path, img)

            # Check not already in DB
            existing = db.query(DatasetItem).filter(DatasetItem.original_filename == filename).first()
            if not existing:
                item = DatasetItem(
                    stored_path=path,
                    original_filename=filename,
                    label=cls,
                    annotation_status="reviewed",
                    camera_type="synthetic",
                    lighting="synthetic",
                    view_angle="top",
                    batch_ref="DEMO",
                    capture_date="2024-01-01",
                    annotator="seed-script",
                    is_active_learning=False,
                )
                db.add(item)
                count += 1
    db.commit()
    print(f"    Added {count} dataset items ({n_per_class} per class × {len(DEFECT_CLASSES)} classes)")


def seed_demo_batch(db):
    """Create one completed demo batch with full onion records."""
    # Check if a demo batch already exists
    existing = db.query(Batch).filter(Batch.is_demo == True, Batch.status == "completed").first()
    if existing:
        print(f"  Demo batch already exists: {existing.batch_code}")
        return

    print("  Creating demo batch...")
    standard = db.query(Standard).filter(Standard.is_active == True).first()
    from app.services.auth import hash_password
    from app.models import User
    admin = db.query(User).filter(User.username == "admin").first()

    mv = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()

    batch = Batch(
        batch_code=f"ON-{datetime.now().year}-DEMO1",
        status="completed",
        inspection_mode="demo",
        camera_type="demo",
        calibration_active=False,
        standard_id=standard.id if standard else None,
        inspector_id=admin.id if admin else None,
        is_demo=True,
        completed_at=datetime.utcnow(),
    )
    db.add(batch)
    db.flush()

    # Generate canvas + detections
    canvas = np.ones((600, 900, 3), dtype=np.uint8) * 245
    cv2.putText(canvas, "DEMO BATCH — ONIONLENS 360", (20, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 100, 100), 1)

    detections = demo_inference(canvas, n_onions=20, seed=42)

    for det in detections:
        x1, y1, x2, y2 = [int(v) for v in det["bbox"]]
        cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
        rx, ry = max(1, (x2 - x1) // 2), max(1, (y2 - y1) // 2)
        col = COLOR_MAP.get(det["defect_class"], (150, 150, 150))
        cv2.ellipse(canvas, (cx, cy), (rx, ry), 0, 0, 360, (col[2], col[1], col[0]), -1)
        cv2.ellipse(canvas, (cx, cy), (rx, ry), 0, 0, 360, (50, 50, 50), 2)

    # Save original
    from app.models import MediaFile
    from app.config import settings as s
    orig_path = os.path.join(s.UPLOAD_DIR, f"demo_{batch.batch_code}.jpg")
    cv2.imwrite(orig_path, canvas)

    media = MediaFile(
        batch_id=batch.id, media_type="image", source_mode="demo",
        original_filename=f"demo_{batch.batch_code}.jpg",
        stored_path=orig_path, width_px=900, height_px=600, is_demo=True,
    )
    db.add(media)
    db.flush()

    std_version = standard.standard_version if standard else "demo-v1.0"
    onion_dicts = []

    for det in detections:
        x1, y1, x2, y2 = [int(v) for v in det["bbox"]]
        crop = canvas[max(0, y1):y2, max(0, x1):x2]
        ev_fn = f"ev_{batch.batch_code}_{det['onion_uid']}.jpg"
        ev_path = save_evidence_image(crop, ev_fn) if crop.size > 0 else None
        ic = det["inspection_confidence"]

        onion = Onion(
            onion_uid=det["onion_uid"], batch_id=batch.id,
            media_file_id=media.id,
            model_version_id=mv.id if mv else None,
            defect_class=det["defect_class"],
            confidence=det["confidence"], image_quality=det["image_quality"],
            frame_agreement=det["frame_agreement"], inspection_confidence=ic,
            size_category=det["size_category"],
            pixel_width=det["pixel_width"], pixel_height=det["pixel_height"],
            aspect_ratio=det["aspect_ratio"],
            frame_count=det["frame_count"], frames_agreed=det["frames_agreed"],
            final_decision=("accept" if ic >= 0.85 else "review" if ic >= 0.60 else "recapture"),
            is_demo=True, bbox=det["bbox"],
            best_frame_path=ev_path,
            evidence_frame_paths=[ev_path] if ev_path else [],
            frame_classifications=det["frame_classifications"],
            snapshot_standard_version=std_version,
            snapshot_model_version=settings.ACTIVE_MODEL_VERSION,
            needs_review=(ic < 0.60),
        )
        db.add(onion)
        onion_dicts.append({"defect_class": det["defect_class"],
                             "size_category": det["size_category"],
                             "inspection_confidence": ic})

    db.flush()

    # Compute batch stats
    grade_rules = standard.grade_rules if standard else DEMO_STANDARD["grade_rules"]
    stats = compute_batch_stats(onion_dicts, grade_rules)

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
    print(f"    Demo batch created: {batch.batch_code} — Grade {batch.final_grade}, "
          f"{batch.total_onions} onions, {batch.grade_a_pct:.1f}% Grade A")


if __name__ == "__main__":
    print("ONIONLENS 360 — Seeding demo data...")
    init_db()
    _seed_demo_data()
    _seed_model_version()

    db = SessionLocal()
    try:
        seed_dataset_images(db, n_per_class=5)
        seed_demo_batch(db)
    finally:
        db.close()

    print("\nDone. Start the server with:")
    print("  uvicorn app.main:app --reload --port 8000")
