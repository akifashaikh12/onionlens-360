"""
CV Pipeline — Image Quality + Demo Inference Engine
In production: swap demo_inference() with real YOLO+ByteTrack model.
"""
import cv2
import numpy as np
import random
import os
import uuid
import base64
import hashlib
from typing import List, Tuple, Dict, Optional
from ..config import settings

# ─── Demo inference data ──────────────────────────────────────────────────────
DEMO_ONION_POOL = [
    {"defect_class": "healthy",    "confidence": 0.96, "size": "large",  "w": 180, "h": 175},
    {"defect_class": "healthy",    "confidence": 0.94, "size": "large",  "w": 175, "h": 170},
    {"defect_class": "healthy",    "confidence": 0.97, "size": "medium", "w": 145, "h": 140},
    {"defect_class": "healthy",    "confidence": 0.92, "size": "medium", "w": 150, "h": 148},
    {"defect_class": "healthy",    "confidence": 0.91, "size": "medium", "w": 148, "h": 145},
    {"defect_class": "healthy",    "confidence": 0.95, "size": "small",  "w": 110, "h": 108},
    {"defect_class": "healthy",    "confidence": 0.93, "size": "small",  "w": 115, "h": 112},
    {"defect_class": "damaged",    "confidence": 0.88, "size": "medium", "w": 142, "h": 138},
    {"defect_class": "damaged",    "confidence": 0.85, "size": "large",  "w": 168, "h": 160},
    {"defect_class": "rotten",     "confidence": 0.91, "size": "medium", "w": 130, "h": 125},
    {"defect_class": "rotten",     "confidence": 0.87, "size": "small",  "w": 105, "h": 100},
    {"defect_class": "sprouted",   "confidence": 0.89, "size": "medium", "w": 138, "h": 155},
    {"defect_class": "undersized", "confidence": 0.86, "size": "small",  "w": 80,  "h": 78},
    {"defect_class": "undersized", "confidence": 0.84, "size": "small",  "w": 75,  "h": 72},
    {"defect_class": "unknown",    "confidence": 0.52, "size": "medium", "w": 135, "h": 130},
]

DEFECT_COLORS = {
    "healthy":    (34, 197, 94),
    "damaged":    (249, 115, 22),
    "rotten":     (239, 68, 68),
    "sprouted":   (234, 179, 8),
    "undersized": (168, 85, 247),
    "unknown":    (156, 163, 175),
}


