import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart2, CheckCircle, AlertTriangle, XCircle,
  TrendingUp, Users, Activity, Award
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'
import { batchAPI } from '../api/client'
import { StatCard, PageHeader, GradeTag } from '../components/UI'
import LoadingSpinner from '../components/LoadingSpinner'
import { useNavigate as useNav } from 'react-router-dom'

const GRADE_COLORS = { A: '#16a34a', URS: '#ca8a04', REJECT: '#dc2626' }
const DEFECT_COLORS = {
  healthy: '#16a34a', damaged: '#ea580c', rotten: '#dc2626',
  sprouted: '#ca8a04', undersized: '#9333ea', unknown: '#9ca3af'
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    batchAPI.dashboard()
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  if (!stats || stats.total_batches === 0) {
    return (
      <div className="p-8">
        <PageHeader title="Dashboard" subtitle="Quality overview across all inspections" />
        <div className="card text-center py-16">
          <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No inspections yet</h3>
          <p className="text-gray-400 mb-6">Run your first inspection to see dashboard data.</p>
          <button onClick={() => navigate('/inspect')} className="btn-primary mx-auto">
            Start Inspection
          </button>
        </div>
      </div>
    )
  }

  const defectData = Object.entries(stats.defect_distribution || {}).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1), value: v, fill: DEFECT_COLORS[k]
  })).filter(d => d.value > 0)

  const gradeData = Object.entries(stats.grade_distribution || {}).map(([k, v]) => ({
    name: k, value: v, fill: GRADE_COLORS[k]
  }))

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <PageHeader
        title="Dashboard"
        subtitle="Quality overview across all inspections"
      >
        <button onClick={() => navigate('/inspect')} className="btn-primary">
          <Activity className="w-4 h-4" /> New Inspection
        </button>
      </PageHeader>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Batches" value={stats.total_batches} icon={BarChart2} color="blue" />
        <StatCard label="Total Onions" value={stats.total_onions.toLocaleString()} icon={Users} color="purple" />
        <StatCard label="Avg. Grade A" value={`${stats.avg_grade_a_pct?.toFixed(1)}%`} icon={Award} color="green" />
        <StatCard label="Avg. Confidence" value={`${(stats.avg_confidence * 100)?.toFixed(0)}%`} icon={TrendingUp} color="blue" />
      </div>

      {/* Quality summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600 mb-1">{stats.avg_grade_a_pct?.toFixed(1)}%</div>
          <div className="text-sm text-gray-500 font-medium">Grade A</div>
          <div className="mt-2 w-full bg-green-100 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{width:`${stats.avg_grade_a_pct}%`}} />
          </div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-yellow-600 mb-1">{stats.avg_urs_pct?.toFixed(1)}%</div>
          <div className="text-sm text-gray-500 font-medium">URS</div>
          <div className="mt-2 w-full bg-yellow-100 rounded-full h-2">
            <div className="bg-yellow-500 h-2 rounded-full" style={{width:`${stats.avg_urs_pct}%`}} />
          </div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-red-600 mb-1">{stats.avg_reject_pct?.toFixed(1)}%</div>
          <div className="text-sm text-gray-500 font-medium">Reject</div>
          <div className="mt-2 w-full bg-red-100 rounded-full h-2">
            <div className="bg-red-500 h-2 rounded-full" style={{width:`${stats.avg_reject_pct}%`}} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Defect distribution */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Defect Distribution</h3>
          {defectData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={defectData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={d=>`${d.name} (${d.value})`}>
                  {defectData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="text-center text-gray-400 py-12">No defect data</div>}
        </div>

        {/* Grade distribution */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Grade Distribution</h3>
          {gradeData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={gradeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize:12}} />
                <YAxis tick={{fontSize:12}} />
                <Tooltip />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {gradeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="text-center text-gray-400 py-12">No grade data</div>}
        </div>
      </div>

      {/* Batch trend */}
      {stats.batch_trend?.length > 0 && (
        <div className="card mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Batch Quality Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.batch_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{fontSize:11}} />
              <YAxis domain={[0,100]} tick={{fontSize:11}} />
              <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
              <Legend />
              <Line type="monotone" dataKey="grade_a" name="Grade A%" stroke="#16a34a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="urs" name="URS%" stroke="#ca8a04" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="reject" name="Reject%" stroke="#dc2626" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent batches */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Batches</h3>
          <button onClick={() => navigate('/batches')} className="text-sm text-blue-600 hover:underline">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left py-2 pr-4 font-medium">Batch ID</th>
                <th className="text-left py-2 pr-4 font-medium">Mode</th>
                <th className="text-right py-2 pr-4 font-medium">Onions</th>
                <th className="text-right py-2 pr-4 font-medium">Grade A</th>
                <th className="text-left py-2 font-medium">Grade</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_batches?.map(b => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/batches/${b.id}`)}>
                  <td className="py-2.5 pr-4 font-mono text-xs text-blue-700">{b.batch_code}</td>
                  <td className="py-2.5 pr-4 capitalize text-gray-600">{b.inspection_mode}</td>
                  <td className="py-2.5 pr-4 text-right">{b.total_onions}</td>
                  <td className="py-2.5 pr-4 text-right text-green-600 font-medium">{b.grade_a_pct?.toFixed(1)}%</td>
                  <td className="py-2.5"><GradeTag grade={b.final_grade} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
