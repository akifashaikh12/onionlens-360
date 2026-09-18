import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { batchAPI, intelligenceAPI } from '../api/client'
import { PageHeader, GradeTag } from '../components/UI'
import LoadingSpinner from '../components/LoadingSpinner'
import DemoBanner from '../components/DemoBanner'
import {
  Brain, TrendingUp, ShieldCheck, AlertTriangle, DollarSign,
  ArrowUpRight, Info, BarChart2, Zap, CheckCircle
} from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'

const ScoreGauge = ({ value, max = 100, label, color }) => {
  const pct = Math.round((value / max) * 100)
  const colorMap = {
    green: { bar: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
    blue: { bar: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
    yellow: { bar: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50' },
    red: { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
    purple: { bar: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
  }
  const c = colorMap[color] || colorMap.blue
  return (
    <div className={`rounded-xl p-4 ${c.bg}`}>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className={`text-2xl font-bold ${c.text}`}>{value}<span className="text-sm font-normal">/100</span></span>
      </div>
      <div className="h-2 bg-white/60 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${c.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const SeverityChip = ({ severity }) => {
  const map = {
    Critical: 'bg-red-100 text-red-700',
    High: 'bg-orange-100 text-orange-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-blue-100 text-blue-700',
    None: 'bg-green-100 text-green-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[severity] || map.Low}`}>
      {severity}
    </span>
  )
}

export default function Intelligence() {
  const location = useLocation()
  const navigate = useNavigate()
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [intel, setIntel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [intelLoading, setIntelLoading] = useState(false)

  useEffect(() => {
    batchAPI.list()
      .then(r => {
        const done = r.data.filter(b => b.status === 'completed' && b.total_onions > 0)
        setBatches(done)
        const batchId = location.state?.batchId
        if (batchId) {
          const found = done.find(b => b.id === batchId)
          if (found) loadIntelligence(found)
          else if (done.length > 0) loadIntelligence(done[0])
        } else if (done.length > 0) {
          loadIntelligence(done[0])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const loadIntelligence = async (batch) => {
    setSelectedBatch(batch)
    setIntelLoading(true)
    try {
      const r = await intelligenceAPI.get(batch.id)
      setIntel(r.data)
    } catch {
      setIntel(null)
    } finally {
      setIntelLoading(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <PageHeader
        title="Intelligence Engine"
        subtitle="OHI · PRS · Procurement Analytics · Quality Insights"
      />

      {batches.length === 0 && (
        <div className="card text-center py-16">
          <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No completed inspections</h3>
          <p className="text-gray-400 mb-6">Complete an inspection first to generate intelligence insights.</p>
          <button onClick={() => navigate('/inspect')} className="btn-primary mx-auto">
            Start Inspection
          </button>
        </div>
      )}

      {batches.length > 0 && (
        <>
          {/* Batch selector */}
          <div className="flex gap-2 flex-wrap mb-6">
            {batches.map(b => (
              <button
                key={b.id}
                onClick={() => loadIntelligence(b)}
                className={`px-3 py-1.5 text-xs rounded-lg border font-mono transition-colors
                  ${selectedBatch?.id === b.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
              >
                {b.batch_code}
                {b.is_demo && ' [DEMO]'}
              </button>
            ))}
          </div>

          {intelLoading && <LoadingSpinner />}

          {intel && !intelLoading && (
            <>
              {intel.is_demo && <DemoBanner />}

              {/* Top scores row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <ScoreGauge value={intel.ohi} label="Onion Health Index (OHI)" color="green" />
                <ScoreGauge value={intel.prs} label="Procurement Readiness Score (PRS)" color="blue" />
                <ScoreGauge value={Math.round(100 - intel.defect_severity_index)} label="Quality Score (100−DSI)" color="purple" />
                <ScoreGauge value={intel.batch_uniformity_score} label="Batch Uniformity Score" color="yellow" />
              </div>

              {/* AI Confidence Meter + Acceptance Predictor */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="card">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" /> AI Confidence Meter
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 flex-shrink-0
                      ${intel.ai_confidence_meter.color === 'green' ? 'border-green-400 bg-green-50' :
                        intel.ai_confidence_meter.color === 'yellow' ? 'border-yellow-400 bg-yellow-50' :
                        'border-red-400 bg-red-50'}`}>
                      <div className="text-center">
                        <div className={`text-2xl font-bold
                          ${intel.ai_confidence_meter.color === 'green' ? 'text-green-700' :
                            intel.ai_confidence_meter.color === 'yellow' ? 'text-yellow-700' : 'text-red-700'}`}>
                          {intel.ai_confidence_meter.value.toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500">{intel.ai_confidence_meter.tier}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p className="font-medium mb-1">Inspection Confidence: {intel.ai_confidence_meter.tier}</p>
                      <p className="text-xs text-gray-500">
                        Composite of AI model confidence (50%), image quality (25%), and multi-frame agreement (25%).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" /> Procurement Acceptance Predictor
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 flex-shrink-0
                      ${intel.procurement_acceptance.recommendation === 'ACCEPT' ? 'border-green-400 bg-green-50' :
                        intel.procurement_acceptance.recommendation === 'CONDITIONAL' ? 'border-yellow-400 bg-yellow-50' :
                        'border-red-400 bg-red-50'}`}>
                      <div className="text-center">
                        <div className={`text-xl font-bold
                          ${intel.procurement_acceptance.recommendation === 'ACCEPT' ? 'text-green-700' :
                            intel.procurement_acceptance.recommendation === 'CONDITIONAL' ? 'text-yellow-700' : 'text-red-700'}`}>
                          {intel.procurement_acceptance.acceptance_probability}%
                        </div>
                        <div className="text-xs text-gray-500">accept</div>
                      </div>
                    </div>
                    <div>
                      <div className={`text-lg font-bold mb-1
                        ${intel.procurement_acceptance.recommendation === 'ACCEPT' ? 'text-green-700' :
                          intel.procurement_acceptance.recommendation === 'CONDITIONAL' ? 'text-yellow-700' : 'text-red-700'}`}>
                        {intel.procurement_acceptance.recommendation}
                      </div>
                      <p className="text-xs text-gray-500">
                        Confidence: {intel.procurement_acceptance.confidence_label}
                      </p>
                      <div className="mt-2">
                        <GradeTag grade={intel.final_grade} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Defect Narrative */}
              <div className="card mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" /> Defect Narrative
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4">
                  {intel.defect_narrative}
                </p>
              </div>

              {/* Sorting Advisor */}
              <div className="card mb-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-500" /> Sorting Advisor
                </h3>
                <div className="space-y-3">
                  {intel.sorting_advisor.map((s, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border
                      ${s.color === 'red' ? 'bg-red-50 border-red-100' :
                        s.color === 'orange' ? 'bg-orange-50 border-orange-100' :
                        s.color === 'yellow' ? 'bg-yellow-50 border-yellow-100' :
                        s.color === 'purple' ? 'bg-purple-50 border-purple-100' :
                        'bg-green-50 border-green-100'}`}>
                      <SeverityChip severity={s.priority} />
                      <div>
                        <div className="font-medium text-sm text-gray-900">{s.action}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{s.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Smart Rejection Analyzer + Profit Maximizer */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="card">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" /> Smart Rejection Analyzer
                  </h3>
                  <div className="text-sm mb-4">
                    <span className="font-bold text-2xl text-red-600">{intel.smart_rejection_analyzer.rejection_pct}%</span>
                    <span className="text-gray-500 ml-2">total rejection rate</span>
                    <span className="ml-2 text-gray-400">({intel.smart_rejection_analyzer.total_rejected} onions)</span>
                  </div>
                  {intel.smart_rejection_analyzer.causes.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {intel.smart_rejection_analyzer.causes.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <SeverityChip severity={c.severity} />
                            <span className="text-gray-700">{c.cause}</span>
                          </div>
                          <span className="font-medium">{c.count} ({c.pct}%)</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-green-600 mb-4">✓ No significant rejection causes</p>
                  )}
                  {intel.smart_rejection_analyzer.prevention_tips.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">Prevention Tips</p>
                      <ul className="space-y-1">
                        {intel.smart_rejection_analyzer.prevention_tips.map((t, i) => (
                          <li key={i} className="text-xs text-blue-700 flex gap-1.5">
                            <span>•</span><span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="card">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" /> Profit Maximizer
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-gray-500">Estimated Revenue</span>
                      <span className="font-bold text-green-700 text-lg">₹{intel.profit_maximizer.revenue_estimate.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500">Grade A Revenue</span>
                      <span className="font-medium text-green-600">₹{intel.profit_maximizer.revenue_grade_a.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500">URS Revenue</span>
                      <span className="font-medium text-yellow-600">₹{intel.profit_maximizer.revenue_urs.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500">Lost to Rejects</span>
                      <span className="font-medium text-red-600">−₹{intel.profit_maximizer.revenue_lost_to_rejects.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500">Max Potential</span>
                      <span className="font-medium">₹{intel.profit_maximizer.max_potential_revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-gray-500">Improvement Opportunity</span>
                      <span className="font-bold text-blue-600">+₹{intel.profit_maximizer.improvement_opportunity.toLocaleString()}</span>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Revenue Utilisation</span>
                        <span>{intel.profit_maximizer.utilisation_pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${intel.profit_maximizer.utilisation_pct}%` }} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">Prices: Grade A ₹{intel.profit_maximizer.price_per_kg_grade_a}/kg · URS ₹{intel.profit_maximizer.price_per_kg_urs}/kg</p>
                  </div>
                </div>
              </div>

              {/* Quality Improvement Simulator */}
              <div className="card mb-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" /> Quality Improvement Simulator
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {intel.quality_improvement_simulator.map((s, i) => (
                    <div key={i} className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                      <div className="font-semibold text-sm text-purple-900 mb-2">{s.name}</div>
                      <div className="text-xs text-gray-500 mb-3">{s.action}</div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Current Grade A</span>
                        <span className="font-medium">{s.base_grade_a}%</span>
                      </div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-500">Simulated Grade A</span>
                        <span className="font-bold text-purple-700">{s.simulated_grade_a}%</span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-semibold ${s.gain > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {s.gain > 0 ? <ArrowUpRight className="w-3 h-3" /> : null}
                        {s.gain > 0 ? `+${s.gain}% potential gain` : 'No significant gain'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Thresholds */}
              <div className="card mb-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500" /> Dynamic Threshold Check
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(intel.dynamic_thresholds).map(([key, t]) => (
                    <div key={key} className={`rounded-xl p-4 border ${t.exceeded ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="text-xs font-medium text-gray-500 mb-1 capitalize">{key.replace('_pct', ' %')}</div>
                      <div className={`text-2xl font-bold mb-1 ${t.exceeded ? 'text-red-700' : 'text-green-700'}`}>
                        {t.actual}%
                      </div>
                      <div className="text-xs text-gray-500">Limit: {t.limit}%</div>
                      <div className={`text-xs font-semibold mt-1 ${t.exceeded ? 'text-red-600' : 'text-green-600'}`}>
                        {t.exceeded ? `⚠ Exceeded by ${Math.abs(t.margin)}%` : `✓ ${t.margin}% margin`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Radar chart */}
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-500" /> Quality Radar
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={[
                    { metric: 'OHI', value: intel.ohi },
                    { metric: 'PRS', value: intel.prs },
                    { metric: 'Uniformity', value: intel.batch_uniformity_score },
                    { metric: 'Confidence', value: intel.ai_confidence_meter.value },
                    { metric: 'Quality (DSI)', value: 100 - intel.defect_severity_index },
                    { metric: 'Acceptance', value: intel.procurement_acceptance.acceptance_probability },
                  ]}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