# ─── Image quality assessment ─────────────────────────────────────────────────
def assess_image_quality(img: np.ndarray) -> Dict:
    """Return quality scores 0–1 for brightness, contrast, sharpness."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img

    # Brightness (0=dark, 1=bright)
    mean_brightness = gray.mean() / 255.0
    brightness_score = 1.0 - abs(mean_brightness - 0.5) * 2  # penalise extremes

    # Contrast (std dev)
    contrast_score = min(gray.std() / 64.0, 1.0)

    # Sharpness (Laplacian variance)
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    sharpness_score = min(lap_var / 500.0, 1.0)

    # Overexposure
    overexp = (gray > 245).mean()
    overexp_score = 1.0 - min(overexp * 10, 1.0)

    # Underexposure
    underexp = (gray < 10).mean()
    underexp_score = 1.0 - min(underexp * 10, 1.0)

    overall = (brightness_score * 0.2 + contrast_score * 0.2 +
               sharpness_score * 0.4 + overexp_score * 0.1 + underexp_score * 0.1)

    return {
        "overall": round(overall, 3),
        "brightness": round(brightness_score, 3),
        "contrast": round(contrast_score, 3),
        "sharpness": round(sharpness_score, 3),
        "overexposure": round(1 - overexp_score, 3),
        "underexposure": round(1 - underexp_score, 3),
        "usable": overall >= 0.45,
    }


def preprocess_image(img: np.ndarray) -> np.ndarray:
    """Apply adaptive enhancement only when needed."""
    quality = assess_image_quality(img)
    if quality["overall"] >= 0.7:
        return img  # good enough, no processing needed

    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)

    # Gamma correction for dark images
    if quality["brightness"] < 0.35:
        gamma = 1.8
        inv_gamma = 1.0 / gamma
        table = np.array([(i / 255.0) ** inv_gamma * 255 for i in range(256)]).astype("uint8")
        l = cv2.LUT(l, table)

    merged = cv2.merge([l, a, b])
    return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)


# ─── Demo inference: generates realistic results without a real model ─────────
def demo_inference(img: np.ndarray, n_onions: Optional[int] = None, seed: int = 42) -> List[Dict]:
    """
    Deterministic demo inference. Draws bounding boxes on the image and
    returns structured detection results.
    """
    rng = random.Random(seed)
    h, w = img.shape[:2]

    if n_onions is None:
        n_onions = rng.randint(8, 22)

    results = []
    occupied = []

    for i in range(n_onions):
        template = rng.choice(DEMO_ONION_POOL)

        # Place non-overlapping bounding boxes
        ow, oh = template["w"], template["h"]
        for _ in range(50):  # max attempts
            x1 = rng.randint(10, max(11, w - ow - 10))
            y1 = rng.randint(10, max(11, h - oh - 10))
            x2, y2 = x1 + ow, y1 + oh
            overlap = any(
                not (x2 < ox1 or x1 > ox2 or y2 < oy1 or y1 > oy2)
                for (ox1, oy1, ox2, oy2) in occupied
            )
            if not overlap:
                occupied.append((x1, y1, x2, y2))
                break
        else:
            continue

        # Multi-frame consensus (simulated)
        frames_agreed = rng.randint(2, 3)
        frame_count = 3
        frame_classifications = []
        for f in range(frame_count):
            # 85% chance each frame matches the primary classification
            if rng.random() < 0.85:
                fc = template["defect_class"]
                fconf = round(template["confidence"] + rng.uniform(-0.04, 0.04), 3)
            else:
                fc = rng.choice(["healthy", "damaged"])
                fconf = round(rng.uniform(0.6, 0.8), 3)
            frame_classifications.append({"frame": f + 1, "class": fc, "confidence": fconf})

        img_quality = round(rng.uniform(0.82, 0.97), 3)
        frame_agreement = frames_agreed / frame_count
        # Weighted inspection confidence
        inspection_conf = round(
            template["confidence"] * 0.5 + img_quality * 0.25 + frame_agreement * 0.25, 3
        )

        results.append({
            "onion_uid": f"T{i+1:03d}",
            "defect_class": template["defect_class"],
            "confidence": round(template["confidence"] + rng.uniform(-0.03, 0.03), 3),
            "image_quality": img_quality,
            "frame_agreement": round(frame_agreement, 3),
            "inspection_confidence": inspection_conf,
            "size_category": template["size"],
            "pixel_width": float(ow),
            "pixel_height": float(oh),
            "aspect_ratio": round(ow / oh, 3),
            "frame_count": frame_count,
            "frames_agreed": frames_agreed,
            "bbox": [float(x1), float(y1), float(x2), float(y2)],
            "frame_classifications": frame_classifications,
            "is_demo": True,
        })

    return results


def draw_detections(img: np.ndarray, detections: List[Dict], show_labels: bool = True) -> np.ndarray:
    """Draw bounding boxes and labels on image."""
    out = img.copy()
    for det in detections:
        bbox = det.get("bbox", [])
        if len(bbox) < 4:
            continue
        x1, y1, x2, y2 = [int(v) for v in bbox]
        cls = det.get("defect_class", "unknown")
        color = DEFECT_COLORS.get(cls, (156, 163, 175))
        # BGR for OpenCV
        bgr = (color[2], color[1], color[0])
        cv2.rectangle(out, (x1, y1), (x2, y2), bgr, 2)

        if show_labels:
            conf = det.get("confidence", 0.0)
            uid = det.get("onion_uid", "")
            label = f"{uid} {cls[:3].upper()} {conf:.0%}"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(out, (x1, y1 - th - 6), (x1 + tw + 4, y1), bgr, -1)
            cv2.putText(out, label, (x1 + 2, y1 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
    return out


def image_to_base64(img: np.ndarray, fmt: str = ".jpg") -> str:
    _, buf = cv2.imencode(fmt, img)
    return base64.b64encode(buf.tobytes()).decode()


def save_evidence_image(img: np.ndarray, filename: str) -> str:
    path = os.path.join(settings.EVIDENCE_DIR, filename)
    cv2.imwrite(path, img)
    return path


def save_original_image(data: bytes, filename: str) -> Dict:
    """Save raw uploaded image bytes to storage/originals. Returns metadata."""
    path = os.path.join(settings.UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(data)
    # decode for dimensions
    nparr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    h, w = (img.shape[:2] if img is not None else (0, 0))
    md5 = hashlib.md5(data).hexdigest()
    return {
        "stored_path": path,
        "file_size_bytes": len(data),
        "width_px": w,
        "height_px": h,
        "checksum_md5": md5,
    }


def save_original_video(data: bytes, filename: str) -> Dict:
    """Save raw uploaded video bytes to storage/videos. Returns metadata."""
    path = os.path.join(settings.VIDEO_DIR, filename)
    with open(path, "wb") as f:
        f.write(data)
    md5 = hashlib.md5(data).hexdigest()
    # Try to get video metadata via OpenCV
    cap = cv2.VideoCapture(path)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 1
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration_s = frame_count / fps if fps > 0 else 0
    cap.release()
    return {
        "stored_path": path,
        "file_size_bytes": len(data),
        "width_px": w,
        "height_px": h,
        "frame_count": frame_count,
        "duration_s": round(duration_s, 2),
        "checksum_md5": md5,
    }


def extract_frames_from_video(video_path: str, every_n: int = None) -> List[Dict]:
    """
    Extract key frames from a video for inference.
    Returns list of {frame_index, timestamp_s, img, quality}.
    Only keeps frames that pass the quality gate.
    """
    if every_n is None:
        every_n = settings.INFERENCE_EVERY_N_FRAMES
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    frames = []
    idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if idx % every_n == 0:
            quality = assess_image_quality(frame)
            if quality["usable"]:
                frames.append({
                    "frame_index": idx,
                    "timestamp_s": round(idx / fps, 3),
                    "img": frame,
                    "quality": quality,
                })
        idx += 1
        # Cap at 50 frames per video in demo/MVP mode
        if len(frames) >= 50:
            break
    cap.release()
    return frames


def save_frame(img: np.ndarray, batch_code: str, frame_index: int) -> str:
    """Save a single extracted frame to storage/frames."""
    filename = f"frame_{batch_code}_{frame_index:06d}.jpg"
    path = os.path.join(settings.FRAMES_DIR, filename)
    cv2.imwrite(path, img)
    return path


def save_dataset_image(data: bytes, filename: str) -> str:
    """Save an image to the dataset directory."""
    path = os.path.join(settings.DATASET_DIR, filename)
    with open(path, "wb") as f:
        f.write(data)
    return path


def check_aruco_marker(img: np.ndarray) -> Optional[Dict]:
    """Detect ArUco marker for physical size calibration."""
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
        params = cv2.aruco.DetectorParameters()
        detector = cv2.aruco.ArucoDetector(aruco_dict, params)
        corners, ids, _ = detector.detectMarkers(gray)
        if ids is not None and len(ids) > 0:
            marker_corners = corners[0][0]
            # Marker side length in pixels
            dx = marker_corners[1][0] - marker_corners[0][0]
            dy = marker_corners[1][1] - marker_corners[0][1]
            marker_px = float(np.sqrt(dx**2 + dy**2))
            return {
                "detected": True,
                "marker_px": marker_px,
                "assumed_real_mm": 50.0,  # default: 50mm marker
                "px_per_mm": marker_px / 50.0,
            }
    except Exception:
        pass
    return {"detected": False}
