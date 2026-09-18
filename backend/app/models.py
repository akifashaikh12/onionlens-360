from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import uuid


def gen_uuid():
    return str(uuid.uuid4())

# ─── New tables added in v1.1 ─────────────────────────────────────────────────


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    role = Column(String(32), default="inspector")  # inspector | admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    batches = relationship("Batch", back_populates="inspector")


class Standard(Base):
    __tablename__ = "standards"
    id = Column(Integer, primary_key=True, index=True)
    standard_name = Column(String(128), nullable=False)
    standard_version = Column(String(32), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    is_demo = Column(Boolean, default=True)
    defect_limits = Column(JSON)   # {"damaged_pct": 5, "rotten_pct": 2, ...}
    size_limits = Column(JSON)     # {"min_size": "medium", ...}
    grade_rules = Column(JSON)     # [{"grade":"A","max_defect_pct":5,"min_healthy_pct":90}, ...]
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    batches = relationship("Batch", back_populates="standard")


class MediaFile(Base):
    """Persistent record of every uploaded/captured media file."""
    __tablename__ = "media_files"
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=True)
    media_type = Column(String(16), nullable=False)  # image | video | frame
    source_mode = Column(String(16))                 # upload | webcam | library | demo
    original_filename = Column(String(256))
    stored_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer)
    width_px = Column(Integer)
    height_px = Column(Integer)
    duration_s = Column(Float)          # for video
    frame_count = Column(Integer)       # for video
    checksum_md5 = Column(String(64))
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # relationships filled below


