import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { verifyAPI } from '../api/client'
import { Layers, CheckCircle, AlertTriangle } from 'lucide-react'

export default function VerifyPage() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    verifyAPI.verify(token)
      .then(r => setData(r.data))
      .catch(() => setError('Verification token not found or expired.'))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3 shadow-lg">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">ONIONLENS 360</h1>
          <p className="text-gray-500 text-sm">Digital Batch Passport Verification</p>
        </div>

        {loading && (
          <div className="card text-center py-8 text-gray-400">Verifying…</div>
        )}

        {error && (
          <div className="card text-center py-8">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {data && (
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <div className="font-bold text-gray-900">Verified</div>
                <div className="text-xs text-gray-400">{data.verification_status}</div>
              </div>
              {data.is_demo && (
                <span className="ml-auto badge bg-amber-100 text-amber-700">DEMO DATA</span>
              )}
            </div>

            <dl className="space-y-3 text-sm">
              {[
                ['Batch ID', data.batch_id],
                ['Inspection Date', data.inspection_date ? new Date(data.inspection_date).toLocaleString() : 'N/A'],
                ['Final Grade', data.final_grade],
                ['Grade A %', `${data.grade_a_pct?.toFixed(1)}%`],
                ['URS %', `${data.urs_pct?.toFixed(1)}%`],
                ['Reject %', `${data.reject_pct?.toFixed(1)}%`],
                ['Confidence', `${(data.inspection_confidence * 100).toFixed(0)}%`],
                ['Standard', `${data.standard_name} ${data.standard_version}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-gray-50 pb-2">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className={`font-medium ${k==='Final Grade' ?
                    (data.final_grade==='A'?'text-green-600':data.final_grade==='URS'?'text-yellow-600':'text-red-600')
                    : 'text-gray-900'}`}>{v}</dd>
                </div>
              ))}
            </dl>

            {data.note && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                {data.note}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
