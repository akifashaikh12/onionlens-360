-- ONIONLENS 360 — Full Database Schema
-- Compatible with Supabase (PostgreSQL 15+) and plain PostgreSQL.
-- Run with: psql $DATABASE_URL < 001_initial_schema.sql
-- Or in Supabase SQL Editor.

-- ─── Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(64)  UNIQUE NOT NULL,
    email       VARCHAR(128) UNIQUE NOT NULL,
    hashed_password VARCHAR(256) NOT NULL,
    role        VARCHAR(32) DEFAULT 'inspector',  -- inspector | admin
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Standards ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS standards (
    id              SERIAL PRIMARY KEY,
    standard_name   VARCHAR(128) NOT NULL,
    standard_version VARCHAR(32) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    is_demo         BOOLEAN DEFAULT TRUE,
    defect_limits   JSONB,   -- {"damaged_pct": 5, "rotten_pct": 2, ...}
    size_limits     JSONB,   -- {"min_size": "medium", ...}
    grade_rules     JSONB,   -- [{grade, min_healthy_pct, max_defect_pct, ...}]
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Model Versions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_versions (
    id              SERIAL PRIMARY KEY,
    model_name      VARCHAR(128) NOT NULL DEFAULT 'OnionLens YOLO v0.3-demo',
    model_version   VARCHAR(64) NOT NULL DEFAULT 'v0.3-demo',
    model_file      VARCHAR(256),
    dataset_version VARCHAR(64),
    training_date   VARCHAR(32),
    notes           TEXT,
    metrics         JSONB,   -- {"mAP50": 0.91, ...}
    is_demo         BOOLEAN DEFAULT TRUE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Batches ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batches (
    id                  SERIAL PRIMARY KEY,
    batch_code          VARCHAR(32) UNIQUE NOT NULL,
    status              VARCHAR(32) DEFAULT 'in_progress',  -- in_progress | completed | disputed
    inspection_mode     VARCHAR(32) DEFAULT 'image',        -- image | video | live | demo
    camera_type         VARCHAR(64),
    calibration_active  BOOLEAN DEFAULT FALSE,
    total_onions        INTEGER DEFAULT 0,
    healthy_count       INTEGER DEFAULT 0,
    damaged_count       INTEGER DEFAULT 0,
    rotten_count        INTEGER DEFAULT 0,
    sprouted_count      INTEGER DEFAULT 0,
    undersized_count    INTEGER DEFAULT 0,
    unknown_count       INTEGER DEFAULT 0,
    reject_count        INTEGER DEFAULT 0,
    healthy_pct         FLOAT DEFAULT 0,
    defective_pct       FLOAT DEFAULT 0,
    grade_a_pct         FLOAT DEFAULT 0,
    urs_pct             FLOAT DEFAULT 0,
    reject_pct          FLOAT DEFAULT 0,
    final_grade         VARCHAR(16),
    uniformity_score    FLOAT DEFAULT 0,
    inspection_confidence FLOAT DEFAULT 0,
    is_demo             BOOLEAN DEFAULT FALSE,
    notes               TEXT,
    standard_id         INTEGER REFERENCES standards(id),
    inspector_id        INTEGER REFERENCES users(id),
    started_at          TIMESTAMPTZ DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

-- ─── Media Files ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_files (
    id              SERIAL PRIMARY KEY,
    batch_id        INTEGER REFERENCES batches(id) ON DELETE CASCADE,
    media_type      VARCHAR(16) NOT NULL,   -- image | video | frame
    source_mode     VARCHAR(16),            -- upload | webcam | library | demo
    original_filename VARCHAR(256),
    stored_path     VARCHAR(512) NOT NULL,
    file_size_bytes INTEGER,
    width_px        INTEGER,
    height_px       INTEGER,
    duration_s      FLOAT,
    frame_count     INTEGER,
    checksum_md5    VARCHAR(64),
    is_demo         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Onions (per-detection) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onions (
    id                      SERIAL PRIMARY KEY,
    onion_uid               VARCHAR(64) NOT NULL,
    batch_id                INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    media_file_id           INTEGER REFERENCES media_files(id),
    model_version_id        INTEGER REFERENCES model_versions(id),
    defect_class            VARCHAR(32),  -- healthy|damaged|rotten|sprouted|undersized|unknown
    confidence              FLOAT DEFAULT 0,
    image_quality           FLOAT DEFAULT 0,
    frame_agreement         FLOAT DEFAULT 0,
    inspection_confidence   FLOAT DEFAULT 0,
    size_category           VARCHAR(16),  -- small|medium|large
    pixel_width             FLOAT,
    pixel_height            FLOAT,
    physical_width_mm       FLOAT,
    physical_height_mm      FLOAT,
    aspect_ratio            FLOAT,
    frame_count             INTEGER DEFAULT 1,
    frames_agreed           INTEGER DEFAULT 1,
    final_decision          VARCHAR(32),  -- accept | review | recapture
    is_demo                 BOOLEAN DEFAULT FALSE,
    bbox                    JSONB,        -- [x1, y1, x2, y2]
    best_frame_path         VARCHAR(256),
    evidence_frame_paths    JSONB DEFAULT '[]',
    frame_classifications   JSONB DEFAULT '[]',
    snapshot_standard_version VARCHAR(64),
    snapshot_model_version  VARCHAR(64),
    snapshot_grade_result   VARCHAR(16),
    needs_review            BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Inspection Frames ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_frames (
    id                      SERIAL PRIMARY KEY,
    batch_id                INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    media_file_id           INTEGER REFERENCES media_files(id),
    onion_id                INTEGER REFERENCES onions(id),
    frame_index             INTEGER,
    timestamp_s             FLOAT,
    stored_path             VARCHAR(512),
    quality_score           FLOAT,
    quality_details         JSONB,
    was_used_for_inference  BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Dataset Items ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dataset_items (
    id                  SERIAL PRIMARY KEY,
    media_file_id       INTEGER REFERENCES media_files(id),
    stored_path         VARCHAR(512) NOT NULL,
    original_filename   VARCHAR(256),
    label               VARCHAR(32),  -- healthy|damaged|rotten|sprouted|undersized|unknown|unlabelled
    annotation_status   VARCHAR(32) DEFAULT 'unlabelled',
    camera_type         VARCHAR(64),
    lighting            VARCHAR(64),
    view_angle          VARCHAR(64),
    batch_ref           VARCHAR(64),
    capture_date        VARCHAR(32),
    annotator           VARCHAR(64),
    bbox_annotation     JSONB,
    is_active_learning  BOOLEAN DEFAULT FALSE,
    source_onion_id     INTEGER REFERENCES onions(id),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Reviews (human corrections for active learning) ──────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id                  SERIAL PRIMARY KEY,
    onion_id            INTEGER NOT NULL REFERENCES onions(id),
    batch_id            INTEGER NOT NULL REFERENCES batches(id),
    reviewer_id         INTEGER REFERENCES users(id),
    original_class      VARCHAR(32),
    corrected_class     VARCHAR(32),
    original_confidence FLOAT,
    notes               TEXT,
    status              VARCHAR(32) DEFAULT 'pending',  -- pending | accepted | exported
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Reports ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
    id                  SERIAL PRIMARY KEY,
    batch_id            INTEGER UNIQUE NOT NULL REFERENCES batches(id),
    file_path           VARCHAR(256),
    qr_path             VARCHAR(256),
    verification_token  VARCHAR(128) UNIQUE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Audit Logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id),
    action      VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64),
    entity_id   INTEGER,
    details     JSONB,
    ip_address  VARCHAR(64),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_inspector ON batches(inspector_id);
CREATE INDEX IF NOT EXISTS idx_onions_batch ON onions(batch_id);
CREATE INDEX IF NOT EXISTS idx_onions_defect_class ON onions(defect_class);
CREATE INDEX IF NOT EXISTS idx_onions_needs_review ON onions(needs_review) WHERE needs_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_media_files_batch ON media_files(batch_id);
CREATE INDEX IF NOT EXISTS idx_reports_token ON reports(verification_token);
CREATE INDEX IF NOT EXISTS idx_dataset_items_label ON dataset_items(label);
CREATE INDEX IF NOT EXISTS idx_dataset_items_al ON dataset_items(is_active_learning) WHERE is_active_learning = TRUE;

-- ─── RLS Policies (Supabase) ─────────────────────────────────────────────────
-- Enable RLS on all user-specific tables.
-- NOTE: App uses JWT auth via FastAPI, not Supabase auth.
-- These policies are provided for reference if switching to Supabase Auth.

-- ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE onions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Allow inspectors to see only their own batches:
-- CREATE POLICY "inspector_own_batches" ON batches
--   FOR ALL USING (inspector_id = (SELECT id FROM users WHERE email = auth.email()));

-- Public verification (reports) — anyone with token can read:
-- CREATE POLICY "public_verify_reports" ON reports
--   FOR SELECT USING (TRUE);

-- ─── Seed Demo Data ───────────────────────────────────────────────────────────
-- Insert demo standard (replaced by app startup if using SQLite/SQLAlchemy)
INSERT INTO standards (standard_name, standard_version, description, is_demo, defect_limits, size_limits, grade_rules)
SELECT
    'DEMO Procurement Standard',
    'v1.0-DEMO',
    'DEMO STANDARD — Replace with official procurement specification.',
    TRUE,
    '{"damaged_pct": 5.0, "rotten_pct": 2.0, "sprouted_pct": 3.0, "undersized_pct": 4.0}'::jsonb,
    '{"min_size": "small", "preferred_sizes": ["medium", "large"]}'::jsonb,
    '[{"grade":"A","label":"Grade A","min_healthy_pct":90.0,"max_defect_pct":5.0,"max_rotten_pct":1.0},{"grade":"URS","label":"Under Reviewed Standard","min_healthy_pct":75.0,"max_defect_pct":15.0,"max_rotten_pct":5.0},{"grade":"REJECT","label":"Reject","min_healthy_pct":0.0,"max_defect_pct":100.0,"max_rotten_pct":100.0}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM standards WHERE standard_name = 'DEMO Procurement Standard');

INSERT INTO model_versions (model_name, model_version, dataset_version, training_date, notes, is_demo, is_active)
SELECT 'OnionLens YOLO v0.3-demo', 'v0.3-demo', 'demo-dataset-v1.0', '2024-01-01',
       'Demo inference mode — no real model weights. Swap demo_inference() for production.', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM model_versions WHERE model_version = 'v0.3-demo');
