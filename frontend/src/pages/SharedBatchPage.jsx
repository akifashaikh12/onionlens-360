import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { shareAPI, reportAPI } from '../api/client'
import { Layers, CheckCircle, AlertTriangle, Download, Shield } from 'lucide-react'

const DEFECT_COLORS = {
  healthy: 'bg-green-100 text-green-700',
  damaged: 'bg-orange-100 text-orange-700',
  rotten: 'bg-red-100 text-red-700',
  sprouted: 'bg-yellow-100 text-yellow-700',
  undersized: 'bg-purple-100 text-purple-700',
  unknown: 'bg-gray-100 text-gray-600',
}

export default function SharedBatchPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    shareAPI.get(token)
      .then(r => setData(r.data))
      .catch(() => setError('Share link not found or has expired.'))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" style={{ fontFamily: '-apple-system, "Segoe UI", system-ui, sans-serif' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3 shadow-lg">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">ONIONLENS 360</h1>
          <p className="text-gray-500 text-sm">Shared Inspection — Read-Only Verified View</p>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
            Loading…
          </div>
        )}

        {error && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* Verification badge */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
              <div>
                <div className="font-bold text-green-800">Verified — Stored Result</div>
                <div className="text-xs text-green-700">
                  This data was stored at inspection time and has not been recalculated.
                  {data.is_demo && ' ⚠ DEMO DATA — Not for commercial use.'}
                </div>
              </div>
            </div>

            {data.is_demo && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4 text-xs text-amber-700 font-medium">
                DEMO DATA — This report is generated from sample data for demonstration purposes only.
              </div>
            )}

            {/* Main result card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="font-mono text-sm text-blue-700 font-bold">{data.batch_code}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {data.inspection_date ? new Date(data.inspection_date).toLocaleString() : 'N/A'}
                  </div>
                </div>
                <div className={`text-3xl font-extrabold
                  ${data.final_grade === 'A' ? 'text-green-600' :
                    data.final_grade === 'URS' ? 'text-yellow-600' : 'text-red-600'}`}>
                  {data.final_grade || 'N/A'}
                </div>
              </div>

              {/* Grade bars */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Grade A', value: data.grade_a_pct, color: 'green' },
                  { label: 'URS', value: data.urs_pct, color: 'yellow' },
                  { label: 'Reject', value: data.reject_pct, color: 'red' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <div className={`text-2xl font-bold text-${color}-600`}>{value?.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full bg-${color}-500 rounded-full`} style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <dl className="space-y-2.5 text-sm">
                {[
                  ['Total Onions', data.total_onions],
                  ['Inspection Mode', data.inspection_mode],
                  ['Inspection Confidence', `${(data.inspection_confidence * 100).toFixed(0)}%`],
                  ['Batch Uniformity', `${(data.uniformity_score * 100).toFixed(0)}%`],
                  ['Standard', `${data.standard_name} ${data.standard_version}`],
                  ['Model Version', data.model_version],
                  ['Verification Status', data.verification_status],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-gray-50 pb-2">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="font-medium text-gray-900 text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Defect breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
              <h3 className="font-semibold text-gray-900 mb-4">Defect Distribution</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Healthy', data.healthy_count, 'healthy'],
                  ['Damaged', data.damaged_count, 'damaged'],
                  ['Rotten', data.rotten_count, 'rotten'],
                  ['Sprouted', data.sprouted_count, 'sprouted'],
                  ['Undersized', data.undersized_count, 'undersized'],
                ].map(([label, count, cls]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DEFECT_COLORS[cls]}`}>{label}</span>
                    <span className="font-medium text-gray-900">
                      {count} ({data.total_onions > 0 ? (count / data.total_onions * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence frames (if any) */}
            {data.evidence_frames?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
                <h3 className="font-semibold text-gray-900 mb-4">Evidence (up to 20 onions)</h3>
                <div className="grid grid-cols-4 gap-2">
                  {data.evidence_frames.map((ef, i) => (
                    <div key={i} className="text-center">
                      <div className="w-full h-16 bg-gray-100 rounded-lg overflow-hidden mb-1 flex items-center justify-center">
                        {ef.evidence_filename ? (
                          <img
                            src={`/storage/evidence/${ef.evidence_filename}`}
                            alt={ef.onion_uid}
                            className="w-full h-full object-cover"
                            onError={e => { e.target.style.display='none' }}
                          />
                        ) : (
                          <div className="text-gray-300 text-xs">N/A</div>
                        )}
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${DEFECT_COLORS[ef.defect_class]}`}>
                        {ef.defect_class}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Integrity notice */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 flex gap-3">
              <Shield className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <p>
                This is a read-only view of the stored inspection record. The results shown here are identical to those
                in the original certificate and have not been recalculated or modified.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
