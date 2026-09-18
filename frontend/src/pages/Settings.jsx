import React from 'react'
import { PageHeader } from '../components/UI'
import useAuthStore from '../store/authStore'
import {
  Settings2, FlaskConical, TrendingUp, MapPin, BarChart2,
  Leaf, DollarSign, Users, Activity
} from 'lucide-react'

const COMING_SOON = [
  { icon: TrendingUp,  title: 'Quality Improvement Simulator',   desc: 'Simulate procurement decisions under different quality profiles.' },
  { icon: BarChart2,   title: 'Procurement Acceptance Predictor', desc: 'Predict acceptance probability before inspection.' },
  { icon: Activity,    title: 'AI Sorting Advisor',               desc: 'Real-time sorting guidance based on detected quality.' },
  { icon: Leaf,        title: 'Shelf-life Prediction',            desc: 'Estimate expected shelf life from quality data.' },
  { icon: FlaskConical,title: 'Storage Risk Prediction',          desc: 'Identify at-risk batches before storage.' },
  { icon: DollarSign,  title: 'Farmer Profit Simulator',          desc: 'Model pricing impact of quality improvements.' },
  { icon: Users,       title: 'Multi-Center Analytics',           desc: 'Consistency analysis across procurement centers.' },
  { icon: MapPin,      title: 'Geo-tagged Inspection',            desc: 'Location-stamped inspections for supply chain traceability.' },
]

export default function Settings() {
  const { user } = useAuthStore()

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Settings" subtitle="Application configuration and advanced features roadmap" />

      {/* Current config */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> System Information
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            ['Version', 'ONIONLENS 360 v1.0.0'],
            ['CV Engine', 'OpenCV 4.9 + Demo Inference Mode'],
            ['Model', 'ONIONLENS CV v1.0 (Demo)'],
            ['Database', 'SQLite (dev) → PostgreSQL (production)'],
            ['Confidence Gate (Accept)', '≥ 85%'],
            ['Confidence Gate (Review)', '60–84%'],
            ['Confidence Gate (Recapture)', '< 60%'],
            ['Frame Processing', 'Every 3s / N frames'],
            ['Max Frames / Onion', '3'],
            ['Logged in as', `${user?.username} (${user?.role})`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-gray-50 pb-2">
              <dt className="text-gray-500">{k}</dt>
              <dd className="font-medium text-gray-900 text-right">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Confidence weighting note */}
      <div className="card mb-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">Confidence Weighting</h3>
        <p className="text-xs text-blue-700 mb-3">
          Inspection confidence is computed from three components. Weights are configurable in production.
        </p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="text-lg font-bold text-blue-700">50%</div>
            <div className="text-gray-500 mt-1">AI Confidence</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="text-lg font-bold text-blue-700">25%</div>
            <div className="text-gray-500 mt-1">Image Quality</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="text-lg font-bold text-blue-700">25%</div>
            <div className="text-gray-500 mt-1">Frame Agreement</div>
          </div>
        </div>
      </div>

      {/* Advanced features roadmap */}
      <h3 className="font-semibold text-gray-900 mb-3">Advanced Features Roadmap</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {COMING_SOON.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card opacity-70 relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <span className="badge bg-gray-100 text-gray-500 text-xs">Coming Soon</span>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-gray-500" />
            </div>
            <h4 className="font-semibold text-gray-800 text-sm mb-1">{title}</h4>
            <p className="text-xs text-gray-500">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