class ModelVersion(Base):
    """Every AI model version used in any inspection."""
    __tablename__ = "model_versions"
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(128), nullable=False, default="OnionLens YOLO v0.3-demo")
    model_version = Column(String(64), nullable=False, default="v0.3-demo")
    model_file = Column(String(256))
    dataset_version = Column(String(64))
    training_date = Column(String(32))
    notes = Column(Text)
    metrics = Column(JSON)   # {"mAP50": 0.91, ...}
    is_demo = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InspectionFrame(Base):
    """Individual frames extracted from video for inference."""
    __tablename__ = "inspection_frames"
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    media_file_id = Column(Integer, ForeignKey("media_files.id"), nullable=True)
    onion_id = Column(Integer, ForeignKey("onions.id"), nullable=True)
    frame_index = Column(Integer)
    timestamp_s = Column(Float)
    stored_path = Column(String(512))
    quality_score = Column(Float)
    quality_details = Column(JSON)
    was_used_for_inference = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DatasetItem(Base):
    """Images/frames stored in the dataset manager for future training."""
    __tablename__ = "dataset_items"
    id = Column(Integer, primary_key=True, index=True)
    media_file_id = Column(Integer, ForeignKey("media_files.id"), nullable=True)
    stored_path = Column(String(512), nullable=False)
    original_filename = Column(String(256))
    label = Column(String(32))           # healthy|damaged|rotten|sprouted|undersized|unknown|unlabelled
    annotation_status = Column(String(32), default="unlabelled")  # unlabelled|labelled|reviewed
    camera_type = Column(String(64))
    lighting = Column(String(64))
    view_angle = Column(String(64))
    batch_ref = Column(String(64))
    capture_date = Column(String(32))
    annotator = Column(String(64))
    bbox_annotation = Column(JSON)       # YOLO-format annotation if labelled
    is_active_learning = Column(Boolean, default=False)  # flagged from low-confidence review
    source_onion_id = Column(Integer, ForeignKey("onions.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Review(Base):
    """Human correction records for active learning."""
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    onion_id = Column(Integer, ForeignKey("onions.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    original_class = Column(String(32))
    corrected_class = Column(String(32))
    original_confidence = Column(Float)
    notes = Column(Text)
    status = Column(String(32), default="pending")  # pending | accepted | exported
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Batch(Base):
    __tablename__ = "batches"
    id = Column(Integer, primary_key=True, index=True)
    batch_code = Column(String(32), unique=True, nullable=False, default=gen_uuid)
    status = Column(String(32), default="in_progress")  # in_progress | completed | disputed
    inspection_mode = Column(String(32), default="image")  # image | video | live | demo
    camera_type = Column(String(64))
    calibration_active = Column(Boolean, default=False)
    total_onions = Column(Integer, default=0)
    healthy_count = Column(Integer, default=0)
    damaged_count = Column(Integer, default=0)
    rotten_count = Column(Integer, default=0)
    sprouted_count = Column(Integer, default=0)
    undersized_count = Column(Integer, default=0)
    unknown_count = Column(Integer, default=0)
    reject_count = Column(Integer, default=0)
    healthy_pct = Column(Float, default=0.0)
    defective_pct = Column(Float, default=0.0)
    grade_a_pct = Column(Float, default=0.0)
    urs_pct = Column(Float, default=0.0)
    reject_pct = Column(Float, default=0.0)
    final_grade = Column(String(16))
    uniformity_score = Column(Float, default=0.0)
    inspection_confidence = Column(Float, default=0.0)
    is_demo = Column(Boolean, default=False)
    notes = Column(Text)
    standard_id = Column(Integer, ForeignKey("standards.id"))
    inspector_id = Column(Integer, ForeignKey("users.id"))
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    standard = relationship("Standard", back_populates="batches")
    inspector = relationship("User", back_populates="batches")
    onions = relationship("Onion", back_populates="batch", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="batch", uselist=False)
    media_files = relationship("MediaFile", back_populates="batch")
    frames = relationship("InspectionFrame", back_populates="batch")
    reviews = relationship("Review", back_populates="batch")


class Onion(Base):
    __tablename__ = "onions"
    id = Column(Integer, primary_key=True, index=True)
    onion_uid = Column(String(64), nullable=False)  # track_id within batch
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    media_file_id = Column(Integer, ForeignKey("media_files.id"), nullable=True)
    model_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=True)
    defect_class = Column(String(32))   # healthy|damaged|rotten|sprouted|undersized|unknown
    confidence = Column(Float, default=0.0)
    image_quality = Column(Float, default=0.0)
    frame_agreement = Column(Float, default=0.0)
    inspection_confidence = Column(Float, default=0.0)
    size_category = Column(String(16))  # small|medium|large
    pixel_width = Column(Float)
    pixel_height = Column(Float)
    physical_width_mm = Column(Float)  # only when calibrated
    physical_height_mm = Column(Float)
    aspect_ratio = Column(Float)
    frame_count = Column(Integer, default=1)
    frames_agreed = Column(Integer, default=1)
    final_decision = Column(String(32))  # accept | reject | review
    is_demo = Column(Boolean, default=False)
    bbox = Column(JSON)   # [x1,y1,x2,y2] in original image
    best_frame_path = Column(String(256))
    evidence_frame_paths = Column(JSON, default=list)
    frame_classifications = Column(JSON, default=list)  # [{frame:1,class:,conf:},...]
    # immutable snapshot fields (set at batch finalisation)
    snapshot_standard_version = Column(String(64))
    snapshot_model_version = Column(String(64))
    snapshot_grade_result = Column(String(16))
    needs_review = Column(Boolean, default=False)   # flagged for active learning
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    batch = relationship("Batch", back_populates="onions")
    inspection_frames = relationship("InspectionFrame", back_populates="onion")
    reviews = relationship("Review", back_populates="onion")
    dataset_items = relationship("DatasetItem", back_populates="source_onion")


# ─── Back-populate relationships on new models ────────────────────────────────
MediaFile.batch = relationship("Batch", back_populates="media_files", foreign_keys=[MediaFile.batch_id])
InspectionFrame.batch = relationship("Batch", back_populates="frames")
InspectionFrame.onion = relationship("Onion", back_populates="inspection_frames")
InspectionFrame.media_file = relationship("MediaFile", foreign_keys=[InspectionFrame.media_file_id])
Review.onion = relationship("Onion", back_populates="reviews")
Review.batch = relationship("Batch", back_populates="reviews")
Review.reviewer = relationship("User", foreign_keys=[Review.reviewer_id])
DatasetItem.source_onion = relationship("Onion", back_populates="dataset_items", foreign_keys=[DatasetItem.source_onion_id])
DatasetItem.media_file = relationship("MediaFile", foreign_keys=[DatasetItem.media_file_id])


class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), unique=True, nullable=False)
    file_path = Column(String(256))
    qr_path = Column(String(256))
    verification_token = Column(String(128), unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    batch = relationship("Batch", back_populates="report")
