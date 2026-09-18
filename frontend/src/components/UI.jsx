import React from 'react'

const COLORS = {
  healthy:    { bg: 'bg-green-50',  text: 'text-green-700',  bar: '#16a34a' },
  damaged:    { bg: 'bg-orange-50', text: 'text-orange-700', bar: '#ea580c' },
  rotten:     { bg: 'bg-red-50',    text: 'text-red-700',    bar: '#dc2626' },
  sprouted:   { bg: 'bg-yellow-50', text: 'text-yellow-700', bar: '#ca8a04' },
  undersized: { bg: 'bg-purple-50', text: 'text-purple-700', bar: '#9333ea' },
  unknown:    { bg: 'bg-gray-50',   text: 'text-gray-600',   bar: '#9ca3af' },
}

export function DefectBadge({ cls }) {
  const c = COLORS[cls] || COLORS.unknown
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {cls?.charAt(0).toUpperCase() + cls?.slice(1) || 'Unknown'}
    </span>
  )
}

export function ConfidenceBar({ value, label }) {
  const pct = Math.round((value || 0) * 100)
  const color = pct >= 85 ? '#16a34a' : pct >= 60 ? '#ca8a04' : '#dc2626'
  return (
    <div>
      {label && <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{label}</span><span>{pct}%</span></div>}
      <div className="confidence-bar">
        <div className="confidence-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export function GradeTag({ grade }) {
  const config = {
    A:      { label: 'Grade A',  cls: 'bg-green-100 text-green-800 border-green-200' },
    URS:    { label: 'URS',      cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    REJECT: { label: 'REJECT',   cls: 'bg-red-100 text-red-800 border-red-200' },
  }
  const c = config[grade] || { label: grade || 'N/A', cls: 'bg-gray-100 text-gray-700 border-gray-200' }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold border ${c.cls}`}>
      {c.label}
    </span>
  )
}

export function StatCard({ label, value, sub, color = 'blue', icon: Icon }) {
  const colors = {
    blue:   'text-blue-600',
    green:  'text-green-600',
    yellow: 'text-yellow-600',
    red:    'text-red-600',
    purple: 'text-purple-600',
    gray:   'text-gray-600',
  }
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <div className={`stat-value ${colors[color]}`}>{value}</div>
          <div className="stat-label">{label}</div>
          {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
        </div>
        {Icon && <Icon className={`w-8 h-8 ${colors[color]} opacity-20`} />}
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
