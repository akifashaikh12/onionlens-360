import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera, Brain, Cpu, Database, Monitor, BarChart2,
  ChevronRight, ArrowLeft, Layers, CheckCircle
} from 'lucide-react'

const TECH_STACK = [
  { category: 'Frontend', items: ['Next.js / React 18', 'TypeScript / JSX', 'Tailwind CSS', 'Recharts + Recharts Radar', 'Lucide Icons', 'Zustand State', 'React Router v6', 'Axios'] },
  { category: 'Backend', items: ['Python FastAPI', 'SQLAlchemy ORM', 'SQLite → PostgreSQL', 'Pydantic v2', 'Python-Jose JWT', 'Passlib SHA-256'] },
  { category: 'CV / AI', items: ['YOLO (swap-ready)', 'OpenCV 4.9', 'ByteTrack (demo ready)', 'NumPy', 'CLAHE preprocessing', 'ArUco calibration', 'Demo inference engine'] },
  { category: 'Storage', items: ['Supabase / PostgreSQL', 'Supabase Storage', 'SQLite (dev)', 'Local file storage', 'MD5 checksums'] },
  { category: 'Infra', items: ['Docker / docker-compose', 'Vercel (frontend)', 'Railway / Render (backend)', 'GitHub Actions (CI)', 'Nginx (production)'] },
  { category: 'Reports', items: ['ReportLab PDF', 'QRCode library', 'Evidence crops', 'Multi-frame snapshots'] },
]

const PIPELINE_STEPS = [
  {
    icon: Camera,
    phase: 'Data Collection',
    color: 'blue',
    inputs: ['Live Camera (webcam)', 'Image Upload (JPEG/PNG)', 'Video Upload (MP4)', 'Inspection Library', 'Conveyor / Batch Mode'],
    outputs: ['Raw media stored', 'Quality gate applied', 'ArUco calibration check'],
  },
  {
    icon: Brain,
    phase: 'AI Analysis',
    color: 'purple',
    inputs: ['YOLO detection', 'Per-onion classification', 'Size estimation (px/mm)', 'Defect location + bbox', 'Multi-frame consensus'],
    outputs: ['Healthy / Damaged / Rotten / Sprouted / Undersized', 'Confidence per onion', 'Evidence crops saved'],
  },
  {
    icon: Cpu,
    phase: 'Processing',
    color: 'indigo',
    inputs: ['YOLO inference (demo mode)', 'OpenCV frame extraction', 'ByteTrack ID tracking', 'PyTorch (plug-in ready)', 'Grading engine rules'],
    outputs: ['Detections → DB', 'Batch stats computed', 'Grade A / URS / Reject assigned'],
  },
  {
    icon: Database,
    phase: 'Storage',
    color: 'green',
    inputs: ['PostgreSQL (Supabase)', 'Supabase Storage (media)', 'Model version snapshots', 'Audit log entries'],
    outputs: ['Immutable batch record', 'Original + evidence files', 'Grading rules snapshot'],
  },
  {
    icon: Monitor,
    phase: 'UI / Web',
    color: 'orange',
    inputs: ['React / Next.js SPA', 'Mobile-responsive Tailwind', 'Public verify page', 'Buyer share page'],
    outputs: ['Dashboard · Inspect · Results', 'Certificate · QR code', 'Public verification'],
  },
  {
    icon: BarChart2,
    phase: 'Results / Insights',
    color: 'pink',
    inputs: ['OHI · PRS · DSI', 'Uniformity · Confidence Meter', 'Sorting Advisor', 'Profit Maximizer', 'Quality Simulator'],
    outputs: ['PDF Report + QR', 'Share link (buyer)', 'Dispute Replay', 'Audit trail'],
  },
]

const COLOR_MAP = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', label: 'bg-blue-600 text-white' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600', label: 'bg-purple-600 text-white' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-100 text-indigo-600', label: 'bg-indigo-600 text-white' },
  green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'bg-green-100 text-green-600', label: 'bg-green-600 text-white' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-600', label: 'bg-orange-600 text-white' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'bg-pink-100 text-pink-600', label: 'bg-pink-600 text-white' },
}

const INTELLIGENCE_METRICS = [
  { name: 'OHI', full: 'Onion Health Index', formula: '0.50×healthy + 0.20×(100−rotten) + 0.15×(100−damaged) + 0.10×(100−sprouted) + 0.05×(100−undersized)' },
  { name: 'PRS', full: 'Procurement Readiness Score', formula: '(GradeA×1.0 + URS×0.4 − Reject×1.5)×0.80 + uniformity×10 + confidence×5' },
  { name: 'DSI', full: 'Defect Severity Index', formula: '(rotten×1.0 + damaged×0.6 + sprouted×0.5 + undersized×0.3) / total × 100' },
  { name: 'Conf', full: 'Inspection Confidence', formula: 'AI×0.50 + ImageQuality×0.25 + FrameAgreement×0.25' },
  { name: 'BUS', full: 'Batch Uniformity Score', formula: 'sizeMode/total × 0.60 + avg_confidence × 0.40' },
  { name: 'PAP', full: 'Procurement Acceptance Predictor', formula: 'Rule-based on PRS, OHI, and final grade tier' },
]

