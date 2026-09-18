import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { batchAPI, inspectAPI } from '../api/client'
import { PageHeader, DefectBadge, ConfidenceBar } from '../components/UI'
import LoadingSpinner from '../components/LoadingSpinner'
import { Images, Archive } from 'lucide-react'

export default function EvidenceGallery() {
  const location = useLocation()
  const navigate = useNavigate()
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [onions, setOnions] = useState([])
  const [loading, setLoading] = useState(true)
  const [onionLoading, setOnionLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    batchAPI.list()
      .then(r => {
        const completed = r.data.filter(b => b.status === 'completed' || b.total_onions > 0)
        setBatches(completed)
        const batchId = location.state?.batchId
        if (batchId) {
          const found = completed.find(b => b.id === batchId)
          if (found) loadBatch(found)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const loadBatch = async (batch) => {
    setSelectedBatch(batch)
    setOnionLoading(true)
    try {
      const r = await inspectAPI.getOnions(batch.id)
      setOnions(r.data)
    } finally {
      setOnionLoading(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Evidence Gallery" subtitle="Inspection evidence for each detected onion" />

      <div className="flex gap-4 flex-wrap mb-6">
        {batches.length === 0 && (
          <div className="card text-center py-12 w-full">
            <Images className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No inspection data yet. Run an inspection to see evidence.</p>
          </div>
        )}
        {/* Batch selector */}
        {batches.length > 0 && (
          <div className="w-full flex gap-2 flex-wrap">
            {batches.map(b => (
              <button
                key={b.id}
                onClick={() => loadBatch(b)}
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
        )}
      </div>

      {onionLoading && <LoadingSpinner />}

      {selectedBatch && !onionLoading && onions.length === 0 && (
        <div className="card text-center py-8 text-gray-400">No onion records for this batch.</div>
      )}

      {onions.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {onions.map(o => (
              <div
                key={o.id}
                onClick={() => setSelected(o)}
                className="card p-3 cursor-pointer hover:shadow-md transition-shadow hover:border-blue-200"
              >
                {/* Evidence image placeholder */}
                <div className="w-full h-24 bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                  {o.best_frame_path ? (
                    <img
                      src={`/evidence/${o.best_frame_path.split('/').pop()}`}
                      alt={`Onion ${o.onion_uid}`}
                      className="w-full h-full object-cover rounded-lg"
                      onError={e => { e.target.style.display='none' }}
                    />
                  ) : (
                    <OnionSvg cls={o.defect_class} />
                  )}
                </div>
                <div className="text-xs font-mono text-gray-400 mb-1">{o.onion_uid}</div>
                <DefectBadge cls={o.defect_class} />
                <div className="text-xs text-gray-400 mt-1">{(o.confidence*100).toFixed(0)}% conf</div>
              </div>
            ))}
          </div>

          {/* Onion detail modal */}
          {selected && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                 onClick={() => setSelected(null)}>
              <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Onion {selected.onion_uid}</h3>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                </div>

                {/* Evidence image */}
                <div className="w-full h-40 bg-gray-100 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                  {selected.best_frame_path ? (
                    <img
                      src={`/evidence/${selected.best_frame_path.split('/').pop()}`}
                      alt="Evidence"
                      className="w-full h-full object-contain"
                      onError={e => { e.target.style.display='none' }}
                    />
                  ) : (
                    <OnionSvg cls={selected.defect_class} size={80} />
                  )}
                </div>

                <dl className="space-y-2 text-sm">
                  {[
                    ['Classification', <DefectBadge cls={selected.defect_class} />],
                    ['AI Confidence', `${(selected.confidence*100).toFixed(0)}%`],
                    ['Image Quality', `${(selected.image_quality*100).toFixed(0)}%`],
                    ['Frame Agreement', `${selected.frames_agreed}/${selected.frame_count} frames agree`],
                    ['Inspection Confidence', `${(selected.inspection_confidence*100).toFixed(0)}%`],
                    ['Size Category', selected.size_category],
                    ['Pixel Size', `${selected.pixel_width?.toFixed(0)}×${selected.pixel_height?.toFixed(0)}px`],
                    ['Physical Size', selected.physical_width_mm
                      ? `${selected.physical_width_mm?.toFixed(1)}×${selected.physical_height_mm?.toFixed(1)}mm`
                      : 'Physical measurement requires calibration reference.'],
                    ['Decision', selected.final_decision],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center">
                      <dt className="text-gray-500">{k}</dt>
                      <dd className="font-medium text-gray-900 text-right">{v}</dd>
                    </div>
                  ))}
                </dl>

                {/* Multi-frame breakdown */}
                {selected.frame_classifications?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Multi-frame consensus</p>
                    {selected.frame_classifications.map((fc, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1">
                        <span className="text-gray-400">Frame {fc.frame}</span>
                        <DefectBadge cls={fc.class} />
                        <span className="text-gray-400">{(fc.confidence*100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function OnionSvg({ cls, size = 56 }) {
  const colors = {
    healthy: '#86efac', damaged: '#fdba74', rotten: '#fca5a5',
    sprouted: '#fde68a', undersized: '#d8b4fe', unknown: '#e5e7eb'
  }
  const fill = colors[cls] || '#e5e7eb'
  return (
    <svg width={size} height={size} viewBox="0 0 56 56">
      <ellipse cx="28" cy="28" rx="22" ry="22" fill={fill} />
      <ellipse cx="28" cy="28" rx="14" ry="18" fill={fill} opacity="0.6" />
    </svg>
  )
}
