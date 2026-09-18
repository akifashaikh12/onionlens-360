import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { batchAPI, reportAPI } from '../api/client'
import { PageHeader, GradeTag } from '../components/UI'
import LoadingSpinner from '../components/LoadingSpinner'
import { FileText, Download, QrCode, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

export default function Reports() {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(null)
  const [reports, setReports] = useState({}) // batchId → report
  const navigate = useNavigate()

  useEffect(() => {
    batchAPI.list()
      .then(r => setBatches(r.data.filter(b => b.status === 'completed')))
      .finally(() => setLoading(false))
  }, [])

  const handleGenerate = async (batch) => {
    setGenerating(batch.id)
    try {
      const r = await reportAPI.generate(batch.id)
      setReports(prev => ({ ...prev, [batch.id]: r.data }))
    } finally {
      setGenerating(null)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Reports" subtitle="Generate and download digital quality inspection reports" />

      {batches.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No completed batches yet.</p>
          <button onClick={() => navigate('/inspect')} className="btn-primary mt-4 mx-auto">Start Inspection</button>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map(b => (
            <div key={b.id} className="card flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-medium text-blue-700">{b.batch_code}</span>
                  {b.is_demo && <span className="badge bg-amber-100 text-amber-700">DEMO</span>}
                  <GradeTag grade={b.final_grade} />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {b.total_onions} onions · {b.grade_a_pct?.toFixed(1)}% Grade A ·
                  {b.completed_at ? ` ${format(new Date(b.completed_at), 'dd MMM yyyy HH:mm')}` : ''}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {reports[b.id] ? (
                  <>
                    <a href={reportAPI.downloadUrl(b.id)} target="_blank" rel="noreferrer"
                       className="btn-primary text-xs">
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </a>
                    <a href={reportAPI.qrUrl(b.id)} target="_blank" rel="noreferrer"
                       className="btn-secondary text-xs">
                      <QrCode className="w-3.5 h-3.5" /> View QR
                    </a>
                  </>
                ) : (
                  <button
                    onClick={() => handleGenerate(b)}
                    disabled={generating === b.id}
                    className="btn-secondary text-xs"
                  >
                    {generating === b.id
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                      : <><FileText className="w-3.5 h-3.5" /> Generate Report</>
                    }
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