export default function TechnicalApproach() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: '-apple-system, "Segoe UI", system-ui, sans-serif' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-sm">ONIONLENS 360</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <span className="text-sm text-gray-500">Technical Approach</span>
            </div>
          </div>
          <button onClick={() => navigate('/login')} className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
            Open Platform
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-4 border border-blue-100">
            SIH 2026 · Problem Statement #26031
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Technical Approach</h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            End-to-end AI pipeline for onion quality assessment — from raw camera input to a trusted, certified procurement decision.
          </p>
        </div>

        {/* Pipeline */}
        <h2 className="text-xl font-bold text-gray-900 mb-6">Six-Layer Processing Pipeline</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {PIPELINE_STEPS.map((step, i) => {
            const c = COLOR_MAP[step.color]
            return (
              <div key={step.phase} className={`rounded-2xl border p-5 ${c.bg} ${c.border}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.icon}`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-0.5 ${c.label}`}>Step {i+1}</div>
                    <div className="font-bold text-gray-900 text-sm">{step.phase}</div>
                  </div>
                </div>
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Inputs</p>
                  <ul className="space-y-0.5">
                    {step.inputs.map(inp => (
                      <li key={inp} className="text-xs text-gray-600 flex gap-1.5 items-start">
                        <span className="text-gray-400 mt-0.5">•</span>{inp}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Outputs</p>
                  <ul className="space-y-0.5">
                    {step.outputs.map(out => (
                      <li key={out} className="text-xs text-gray-700 flex gap-1.5 items-start">
                        <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />{out}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>

        {/* Intelligence Formulas */}
        <h2 className="text-xl font-bold text-gray-900 mb-6">Intelligence Engine — Formulas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {INTELLIGENCE_METRICS.map(m => (
            <div key={m.name} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{m.name}</span>
                <span className="font-semibold text-gray-900 text-sm">{m.full}</span>
              </div>
              <code className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 block leading-relaxed">{m.formula}</code>
            </div>
          ))}
        </div>

        {/* Tech Stack */}
        <h2 className="text-xl font-bold text-gray-900 mb-6">Technology Stack</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {TECH_STACK.map(cat => (
            <div key={cat.category} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="font-semibold text-xs text-blue-600 uppercase tracking-wide mb-2">{cat.category}</div>
              <ul className="space-y-1">
                {cat.items.map(item => (
                  <li key={item} className="text-xs text-gray-600">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CV Pipeline detail */}
        <h2 className="text-xl font-bold text-gray-900 mb-6">CV Inference Pipeline</h2>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-12">
          <div className="flex flex-wrap gap-2 items-center text-sm">
            {[
              'INPUT (Camera/Image/Video)',
              'Quality Gate (brightness · contrast · blur)',
              'Reject <45%',
              'CLAHE Preprocessing',
              'ArUco Calibration Check',
              'YOLO Inference (demo_inference)',
              'ByteTrack ID',
              'Multi-Frame Consensus',
              'Confidence Gate',
              '≥85% ACCEPT / 60–84% REVIEW / <60% RECAPTURE',
              'Standards Engine',
              'Batch Result (A / URS / Reject)',
              'Evidence Store',
              'Report + QR',
            ].map((s, i, arr) => (
              <React.Fragment key={s}>
                <span className={`px-3 py-1 rounded-lg text-xs font-medium border
                  ${s.startsWith('Reject') || s.includes('RECAPTURE') ? 'bg-red-50 border-red-200 text-red-700' :
                    s.includes('ACCEPT') ? 'bg-green-50 border-green-200 text-green-700' :
                    s.includes('REVIEW') ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                    'bg-gray-50 border-gray-200 text-gray-700'}`}>
                  {s}
                </span>
                {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* DB Tables */}
        <h2 className="text-xl font-bold text-gray-900 mb-6">Database Schema</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-12">
          {[
            ['users', 'Inspector / Admin accounts'],
            ['batches', 'Inspection sessions'],
            ['onions', 'Per-onion detections'],
            ['media_files', 'All original media'],
            ['model_versions', 'AI model provenance'],
            ['inspection_frames', 'Extracted video frames'],
            ['dataset_items', 'Training dataset'],
            ['reviews', 'Human corrections'],
            ['standards', 'Grading rules'],
            ['reports', 'PDF + QR records'],
          ].map(([name, desc]) => (
            <div key={name} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
              <code className="text-xs font-bold text-blue-700 block mb-1">{name}</code>
              <span className="text-xs text-gray-500">{desc}</span>
            </div>
          ))}
        </div>

        {/* Transparency guarantee */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-blue-900 mb-3">Transparency Guarantee</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Immutable Evidence', 'Every original image/video, evidence crop, detection bbox and model version is stored permanently and never modified.'],
              ['Dispute Replay', 'Any inspection can be fully replayed: original media → evidence → detections → grading → scores → certificate.'],
              ['Model Provenance', 'Every onion detection is stamped with the exact model version and grading rule version used.'],
              ['Public Verification', 'Buyers scan QR to see the SAME stored results. Nothing is recalculated at verify time.'],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-900 text-sm">{title}</div>
                  <div className="text-xs text-blue-700 mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
