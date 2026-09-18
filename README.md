# 🧅 ONIONLENS 360

> **"From any camera to a trusted, evidence-backed procurement decision."**
>
> SIH 2026 · Problem Statement #26031

A full-stack AI-powered onion quality assessment and procurement decision-support system.

---

## Architecture

```
onionlens360/
├── backend/          Python FastAPI + SQLAlchemy + OpenCV + ReportLab
│   ├── app/
│   │   ├── api/routes/   auth · batches · inspect · reports · standards
│   │   │                 verify · dataset · models · intelligence · share
│   │   ├── cv/           Quality gate · CLAHE · ArUco calibration · demo inference
│   │   ├── grading/      Standards engine · Intelligence engine (OHI/PRS/DSI)
│   │   └── reports/      PDF generation · QR code
│   ├── alembic/          Database migrations
│   └── storage/          originals · videos · frames · evidence · reports · dataset
├── frontend/         React 18 + Vite + Tailwind CSS
│   └── src/
│       ├── pages/    Landing · TechApproach · Dashboard · LiveInspection
│       │             BatchHistory · BatchDetail · Intelligence · EvidenceGallery
│       │             DisputeReplay · Reports · Standards · DatasetManager
│       │             Settings · VerifyPage · SharedBatchPage
│       ├── api/      Axios client with auth · intelligence · share APIs
│       └── store/    Zustand auth store
├── supabase/
│   └── migrations/   001_initial_schema.sql (PostgreSQL + RLS stubs)
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Quick Start (Local)

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1 — Backend

```bash
cd onionlens360/backend

python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
cp .env.example .env            # or create backend/.env

uvicorn app.main:app --reload --port 8000
```

Backend: **http://localhost:8000** · API docs: **http://localhost:8000/docs**

### 2 — Frontend

```bash
cd onionlens360/frontend
npm install
npm run dev
```

Frontend: **http://localhost:3000**

### Default Credentials

| Role      | Username    | Password     |
|-----------|-------------|--------------|
| Admin     | `admin`     | `admin123`   |
| Inspector | `inspector` | `inspect123` |

---

## Demo Flow (End-to-End)

1. **http://localhost:3000** → Landing page → **Open Platform**
2. **Login** → admin / admin123
3. **Dashboard** → click **New Inspection**
4. **Live Inspection** → **Run Demo Batch** → 20 synthetic onions processed
5. **Finish & Grade Batch** → Grade A / URS / Reject assigned
6. **Batch Detail** → view grade, defect breakdown, all scores
7. **Intelligence** (sidebar) → OHI, PRS, Profit Maximizer, Sorting Advisor
8. **Evidence** → per-onion crops + multi-frame breakdown
9. **Dispute Replay** → full frame-by-frame evidence chain
10. **Generate Report** → PDF with full provenance
11. **Generate QR** → Digital Batch Passport
12. **Create Share Link** → copy URL → open in new tab → buyer verification
13. **/share/TOKEN** → buyer sees same stored results, never recalculated
14. **History** → all batches searchable
15. **Technical Approach** → /tech

---

## Intelligence Engine

All metrics are computed with deterministic formulas — no LLM calls.

| Metric | Formula |
|--------|---------|
| **OHI** (Onion Health Index) | 0.50×healthy + 0.20×(100−rotten) + 0.15×(100−damaged) + … |
| **PRS** (Procurement Readiness Score) | (GradeA − Reject×1.5)×0.80 + uniformity×10 + confidence×5 |
| **DSI** (Defect Severity Index) | Weighted defect count / total × 100 |
| **Confidence Meter** | AI×0.50 + ImageQuality×0.25 + FrameAgreement×0.25 |
| **Batch Uniformity Score** | sizeMode/total × 0.60 + avg_conf × 0.40 |
| **Procurement Acceptance Predictor** | Rule-based on PRS + OHI + grade tier |
| **Defect Narrative** | Deterministic text summary from batch stats |
| **Sorting Advisor** | Priority-ranked sorting actions from defect thresholds |
| **Smart Rejection Analyzer** | Cause breakdown + prevention tips |
| **Profit Maximizer** | Revenue estimate at Grade A vs URS pricing |
| **Quality Improvement Simulator** | Scenario analysis: reduce rot/sprouting/damage |
| **Dynamic Threshold Check** | Batch metrics vs standard limits |

---

## Inspection Pipeline

```
INPUT (Camera/Image/Video/Batch)
  ↓
QUALITY GATE (brightness · contrast · blur · exposure) → reject < 45%
  ↓
CLAHE PREPROCESSING
  ↓
ARUCO CALIBRATION CHECK (→ physical mm if marker found)
  ↓
YOLO INFERENCE (demo_inference — swap for real model)
  ↓
BYTETRACK IDs (simulated — ready for real tracker)
  ↓
