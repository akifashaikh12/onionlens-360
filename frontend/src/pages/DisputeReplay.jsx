import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { batchAPI, inspectAPI } from '../api/client'
import { PageHeader, DefectBadge, GradeTag } from '../components/UI'
import LoadingSpinner from '../components/LoadingSpinner'
import DemoBanner from '../components/DemoBanner'
import { Repeat2, ChevronRight } from 'lucide-react'

export default function DisputeReplay() {
  const location = useLocation()
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [onions, setOnions] = useState([])
  const [selectedOnion, setSelectedOnion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onionLoading, setOnionLoading] = useState(false)

  useEffect(() => {
    batchAPI.list()
      .then(r => {
        const done = r.data.filter(b => b.total_onions > 0)
        setBatches(done)
        const batchId = location.state?.batchId
        if (batchId) {
          const found = done.find(b => b.id === batchId)
          if (found) loadBatch(found)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const loadBatch = async (batch) => {
    setSelectedBatch(batch)
    setSelectedOnion(null)
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
      <PageHeader
        title="Dispute Replay"
        subtitle="Full evidence trail for any batch or individual onion decision"
      />

      {!batches.length && (
        <div className="card text-center py-12">
          <Repeat2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No inspections available for replay. Run an inspection first.</p>
        </div>
      )}

      {batches.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Batch list */}
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Select Batch</h3>
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              {batches.map(b => (
                <button
                  key={b.id}
                  onClick={() => loadBatch(b)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors
                    ${selectedBatch?.id === b.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-medium text-blue-700">{b.batch_code}</span>
                    {b.is_demo && <span className="badge bg-amber-100 text-amber-700 text-xs">DEMO</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{b.total_onions} onions</span>
                    <GradeTag grade={b.final_grade} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Batch detail + onion list */}
          <div className="card overflow-hidden p-0">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">
                {selectedBatch ? `${selectedBatch.batch_code} — Onion Evidence` : 'Select a batch'}
              </h3>
            </div>
            {onionLoading ? <LoadingSpinner /> : (
              <div className="overflow-y-auto max-h-[600px]">
                {selectedBatch && onions.length === 0 && (
                  <div className="p-6 text-center text-gray-400 text-sm">No onion records.</div>
                )}
                {onions.map(o => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOnion(o)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors
                      ${selectedOnion?.id === o.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-gray-500">{o.onion_uid}</span>
                      <DefectBadge cls={o.defect_class} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">
                        {(o.inspection_confidence*100).toFixed(0)}% confidence
                      </span>
                      <span className="text-xs text-gray-400">
                        {o.frames_agreed}/{o.frame_count} frames
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Batch-level replay summary */}
            {selectedBatch && onions.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 mb-2">Batch Grading Chain</p>
                <div className="flex items-center gap-1 flex-wrap text-xs text-gray-600">
                  <span className="bg-white border border-gray-200 px-2 py-1 rounded">{selectedBatch.total_onions} analysed</span>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <span className="bg-green-50 border border-green-200 px-2 py-1 rounded text-green-700">{selectedBatch.healthy_count} healthy</span>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <span className="bg-orange-50 border border-orange-200 px-2 py-1 rounded text-orange-700">{selectedBatch.damaged_count} damaged</span>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <span className="bg-red-50 border border-red-200 px-2 py-1 rounded text-red-700">{selectedBatch.rotten_count} rotten</span>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <GradeTag grade={selectedBatch.final_grade} />
                </div>
              </div>
            )}
          </div>

          {/* Onion detail / frame replay */}
          <div className="card">
            {!selectedOnion ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                <Repeat2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
                Select an onion to replay its evidence
              </div>
            ) : (
              <OnionReplay onion={selectedOnion} batchCode={selectedBatch?.batch_code} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function OnionReplay({ onion, batchCode }) {
  const confPct = Math.round(onion.inspection_confidence * 100)
  const gateColor = confPct >= 85 ? 'text-green-600 bg-green-50 border-green-200'
                  : confPct >= 60 ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
                  : 'text-red-600 bg-red-50 border-red-200'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-gray-400 font-mono">{batchCode}</div>
          <div className="font-bold text-gray-900">Onion {onion.onion_uid}</div>
        </div>
        <DefectBadge cls={onion.defect_class} />
      </div>

      {/* Confidence gate */}
      <div className={`px-3 py-2 rounded-lg border text-xs font-semibold mb-4 ${gateColor}`}>
        Inspection Confidence: {confPct}%
        {confPct >= 85 ? ' — ACCEPT' : confPct >= 60 ? ' — REVIEW' : ' — RECAPTURE'}
      </div>

      {/* Multi-frame replay */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">
          Frame Consensus ({onion.frames_agreed}/{onion.frame_count} agree)
        </p>
        {onion.frame_classifications?.map((fc, i) => {
          const agrees = fc.class === onion.defect_class
          return (
            <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg mb-1
              ${agrees ? 'bg-green-50 border border-green-100' : 'bg-orange-50 border border-orange-100'}`}>
              <span className="text-xs text-gray-500">Frame {fc.frame}</span>
              <DefectBadge cls={fc.class} />
              <span className={`text-xs font-medium ${agrees ? 'text-green-600' : 'text-orange-600'}`}>
                {(fc.confidence*100).toFixed(0)}% {agrees ? '✓' : '⚠'}
              </span>
            </div>
          )
        })}
        {onion.frames_agreed === onion.frame_count ? (
          <p className="text-xs text-green-600 font-medium mt-1">✓ Stable classification — {onion.frame_count}/{onion.frame_count} frames agree</p>
        ) : (
          <p className="text-xs text-orange-600 font-medium mt-1">⚠ Partial agreement — additional frame may improve confidence</p>
        )}
      </div>

      {/* Measurement */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between py-1.5 border-b border-gray-50">
          <span className="text-gray-500">AI Confidence</span>
          <span className="font-medium">{(onion.confidence*100).toFixed(0)}%</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-gray-50">
          <span className="text-gray-500">Image Quality</span>
          <span className="font-medium">{(onion.image_quality*100).toFixed(0)}%</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-gray-50">
          <span className="text-gray-500">Frame Agreement</span>
          <span className="font-medium">{(onion.frame_agreement*100).toFixed(0)}%</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-gray-50">
          <span className="text-gray-500">Size Category</span>
          <span className="font-medium capitalize">{onion.size_category}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-gray-50">
          <span className="text-gray-500">Pixel Size</span>
          <span className="font-medium">{onion.pixel_width?.toFixed(0)} × {onion.pixel_height?.toFixed(0)} px</span>
        </div>
        {onion.physical_width_mm ? (
          <div className="flex justify-between py-1.5 border-b border-gray-50">
            <span className="text-gray-500">Physical Size</span>
            <span className="font-medium">{onion.physical_width_mm?.toFixed(1)} × {onion.physical_height_mm?.toFixed(1)} mm</span>
          </div>
        ) : (
          <div className="text-gray-400 italic text-xs py-1.5 border-b border-gray-50">
            Physical measurement requires calibration reference.
          </div>
        )}
        <div className="flex justify-between py-1.5">
          <span className="text-gray-500">Final Decision</span>
          <span className={`font-bold capitalize ${
            onion.final_decision === 'accept' ? 'text-green-600' :
            onion.final_decision === 'review' ? 'text-yellow-600' : 'text-red-600'
          }`}>{onion.final_decision}</span>
        </div>
      </div>

      {/* Confidence calculation explanation */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 mb-2">Confidence Calculation</p>
        <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1 font-mono">
          <div className="flex justify-between"><span className="text-gray-500">AI confidence (×0.5)</span><span>{(onion.confidence*100).toFixed(0)}%</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Image quality (×0.25)</span><span>{(onion.image_quality*100).toFixed(0)}%</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Frame agreement (×0.25)</span><span>{(onion.frame_agreement*100).toFixed(0)}%</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-1 font-bold">
            <span>= Inspection Confidence</span>
            <span className={confPct >= 85 ? 'text-green-600' : 'text-yellow-600'}>{confPct}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
