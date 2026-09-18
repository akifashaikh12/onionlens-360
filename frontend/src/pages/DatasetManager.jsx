import React, { useEffect, useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { datasetAPI } from '../api/client'
import { PageHeader, DefectBadge } from '../components/UI'
import LoadingSpinner from '../components/LoadingSpinner'
import useAuthStore from '../store/authStore'
import { Upload, Download, Tag, Check, Trash2, Filter, Database } from 'lucide-react'

const LABELS = ['healthy', 'damaged', 'rotten', 'sprouted', 'undersized', 'unknown', 'unlabelled']
const STATUS_COLORS = {
  unlabelled: 'bg-gray-100 text-gray-500',
  labelled:   'bg-blue-100 text-blue-700',
  reviewed:   'bg-green-100 text-green-700',
}

export default function DatasetManager() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filters, setFilters] = useState({ label: '', status: '' })
  const [editing, setEditing] = useState(null) // item id being labelled
  const [newLabel, setNewLabel] = useState('')
  const [uploadMeta, setUploadMeta] = useState({ label: 'unlabelled', camera_type: '', lighting: '', view_angle: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.label) params.label = filters.label
      if (filters.status) params.status = filters.status
      const [itemsRes, statsRes] = await Promise.all([
        datasetAPI.list(params),
        datasetAPI.stats(),
      ])
      setItems(itemsRes.data)
      setStats(statsRes.data)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: async (files) => {
      setUploading(true)
      try {
        for (const f of files) {
          await datasetAPI.upload(f, uploadMeta)
        }
        load()
      } finally {
        setUploading(false)
      }
    }
  })

  const handleLabel = async (id) => {
    if (!newLabel) return
    await datasetAPI.updateLabel(id, newLabel)
    setEditing(null)
    setNewLabel('')
    load()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this dataset item?')) return
    await datasetAPI.deleteItem(id)
    load()
  }

  const handleReview = async (id) => {
    await datasetAPI.markReviewed(id)
    load()
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Dataset Manager"
        subtitle="Manage training images — label, review, and export for model training"
      >
        {isAdmin && (
          <a
            href={datasetAPI.exportUrl()}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary text-sm"
          >
            <Download className="w-4 h-4" /> Export YOLO Dataset
          </a>
        )}
      </PageHeader>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <div className="card text-center p-3">
            <div className="text-xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          {Object.entries(stats.by_label || {}).filter(([, v]) => v > 0).map(([lbl, cnt]) => (
            <div key={lbl} className="card text-center p-3">
              <div className="text-xl font-bold text-blue-600">{cnt}</div>
              <div className="text-xs text-gray-500 capitalize">{lbl}</div>
            </div>
          ))}
          {stats.active_learning_pending > 0 && (
            <div className="card text-center p-3 border-orange-200 bg-orange-50">
              <div className="text-xl font-bold text-orange-600">{stats.active_learning_pending}</div>
              <div className="text-xs text-orange-500">AL Pending</div>
            </div>
          )}
        </div>
      )}

      {/* Active learning notice */}
      {stats?.active_learning_pending > 0 && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4" />
          <strong>{stats.active_learning_pending}</strong> low-confidence detections need human review.
          Filter by "Active Learning" below.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Upload + filters sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Upload */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload Images
            </h3>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer text-xs transition-colors mb-3
              ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-400'}`}>
              <input {...getInputProps()} />
              {uploading ? 'Uploading…' : 'Drop images or click'}
            </div>
            <div className="space-y-2">
              <select
                value={uploadMeta.label}
                onChange={e => setUploadMeta(m => ({...m, label: e.target.value}))}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
              >
                {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <input
                placeholder="Camera type (optional)"
                value={uploadMeta.camera_type}
                onChange={e => setUploadMeta(m => ({...m, camera_type: e.target.value}))}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
              />
              <input
                placeholder="Lighting (optional)"
                value={uploadMeta.lighting}
                onChange={e => setUploadMeta(m => ({...m, lighting: e.target.value}))}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filter
            </h3>
            <div className="space-y-2">
              <select
                value={filters.label}
                onChange={e => setFilters(f => ({...f, label: e.target.value}))}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
              >
                <option value="">All labels</option>
                {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select
                value={filters.status}
                onChange={e => setFilters(f => ({...f, status: e.target.value}))}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
              >
                <option value="">All statuses</option>
                <option value="unlabelled">Unlabelled</option>
                <option value="labelled">Labelled</option>
                <option value="reviewed">Reviewed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Item grid */}
        <div className="lg:col-span-3">
          {loading ? <LoadingSpinner /> : items.length === 0 ? (
            <div className="card text-center py-10">
              <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No dataset items yet. Upload images or run inspections to populate.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map(item => (
                <div key={item.id} className="card p-3 relative group">
                  {/* Image */}
                  <div className="w-full h-20 bg-gray-100 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                    {item.stored_path ? (
                      <img
                        src={`/storage/dataset/${item.stored_path.split(/[\\/]/).pop()}`}
                        alt="dataset"
                        className="w-full h-full object-cover"
                        onError={e => { e.target.style.display='none' }}
                      />
                    ) : (
                      <Database className="w-6 h-6 text-gray-300" />
                    )}
                  </div>

                  {/* Label + status */}
                  <div className="flex items-center gap-1 mb-1 flex-wrap">
                    <DefectBadge cls={item.label === 'unlabelled' ? 'unknown' : item.label} />
                    <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[item.annotation_status]}`}>
                      {item.annotation_status}
                    </span>
                  </div>

                  {item.is_active_learning && (
                    <div className="text-xs text-orange-600 font-medium mb-1">⚠ AL Review</div>
                  )}

                  <div className="text-xs text-gray-400 truncate mb-2">{item.original_filename || 'unnamed'}</div>

                  {/* Label editor */}
                  {editing === item.id ? (
                    <div className="flex gap-1">
                      <select
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        className="flex-1 text-xs border border-gray-200 rounded px-1 py-0.5"
                        autoFocus
                      >
                        <option value="">Pick label…</option>
                        {LABELS.filter(l => l !== 'unlabelled').map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <button onClick={() => handleLabel(item.id)} className="text-green-600 hover:text-green-800">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditing(item.id); setNewLabel(item.label) }}
                        className="flex-1 text-xs border border-gray-200 rounded py-0.5 hover:bg-gray-50 flex items-center justify-center gap-1"
                      >
                        <Tag className="w-3 h-3" /> Label
                      </button>
                      {isAdmin && item.annotation_status === 'labelled' && (
                        <button
                          onClick={() => handleReview(item.id)}
                          className="text-xs border border-green-200 text-green-600 rounded px-1.5 hover:bg-green-50"
                          title="Mark reviewed"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-xs border border-red-200 text-red-400 rounded px-1.5 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
