from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


# ─── Auth ───────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "inspector"


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# ─── Standard ────────────────────────────────────────────────────────────────
class StandardCreate(BaseModel):
    standard_name: str
    standard_version: str
    description: Optional[str] = None
    is_demo: bool = True
    defect_limits: dict
    size_limits: dict
    grade_rules: List[dict]


class StandardOut(BaseModel):
    id: int
    standard_name: str
    standard_version: str
    description: Optional[str]
    is_active: bool
    is_demo: bool
    defect_limits: dict
    size_limits: dict
    grade_rules: List[dict]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Onion ───────────────────────────────────────────────────────────────────
class OnionOut(BaseModel):
    id: int
    onion_uid: str
    defect_class: Optional[str]
    confidence: float
    image_quality: float
    frame_agreement: float
    inspection_confidence: float
    size_category: Optional[str]
    pixel_width: Optional[float]
    pixel_height: Optional[float]
    physical_width_mm: Optional[float]
    physical_height_mm: Optional[float]
    aspect_ratio: Optional[float]
    frame_count: int
    frames_agreed: int
    final_decision: Optional[str]
    is_demo: bool
    bbox: Optional[List[float]]
    best_frame_path: Optional[str]
    evidence_frame_paths: Optional[List[str]]
    frame_classifications: Optional[List[dict]]
    # v1.1 provenance fields
    media_file_id: Optional[int] = None
    model_version_id: Optional[int] = None
    snapshot_standard_version: Optional[str] = None
    snapshot_model_version: Optional[str] = None
    snapshot_grade_result: Optional[str] = None
    needs_review: Optional[bool] = False
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Batch ───────────────────────────────────────────────────────────────────
class BatchCreate(BaseModel):
    inspection_mode: str = "image"
    camera_type: Optional[str] = None
    standard_id: Optional[int] = None
    is_demo: bool = False


class BatchOut(BaseModel):
    id: int
    batch_code: str
    status: str
    inspection_mode: str
    camera_type: Optional[str]
    calibration_active: bool
    total_onions: int
    healthy_count: int
    damaged_count: int
    rotten_count: int
    sprouted_count: int
    undersized_count: int
    unknown_count: int
    reject_count: int
    healthy_pct: float
    defective_pct: float
    grade_a_pct: float
    urs_pct: float
    reject_pct: float
    final_grade: Optional[str]
    uniformity_score: float
    inspection_confidence: float
    is_demo: bool
    notes: Optional[str]
    standard_id: Optional[int]
    inspector_id: Optional[int]
    started_at: datetime
    completed_at: Optional[datetime]
    onions: List[OnionOut] = []

    class Config:
        from_attributes = True
        # Don't fail serialization on extra/missing relationship fields
        populate_by_name = True


class BatchSummary(BaseModel):
    id: int
    batch_code: str
    status: str
    inspection_mode: str
    total_onions: int
    final_grade: Optional[str]
    grade_a_pct: float
    urs_pct: float
    reject_pct: float
    inspection_confidence: float
    is_demo: bool
    started_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Report ───────────────────────────────────────────────────────────────────
class ReportOut(BaseModel):
    id: int
    batch_id: int
    file_path: Optional[str]
    qr_path: Optional[str]
    verification_token: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Inference result (CV pipeline output) ───────────────────────────────────
class DetectionResult(BaseModel):
    onion_uid: str
    defect_class: str
    confidence: float
    image_quality: float
    frame_agreement: float
    inspection_confidence: float
    size_category: str
    pixel_width: float
    pixel_height: float
    aspect_ratio: float
    frame_count: int
    frames_agreed: int
    bbox: List[float]
    frame_classifications: List[dict]
    best_frame_path: Optional[str] = None
    evidence_frame_paths: List[str] = []
    is_demo: bool = False


class InspectionRequest(BaseModel):
    batch_id: int
    is_demo: bool = False
    standard_id: Optional[int] = None


# ─── Dashboard stats ──────────────────────────────────────────────────────────
class DashboardStats(BaseModel):
    total_batches: int
    total_onions: int
    avg_confidence: float
    avg_grade_a_pct: float
    avg_urs_pct: float
    avg_reject_pct: float
    recent_batches: List[BatchSummary]
    defect_distribution: dict
    grade_distribution: dict
    batch_trend: List[dict]
