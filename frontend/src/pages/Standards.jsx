import React, { useEffect, useState } from 'react'
import { standardsAPI } from '../api/client'
import useAuthStore from '../store/authStore'
import { PageHeader } from '../components/UI'
import LoadingSpinner from '../components/LoadingSpinner'
import { Shield, Edit2, Check, X, Plus } from 'lucide-react'

export default function Standards() {
  const [standards, setStandards] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    standardsAPI.list()
      .then(r => setStandards(r.data))
      .finally(() => setLoading(false))
  }, [])

  const startEdit = (s) => {
    setEditing(s.id)
    setForm({
      standard_name: s.standard_name,
      standard_version: s.standard_version,
      description: s.description || '',
      is_demo: s.is_demo,
      defect_limits: JSON.stringify(s.defect_limits, null, 2),
      size_limits: JSON.stringify(s.size_limits, null, 2),
      grade_rules: JSON.stringify(s.grade_rules, null, 2),
    })
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        defect_limits: JSON.parse(form.defect_limits),
        size_limits: JSON.parse(form.size_limits),
        grade_rules: JSON.parse(form.grade_rules),
      }
      const r = await standardsAPI.update(editing, payload)
      setStandards(prev => prev.map(s => s.id === editing ? r.data : s))
      setEditing(null)
    } catch (e) {
      alert('Save failed: ' + (e.message || 'Invalid JSON in rules'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Standards"
        subtitle="Configurable grading standards — separate AI observations from procurement rules"
      />

      {!isAdmin && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          View only. Admin access required to edit standards.
        </div>
      )}

      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        ⚠ <strong>DEMO STANDARD</strong> — Replace with official procurement specification before production use.
        Thresholds are editable by an admin.
      </div>

      {standards.map(s => (
        <div key={s.id} className="card mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900">{s.standard_name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{s.standard_version}</p>
              {s.description && <p className="text-sm text-gray-600 mt-1">{s.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              {s.is_demo && <span className="badge bg-amber-100 text-amber-700">DEMO</span>}
              {isAdmin && editing !== s.id && (
                <button onClick={() => startEdit(s)} className="btn-secondary text-xs">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>
          </div>

          {editing === s.id && form ? (
            <EditForm form={form} setForm={setForm} onSave={saveEdit} onCancel={() => setEditing(null)} saving={saving} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ConfigSection title="Defect Limits" data={s.defect_limits} />
              <ConfigSection title="Size Limits" data={s.size_limits} />
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2">Grade Rules</h4>
                <div className="space-y-2">
                  {s.grade_rules?.map((r, i) => (
                    <div key={i} className={`px-3 py-2 rounded-lg text-xs border
                      ${r.grade==='A' ? 'bg-green-50 border-green-200' :
                        r.grade==='URS' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-red-50 border-red-200'}`}>
                      <div className="font-bold mb-1">{r.grade} — {r.label}</div>
                      <div className="text-gray-500">Min healthy: {r.min_healthy_pct}%</div>
                      <div className="text-gray-500">Max defect: {r.max_defect_pct}%</div>
                      <div className="text-gray-500">Max rotten: {r.max_rotten_pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ConfigSection({ title, data }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 mb-2">{title}</h4>
      <dl className="space-y-1">
        {Object.entries(data || {}).map(([k, v]) => (
          <div key={k} className="flex justify-between text-xs py-1 border-b border-gray-50">
            <dt className="text-gray-500">{k.replace(/_/g, ' ')}</dt>
            <dd className="font-medium text-gray-900">{typeof v === 'number' ? `${v}%` : JSON.stringify(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function EditForm({ form, setForm, onSave, onCancel, saving }) {
  const field = (key, label, multiline = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={form[key]}
          onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
          rows={6}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <input
          value={form[key]}
          onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {field('standard_name', 'Standard Name')}
        {field('standard_version', 'Version')}
      </div>
      {field('description', 'Description')}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {field('defect_limits', 'Defect Limits (JSON)', true)}
        {field('size_limits', 'Size Limits (JSON)', true)}
        {field('grade_rules', 'Grade Rules (JSON)', true)}
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onSave} disabled={saving} className="btn-primary text-xs">
          <Check className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button onClick={onCancel} className="btn-secondary text-xs">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    </div>
  )
}
