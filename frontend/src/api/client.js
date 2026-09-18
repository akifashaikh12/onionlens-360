import axios from 'axios'

// In dev: proxy via Vite (/api → localhost:8000)
// In production: VITE_API_URL points to deployed backend (e.g. Railway)
const BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (username, password) => {
    const form = new FormData()
    form.append('username', username)
    form.append('password', password)
    return axios.post(`${BASE}/api/auth/login`, form)
  },
  me: () => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data),
}

// ─── Batches ──────────────────────────────────────────────────────────────────
export const batchAPI = {
  list: (skip = 0, limit = 50) => api.get(`/batches?skip=${skip}&limit=${limit}`),
  get: (id) => api.get(`/batches/${id}`),
  getByCode: (code) => api.get(`/batches/code/${code}`),
  create: (data) => api.post('/batches/', data),
  complete: (id) => api.post(`/batches/${id}/complete`),
  dashboard: () => api.get('/batches/dashboard'),
}

// ─── Inspect ──────────────────────────────────────────────────────────────────
export const inspectAPI = {
  image: (batchId, file, isDemo = false) => {
    const form = new FormData()
    form.append('batch_id', batchId)
    form.append('is_demo', isDemo)
    form.append('file', file)
    return axios.post(`${BASE}/api/inspect/image`, form, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    })
  },
  demoBatch: (batchId) => {
    const form = new FormData()
    form.append('batch_id', batchId)
    return axios.post(`${BASE}/api/inspect/demo-batch`, form, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    })
  },
  getOnions: (batchId) => api.get(`/inspect/onions/${batchId}`),
  getOnion: (onionId) => api.get(`/inspect/onion/${onionId}`),
}

// ─── Inspect extensions ───────────────────────────────────────────────────────
export const inspectExtAPI = {
  video: (batchId, file, isDemo = false) => {
    const form = new FormData()
    form.append('batch_id', batchId)
    form.append('is_demo', isDemo)
    form.append('file', file)
    return axios.post(`${BASE}/api/inspect/video`, form, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    })
  },
  batchUpload: (batchId, files, isDemo = false) => {
    const form = new FormData()
    form.append('batch_id', batchId)
    form.append('is_demo', isDemo)
    files.forEach(f => form.append('files', f))
    return axios.post(`${BASE}/api/inspect/batch-upload`, form, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    })
  },
  getMedia: (batchId) => api.get(`/inspect/media/${batchId}`),
  getFrames: (batchId) => api.get(`/inspect/frames/${batchId}`),
  getReviewQueue: () => api.get('/inspect/review-queue'),
  submitReview: (onionId, correctedClass, notes = '') => {
    const form = new FormData()
    form.append('corrected_class', correctedClass)
    form.append('notes', notes)
    return axios.post(`${BASE}/api/inspect/review/${onionId}`, form, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    })
  },
}

// ─── Dataset ──────────────────────────────────────────────────────────────────
export const datasetAPI = {
  list: (params = {}) => api.get('/dataset/items', { params }),
  stats: () => api.get('/dataset/stats'),
  upload: (file, meta = {}) => {
    const form = new FormData()
    form.append('file', file)
    Object.entries(meta).forEach(([k, v]) => form.append(k, v))
    return axios.post(`${BASE}/api/dataset/upload`, form, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    })
  },
  updateLabel: (id, label, bbox = null) => {
    const form = new FormData()
    form.append('label', label)
    if (bbox) form.append('bbox_annotation', JSON.stringify(bbox))
    return axios.put(`${BASE}/api/dataset/items/${id}/label`, form, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    })
  },
  markReviewed: (id) => api.put(`/dataset/items/${id}/review`),
  deleteItem: (id) => api.delete(`/dataset/items/${id}`),
  exportUrl: () => `/api/dataset/export/yolo`,
}

// ─── Model Versions ───────────────────────────────────────────────────────────
export const modelsAPI = {
  list: () => api.get('/models/'),
  getActive: () => api.get('/models/active'),
  activate: (id) => api.post(`/models/${id}/activate`),
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportAPI = {
  generate: (batchId) => api.post(`/reports/${batchId}/generate`),
  get: (batchId) => api.get(`/reports/${batchId}`),
  downloadUrl: (batchId) => `/api/reports/${batchId}/download`,
  qrUrl: (batchId) => `/api/reports/${batchId}/qr`,
}

// ─── Standards ────────────────────────────────────────────────────────────────
export const standardsAPI = {
  list: () => api.get('/standards/'),
  get: (id) => api.get(`/standards/${id}`),
  create: (data) => api.post('/standards/', data),
  update: (id, data) => api.put(`/standards/${id}`, data),
  delete: (id) => api.delete(`/standards/${id}`),
}

// ─── Verify (public) ──────────────────────────────────────────────────────────
export const verifyAPI = {
  verify: (token) => axios.get(`/api/verify/${token}`),
}

// ─── Intelligence ─────────────────────────────────────────────────────────────
export const intelligenceAPI = {
  get: (batchId) => api.get(`/intelligence/${batchId}`),
}

// ─── Share ────────────────────────────────────────────────────────────────────
export const shareAPI = {
  create: (batchId) => api.post(`/share/${batchId}`),
  get: (token) => axios.get(`${BASE}/api/share/${token}`),
}
