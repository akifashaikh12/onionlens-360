import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { batchAPI, reportAPI, inspectAPI, shareAPI } from '../api/client'
import { PageHeader, GradeTag, DefectBadge, ConfidenceBar } from '../components/UI'
import DemoBanner from '../components/DemoBanner'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  FileText, QrCode, Repeat2, Images, Download, Brain,
  Share2, Copy, Check
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

const DEFECT_COLORS = {
  healthy: '#16a34a', damaged: '#ea580c', rotten: '#dc2626',
  sprouted: '#ca8a04', undersized: '#9333ea', unknown: '#9ca3af'
}

export default function BatchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [batch, setBatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState(null)
  const [qrUrl, setQrUrl] = useState(null)
  const [showQr, setShowQr] = useState(false)
  const [shareLink, setShareLink] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    batchAPI.get(id)
      .then(r => setBatch(r.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner />
  if (!batch) return <div className="p-8 text-gray-500">Batch not found.</div>

  const defectData = [
    { name: 'Healthy', value: batch.healthy_count, fill: '#16a34a' },
    { name: 'Damaged', value: batch.damaged_count, fill: '#ea580c' },
    { name: 'Rotten', value: batch.rotten_count, fill: '#dc2626' },
    { name: 'Sprouted', value: batch.sprouted_count, fill: '#ca8a04' },
    { name: 'Undersized', value: batch.undersized_count, fill: '#9333ea' },
    { name: 'Unknown', value: batch.unknown_count, fill: '#9ca3af' },
  ].filter(d => d.value > 0)

  const handleGenerateReport = async () => {
    setGenerating(true)
    try {
      const r = await reportAPI.generate(batch.id)
      setReport(r.data)
    } finally {
      setGenerating(false)
    }
  }

  const handleShowQr = async () => {
    if (!report) await handleGenerateReport()
    setQrUrl(reportAPI.qrUrl(batch.id))
    setShowQr(true)
  }

  const handleShare = async () => {
    try {
      const r = await shareAPI.create(batch.id)
      const url = `${window.location.origin}/share/${r.data.share_token}`
      setShareLink(url)
    } catch {}
  }

  const handleCopy = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={batch.batch_code}
        subtitle={`Inspection · ${batch.completed_at ? format(new Date(batch.completed_at), 'dd MMM yyyy HH:mm') : 'In progress'}`}
      >
        <button onClick={() => navigate('/dispute', { state: { batchId: batch.id } })} className="btn-secondary">
          <Repeat2 className="w-4 h-4" /> Dispute Replay
        </button>
        <button onClick={() => navigate('/evidence', { state: { batchId: batch.id } })} className="btn-secondary">
          <Images className="w-4 h-4" /> Evidence
        </button>
      </PageHeader>

      {batch.is_demo && <DemoBanner />}

      {/* Grade banner */}
      <div className="card mb-6 flex items-center gap-6 flex-wrap">
        <div className="text-center min-w-[80px]">
          <div className={`text-5xl font-extrabold ${batch.final_grade==='A'?'text-green-600':batch.final_grade==='URS'?'text-yellow-600':'text-red-600'}`}>
            {batch.final_grade || 'N/A'}
          </div>
          <div className="text-sm text-gray-500 mt-1">Final Grade</div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-4 text-center min-w-[240px]">
          <div>
            <div className="text-2xl font-bold text-green-600">{batch.grade_a_pct?.toFixed(1)}%</div>
            <div className="text-xs text-gray-500">Grade A</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{batch.urs_pct?.toFixed(1)}%</div>
            <div className="text-xs text-gray-500">URS</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{batch.reject_pct?.toFixed(1)}%</div>
            <div className="text-xs text-gray-500">Reject</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-xl font-bold text-gray-900">{batch.total_onions}</div>
            <div className="text-xs text-gray-500">Total Inspected</div>
          </div>
          <div>
            <div className="text-xl font-bold text-blue-600">{(batch.inspection_confidence * 100).toFixed(0)}%</div>
            <div className="text-xs text-gray-500">Confidence</div>
          </div>
          <div>
            <div className="text-xl font-bold text-purple-600">{(batch.uniformity_score * 100).toFixed(0)}%</div>
            <div className="text-xs text-gray-500">Uniformity</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 capitalize">{batch.inspection_mode}</div>
            <div className="text-xs text-gray-500">Mode</div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={handleGenerateReport} disabled={generating} className="btn-primary">
          <FileText className="w-4 h-4" />
          {generating ? 'Generating…' : 'Generate Report'}
        </button>
        {report && (
          <a href={reportAPI.downloadUrl(batch.id)} target="_blank" rel="noreferrer" className="btn-secondary">
            <Download className="w-4 h-4" /> Download PDF
          </a>
        )}
        <button onClick={handleShowQr} className="btn-secondary">
          <QrCode className="w-4 h-4" /> Generate QR
        </button>
        <button onClick={() => navigate('/evidence', { state: { batchId: batch.id } })} className="btn-secondary">
          <Images className="w-4 h-4" /> View Evidence
        </button>
        <button onClick={() => navigate('/dispute', { state: { batchId: batch.id } })} className="btn-secondary">
          <Repeat2 className="w-4 h-4" /> Dispute Replay
        </button>
        <button onClick={() => navigate('/intelligence', { state: { batchId: batch.id } })} className="btn-secondary">
          <Brain className="w-4 h-4" /> Intelligence
        </button>
        <button onClick={handleShare} className="btn-secondary">
          <Share2 className="w-4 h-4" /> Create Share Link
        </button>
      </div>

      {/* Share link UI */}
      {shareLink && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-700 font-semibold mb-1">Share link created — read-only public view</p>
            <p className="text-xs font-mono text-blue-900 truncate">{shareLink}</p>
          </div>
          <button onClick={handleCopy} className="btn-secondary text-xs flex-shrink-0">
            {copied ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </button>
          <a href={shareLink} target="_blank" rel="noreferrer" className="btn-primary text-xs flex-shrink-0">Open</a>
        </div>
      )}

      {/* QR modal */}
      {showQr && qrUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
             onClick={() => setShowQr(false)}>
          <div className="bg-white rounded-2xl p-8 shadow-xl max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-2">Digital Batch Passport</h3>
            <p className="text-xs text-gray-500 mb-4 font-mono">{batch.batch_code}</p>
            <img src={qrUrl} alt="QR Code" className="mx-auto mb-4 rounded-lg border border-gray-200" />
            <p className="text-xs text-gray-400">Scan to verify batch on the public verification page.</p>
            <button onClick={() => setShowQr(false)} className="mt-4 text-sm text-blue-600 hover:underline">Close</button>
          </div>
        </div>
      )}

      {/* Defect breakdown + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Defect Distribution</h3>
          {defectData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={defectData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({name, value}) => `${name}: ${value}`}>
                  {defectData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="text-center text-gray-400 py-8">No data</div>}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Inspection Details</h3>
          <dl className="space-y-3 text-sm">
            {[
              ['Batch Code', batch.batch_code],
              ['Standard', `ID ${batch.standard_id || 'Default Demo'}`],
              ['Calibration', batch.calibration_active ? 'ArUco Active' : 'Relative sizing'],
              ['Healthy', `${batch.healthy_count} (${batch.healthy_pct?.toFixed(1)}%)`],
              ['Damaged', `${batch.damaged_count}`],
              ['Rotten', `${batch.rotten_count}`],
              ['Sprouted', `${batch.sprouted_count}`],
              ['Undersized', `${batch.undersized_count}`],
              ['Unknown', `${batch.unknown_count}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-gray-500">{k}</dt>
                <dd className="font-medium text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Onion list */}
      {batch.onions?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">
            Onion Records ({batch.onions.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="text-left py-2 pr-3 font-medium">ID</th>
                  <th className="text-left py-2 pr-3 font-medium">Classification</th>
                  <th className="text-right py-2 pr-3 font-medium">Confidence</th>
                  <th className="text-left py-2 pr-3 font-medium">Size</th>
                  <th className="text-right py-2 pr-3 font-medium">Frames</th>
                  <th className="text-left py-2 font-medium">Decision</th>
                </tr>
              </thead>
              <tbody>
                {batch.onions.map(o => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-3 font-mono text-gray-400">{o.onion_uid}</td>
                    <td className="py-2 pr-3"><DefectBadge cls={o.defect_class} /></td>
                    <td className="py-2 pr-3 text-right">{(o.confidence * 100).toFixed(0)}%</td>
                    <td className="py-2 pr-3 capitalize text-gray-600">{o.size_category}</td>
                    <td className="py-2 pr-3 text-right">{o.frames_agreed}/{o.frame_count}</td>
                    <td className="py-2">
                      <span className={`badge ${
                        o.final_decision === 'accept' ? 'bg-green-100 text-green-700' :
                        o.final_decision === 'review' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{o.final_decision}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
