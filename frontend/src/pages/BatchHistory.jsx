import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { batchAPI } from '../api/client'
import { PageHeader, GradeTag } from '../components/UI'
import LoadingSpinner from '../components/LoadingSpinner'
import { Archive, Play, BarChart2 } from 'lucide-react'
import { format } from 'date-fns'

export default function BatchHistory() {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    batchAPI.list()
      .then(r => setBatches(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Batch History" subtitle="All inspection batches">
        <button onClick={() => navigate('/inspect')} className="btn-primary">
          <Play className="w-4 h-4" /> New Inspection
        </button>
      </PageHeader>

      {batches.length === 0 ? (
        <div className="card text-center py-16">
          <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No batches yet</h3>
          <p className="text-gray-400 mb-6">Start an inspection to see results here.</p>
          <button onClick={() => navigate('/inspect')} className="btn-primary mx-auto">Start Inspection</button>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-xs text-gray-500">
                  <th className="text-left py-3 px-4 font-medium">Batch ID</th>
                  <th className="text-left py-3 px-4 font-medium">Mode</th>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-right py-3 px-4 font-medium">Onions</th>
                  <th className="text-right py-3 px-4 font-medium">Grade A</th>
                  <th className="text-right py-3 px-4 font-medium">URS</th>
                  <th className="text-right py-3 px-4 font-medium">Reject</th>
                  <th className="text-right py-3 px-4 font-medium">Confidence</th>
                  <th className="text-left py-3 px-4 font-medium">Grade</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => (
                  <tr key={b.id}
                    className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/batches/${b.id}`)}>
                    <td className="py-3 px-4 font-mono text-xs text-blue-700 font-medium">
                      {b.batch_code}
                      {b.is_demo && <span className="ml-2 badge bg-amber-100 text-amber-700 text-xs">DEMO</span>}
                    </td>
                    <td className="py-3 px-4 capitalize text-gray-600">{b.inspection_mode}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {b.started_at ? format(new Date(b.started_at), 'dd MMM yyyy HH:mm') : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{b.total_onions}</td>
                    <td className="py-3 px-4 text-right text-green-600 font-medium">{b.grade_a_pct?.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right text-yellow-600 font-medium">{b.urs_pct?.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right text-red-600 font-medium">{b.reject_pct?.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right text-gray-600">{(b.inspection_confidence * 100).toFixed(0)}%</td>
                    <td className="py-3 px-4"><GradeTag grade={b.final_grade} /></td>
                    <td className="py-3 px-4">
                      <span className={`badge ${b.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {b.status}
                      </span>
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
