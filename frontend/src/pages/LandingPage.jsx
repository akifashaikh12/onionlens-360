import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layers, Camera, CheckCircle, BarChart2, FileText, Shield,
  ChevronRight, Zap, Globe, Lock, ArrowRight
} from 'lucide-react'

const FEATURES = [
  {
    icon: Camera,
    title: 'Multi-Mode Capture',
    desc: 'Live camera, image upload, video upload, conveyor/batch mode — any input source supported.',
  },
  {
    icon: Zap,
    title: 'AI Detection & Classification',
    desc: 'YOLO + OpenCV + ByteTrack detects, counts and classifies: Healthy, Damaged, Rotten, Sprouted, Undersized.',
  },
  {
    icon: BarChart2,
    title: 'Intelligence Engine',
    desc: 'OHI, PRS, Defect Severity Index, Uniformity Score, Sorting Advisor, Profit Maximizer and more.',
  },
  {
    icon: FileText,
    title: 'Digital Batch Passport',
    desc: 'Downloadable PDF certificate + QR code with full evidence, grades, scores and audit trail.',
  },
  {
    icon: Globe,
    title: 'Transparent Verification',
    desc: 'Buyers scan QR to verify the same stored results — nothing is recalculated.',
  },
  {
    icon: Lock,
    title: 'Secure & Auditable',
    desc: 'Role-based auth, immutable evidence records, dispute replay and full model version traceability.',
  },
]

const FLOW_STEPS = [
  { step: '01', label: 'Capture', desc: 'Camera / Upload / Video' },
  { step: '02', label: 'Detect', desc: 'YOLO + OpenCV + ByteTrack' },
  { step: '03', label: 'Classify', desc: 'Healthy / Damaged / Rotten…' },
  { step: '04', label: 'Grade', desc: 'Standards Engine' },
  { step: '05', label: 'Insights', desc: 'OHI · PRS · Analytics' },
  { step: '06', label: 'Certify', desc: 'PDF + QR Passport' },
  { step: '07', label: 'Share', desc: 'Buyer Verification' },
]

const STATS = [
  { value: '6', label: 'Defect Classes' },
  { value: '12+', label: 'Intelligence Metrics' },
  { value: '100%', label: 'Evidence Stored' },
  { value: '0', label: 'LLM Calls' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: '-apple-system, "Segoe UI", system-ui, sans-serif' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Layers className="w-4.5 h-4.5 text-white w-5 h-5" />
            </div>
            <span className="font-bold text-gray-900">ONIONLENS 360</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5">
              Sign in
            </button>
            <button onClick={() => navigate('/login')} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-blue-100">
          <Zap className="w-3.5 h-3.5" /> SIH 2026 Problem Statement #26031
        </div>
        <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-4 max-w-4xl mx-auto">
          From any camera to a trusted,<br />
          <span className="text-blue-600">evidence-backed procurement decision.</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
          ONIONLENS 360 is an AI-powered onion quality assessment platform that detects, classifies,
          grades and certifies onion batches with full transparency and audit trails.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 text-sm"
          >
            Open Demo App <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/tech')}
            className="bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors text-sm border border-gray-200"
          >
            Technical Approach
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gray-50 border-y border-gray-100 py-10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-blue-600">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Flow */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">Inspection Pipeline</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {FLOW_STEPS.map((s, i) => (
            <React.Fragment key={s.step}>
              <div className="flex flex-col items-center text-center w-32">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-2">
                  <span className="text-white font-bold text-sm">{s.step}</span>
                </div>
                <div className="font-semibold text-sm text-gray-900">{s.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.desc}</div>
              </div>
              {i < FLOW_STEPS.length - 1 && (
                <div className="flex items-center pt-2">
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">Platform Capabilities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo flow */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Try the Full Demo Flow</h2>
        <p className="text-gray-500 text-center mb-10">No hardware required — fully working with synthetic demo data.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            ['1. Sign in', 'Use admin / admin123 or inspector / inspect123'],
            ['2. New Inspection', 'Run Demo Batch — 20 synthetic onions processed instantly'],
            ['3. View Results', 'Grade A%, URS%, Reject%, per-onion detections'],
            ['4. Intelligence', 'OHI, PRS, Profit Maximizer, Sorting Advisor'],
            ['5. Certificate', 'Generate PDF report with QR code'],
            ['6. Share & Verify', 'Send share link — buyer sees same stored results'],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-4 items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900 text-sm">{title}</div>
                <div className="text-gray-500 text-sm">{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors inline-flex items-center gap-2"
          >
            Open Platform <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center">
        <p className="text-sm text-gray-400">
          ONIONLENS 360 · SIH 2026 · Built with Next.js + FastAPI + OpenCV + YOLO
        </p>
        <p className="text-xs text-gray-300 mt-1">
          Demo mode — deterministic inference. Swap <code className="bg-gray-100 px-1 rounded">demo_inference()</code> for real YOLO weights in production.
        </p>
      </footer>
    </div>
  )
}