MULTI-FRAME CONSENSUS (up to 3 frames)
  ↓
CONFIDENCE GATE
  ≥85% → ACCEPT
  60–84% → REVIEW
  <60%  → RECAPTURE / active learning
  ↓
STANDARDS ENGINE (configurable thresholds, not hardcoded)
  ↓
BATCH RESULT (Grade A / URS / Reject)
  ↓
INTELLIGENCE ENGINE (OHI · PRS · DSI · Sorting · Profit · Simulator)
  ↓
EVIDENCE STORE (original + crops + frames + model version snapshot)
  ↓
PDF REPORT + QR (Digital Batch Passport)
  ↓
SHARE LINK (read-only public view — buyer verifies stored results)
```

---

## Pages

| URL | Access | Description |
|-----|--------|-------------|
| `/` | Public | Landing page |
| `/tech` | Public | Technical Approach |
| `/login` | Public | Sign in |
| `/verify/:token` | Public | QR-code batch verification |
| `/share/:token` | Public | Buyer share link — stored read-only view |
| `/dashboard` | Auth | Overview + KPIs + charts |
| `/inspect` | Auth | New inspection (demo/camera/upload/video/batch) |
| `/batches` | Auth | All inspection history |
| `/batches/:id` | Auth | Batch detail + share + QR + actions |
| `/intelligence` | Auth | Full intelligence engine for any batch |
| `/evidence` | Auth | Per-onion evidence gallery |
| `/dispute` | Auth | Dispute replay — full evidence chain |
| `/reports` | Auth | PDF generation + download |
| `/standards` | Auth | Grading rules management |
| `/dataset` | Auth | Dataset manager + active learning queue |
| `/settings` | Auth | System info + feature roadmap |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | JWT login |
| GET | `/api/auth/me` | Current user |
| POST | `/api/batches/` | Create batch |
| GET | `/api/batches/` | List batches |
| POST | `/api/batches/{id}/complete` | Finalise + grade |
| GET | `/api/batches/dashboard` | Dashboard stats |
| POST | `/api/inspect/image` | Single image inspection |
| POST | `/api/inspect/video` | Video inspection |
| POST | `/api/inspect/batch-upload` | Multi-image batch |
| POST | `/api/inspect/demo-batch` | Demo run (no media needed) |
| GET | `/api/intelligence/{batch_id}` | Full intelligence suite |
| POST | `/api/share/{batch_id}` | Create share link |
| GET | `/api/share/{token}` | Public — stored batch view |
| GET | `/api/verify/{token}` | QR code verification |
| POST | `/api/reports/{id}/generate` | Generate PDF + QR |
| GET | `/api/reports/{id}/download` | Download PDF |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Inspector / Admin accounts |
| `batches` | Each inspection session |
| `onions` | Per-onion detections with full provenance |
| `media_files` | Every original image/video permanently stored |
| `model_versions` | AI model version provenance |
| `inspection_frames` | Extracted video frames |
| `dataset_items` | Training dataset + active learning queue |
| `reviews` | Human corrections (active learning) |
| `standards` | Configurable grading rules |
| `reports` | Generated PDF + QR + share token |
| `audit_logs` | Full audit trail |

---

## Deployment

### Docker (local)

```bash
docker-compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
```

### Frontend → Vercel

```bash
cd frontend
# Set VITE_API_URL=https://your-backend.railway.app in Vercel dashboard
vercel --prod
```

### Backend → Railway

```bash
cd backend
railway login && railway init && railway up
# Set DATABASE_URL, SECRET_KEY, DEMO_MODE in Railway dashboard
```

### Supabase (Database)

```bash
# Apply schema to Supabase:
psql $SUPABASE_DB_URL < supabase/migrations/001_initial_schema.sql

# Or paste contents into Supabase SQL Editor
```

---

## Swapping in a Real YOLO Model

```python
# Replace in backend/app/cv/pipeline.py:

# Before (demo):
detections = demo_inference(img, seed=batch_id * 7)

# After (production):
from ultralytics import YOLO
model = YOLO("models/onionlens_v1.pt")
results = model(img)
detections = convert_yolo_results(results)  # your converter
```

Everything else (quality gate, confidence scoring, standards engine, intelligence engine, evidence storage) works unchanged.

---

## Production Checklist

- [ ] Change `SECRET_KEY` in `.env`
- [ ] Set `DEMO_MODE=false`
- [ ] Replace Demo Standard with official procurement specification
- [ ] Swap `demo_inference()` with real YOLO weights
- [ ] Set `DATABASE_URL` to PostgreSQL / Supabase
- [ ] Run `supabase/migrations/001_initial_schema.sql`
- [ ] Configure HTTPS / reverse proxy
- [ ] Set `VITE_API_URL` in Vercel env vars
- [ ] Enable RLS policies in Supabase (see migration file comments)
