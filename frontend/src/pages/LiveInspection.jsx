import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import { useDropzone } from 'react-dropzone'
import {
  Camera, Upload, Play, Pause, CheckCircle, StopCircle,
  AlertTriangle, Zap, Image as ImageIcon, RefreshCw,
  FolderOpen, Video, Layers, Activity, Eye
} from 'lucide-react'
import { batchAPI, inspectAPI } from '../api/client'
import { inspectExtAPI } from '../api/client'
import { DefectBadge, PageHeader } from '../components/UI'
import DemoBanner from '../components/DemoBanner'
import LoadingSpinner from '../components/LoadingSpinner'

// ─── Shared helpers ───────────────────────────────────────────────────────────
function buildStats(dets) {
  return {
    total: dets.length,
    healthy:    dets.filter(d => d.defect_class === 'healthy').length,
    damaged:    dets.filter(d => d.defect_class === 'damaged').length,
    rotten:     dets.filter(d => d.defect_class === 'rotten').length,
    sprouted:   dets.filter(d => d.defect_class === 'sprouted').length,
    undersized: dets.filter(d => d.defect_class === 'undersized').length,
    unknown:    dets.filter(d => d.defect_class === 'unknown').length,
    avgConf: dets.length
      ? dets.reduce((s, d) => s + (d.inspection_confidence || 0), 0) / dets.length
      : 0,
  }
}

async function createBatch(mode, isDemo = false) {
  const res = await batchAPI.create({
    inspection_mode: mode,
    camera_type: mode === 'webcam' ? 'webcam' : mode === 'demo' ? 'demo' : mode,
    is_demo: isDemo,
  })
  return res.data
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LiveInspection() {
  const navigate = useNavigate()
  // Which top-level input mode the user selected
  const [inputMode, setInputMode] = useState(null) // null | 'demo' | 'live' | 'library' | 'batch'

  const resetAll = () => setInputMode(null)

  return (
    <div className="p-6 lg:p-8 h-full">
      <PageHeader title="Live Inspection" subtitle="SEE → UNDERSTAND → VERIFY → DECIDE → PROVE">
        {inputMode && (
          <button onClick={resetAll} className="btn-secondary">
            <RefreshCw className="w-4 h-4" /> Change Mode
          </button>
        )}
      </PageHeader>

      {/* Mode selector */}
      {!inputMode && <ModeSelector onSelect={setInputMode} />}

      {/* Active inspection panels */}
      {inputMode === 'demo'    && <DemoPanel    navigate={navigate} />}
      {inputMode === 'live'    && <LiveCameraPanel navigate={navigate} />}
      {inputMode === 'library' && <LibraryPanel  navigate={navigate} />}
      {inputMode === 'batch'   && <BatchUploadPanel navigate={navigate} />}
    </div>
  )
}

// ─── MODE SELECTOR ────────────────────────────────────────────────────────────
function ModeSelector({ onSelect }) {
  const modes = [
    {
      id: 'demo',
      icon: Zap,
      title: 'Run Demo Batch',
      desc: 'Instantly process 20 sample onions — no camera, no upload needed.',
      badge: 'DEMO DATA',
      color: 'border-blue-300 hover:border-blue-500',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      id: 'live',
      icon: Camera,
      title: 'Live Camera',
      desc: 'Use webcam for continuous live inspection with frame-by-frame analysis.',
      badge: null,
      color: 'border-gray-200 hover:border-gray-400',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      id: 'library',
      icon: ImageIcon,
      title: 'Image / Video Library',
      desc: 'Upload a single image or short video from your device or library.',
      badge: null,
      color: 'border-gray-200 hover:border-gray-400',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      id: 'batch',
      icon: FolderOpen,
      title: 'Batch Upload',
      desc: 'Upload multiple images at once — all processed through the same pipeline.',
      badge: null,
      color: 'border-gray-200 hover:border-gray-400',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
  ]

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        All three input modes feed the same AI inspection pipeline →
        quality gate → inference → multi-frame consensus → confidence → grading.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`card text-left hover:shadow-md transition-all border-2 ${m.color} group`}
          >
            <div className={`w-10 h-10 ${m.iconBg} rounded-xl flex items-center justify-center mb-3 transition-colors`}>
              <m.icon className={`w-5 h-5 ${m.iconColor}`} />
            </div>
            <div className="font-semibold text-gray-900 mb-1 text-sm">{m.title}</div>
            <div className="text-xs text-gray-500 leading-relaxed">{m.desc}</div>
            {m.badge && (
              <div className="mt-3 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full inline-block">{m.badge}</div>
            )}
          </button>
        ))}
      </div>

      {/* Pipeline diagram */}
      <div className="mt-8 max-w-4xl">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Inspection Pipeline</p>
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {[
            ['INPUT', 'Camera / Image / Video', 'bg-blue-50 text-blue-700'],
            ['QUALITY', 'Lighting + Blur + Exposure', 'bg-purple-50 text-purple-700'],
            ['VISION', 'Demo Inference (YOLO stub)', 'bg-green-50 text-green-700'],
            ['TRACKING', 'ByteTrack + Counting', 'bg-teal-50 text-teal-700'],
            ['ANALYSIS', 'Defect + Size + Shape', 'bg-yellow-50 text-yellow-700'],
            ['VERIFY', 'Multi-frame + Confidence', 'bg-orange-50 text-orange-700'],
            ['DECIDE', 'Standards Engine + Grade', 'bg-red-50 text-red-700'],
            ['PROVE', 'Evidence + Report + QR', 'bg-gray-100 text-gray-700'],
          ].map(([label, desc, cls], i, arr) => (
            <React.Fragment key={label}>
              <div className={`px-2 py-1.5 rounded-lg ${cls}`}>
                <div className="font-semibold">{label}</div>
                <div className="opacity-70">{desc}</div>
              </div>
              {i < arr.length - 1 && <span className="text-gray-300 font-bold">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── DEMO PANEL ───────────────────────────────────────────────────────────────
function DemoPanel({ navigate }) {
  const [batch, setBatch] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [detections, setDetections] = useState([])
  const [annotatedImg, setAnnotatedImg] = useState(null)
  const [modelVersion, setModelVersion] = useState(null)
  const [error, setError] = useState(null)
  const stats = buildStats(detections)

  const run = async () => {
    setError(null)
    setProcessing(true)
    try {
      const b = await createBatch('demo', true)
      setBatch(b)
      const res = await inspectAPI.demoBatch(b.id)
      setDetections(res.data.detections || [])
      setAnnotatedImg(res.data.annotated_image)
      setModelVersion(res.data.model_version)
    } catch (e) {
      setError(e.response?.data?.detail || 'Demo failed')
    } finally {
      setProcessing(false)
    }
  }

  const finish = async () => {
    if (!batch) return
    setProcessing(true)
    try {
      await batchAPI.complete(batch.id)
      navigate(`/batches/${batch.id}`)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <DemoBanner />
      {error && <ErrorBar msg={error} />}
      {!detections.length && !processing && (
        <div className="card max-w-sm text-center py-10">
          <Zap className="w-10 h-10 text-blue-500 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Demo Batch Ready</h3>
          <p className="text-sm text-gray-500 mb-5">
            Processes 20 synthetic onions through the full pipeline instantly.
            All evidence and provenance stored in the database.
          </p>
          <button onClick={run} className="btn-primary mx-auto">
            <Play className="w-4 h-4" /> Run Demo Batch
          </button>
        </div>
      )}
      {processing && <LoadingSpinner />}
      {annotatedImg && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <img src={annotatedImg} alt="Demo result" className="w-full" />
            </div>
            {modelVersion && (
              <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Model: {modelVersion}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button onClick={finish} disabled={processing} className="btn-primary">
                <CheckCircle className="w-4 h-4" />
                {processing ? 'Completing…' : 'Finish & Grade Batch'}
              </button>
            </div>
          </div>
          <StatsPanel stats={stats} detections={detections} onFinish={finish} processing={processing} />
        </div>
      )}
    </div>
  )
}

// ─── LIVE CAMERA PANEL ────────────────────────────────────────────────────────
function LiveCameraPanel({ navigate }) {
  const webcamRef = useRef(null)
  const [batch, setBatch] = useState(null)
  const [started, setStarted] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [detections, setDetections] = useState([])
  const [annotatedImg, setAnnotatedImg] = useState(null)
  const [captureInterval, setCaptureInterval] = useState(null)
  const [quality, setQuality] = useState(null)
  const [calStatus, setCalStatus] = useState('RELATIVE SIZE ONLY')
  const [error, setError] = useState(null)
  const stats = buildStats(detections)

  const startSession = async () => {
    setError(null)
    const b = await createBatch('live', false)
    setBatch(b)
    setStarted(true)
  }

  const captureFrame = useCallback(async () => {
    if (!webcamRef.current || !batch || processing) return
    const shot = webcamRef.current.getScreenshot()
    if (!shot) return
    const res = await fetch(shot)
    const blob = await res.blob()
    const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' })
    setProcessing(true)
    try {
      const resp = await inspectAPI.image(batch.id, file, false)
      if (resp.data.error) {
        setQuality(resp.data.quality)
        return
      }
      setQuality(resp.data.quality)
      setCalStatus(resp.data.calibration_status || 'RELATIVE SIZE ONLY')
      setDetections(prev => [...prev, ...(resp.data.detections || [])])
      setAnnotatedImg(resp.data.annotated_image)
    } catch {}
    finally { setProcessing(false) }
  }, [batch, processing])

  const toggleAuto = () => {
    if (captureInterval) {
      clearInterval(captureInterval)
      setCaptureInterval(null)
    } else {
      const iv = setInterval(captureFrame, 3000)
      setCaptureInterval(iv)
    }
  }

  useEffect(() => () => { if (captureInterval) clearInterval(captureInterval) }, [captureInterval])

  const finish = async () => {
    if (!batch) return
    if (captureInterval) { clearInterval(captureInterval); setCaptureInterval(null) }
    setProcessing(true)
    try {
      await batchAPI.complete(batch.id)
      navigate(`/batches/${batch.id}`)
    } finally { setProcessing(false) }
  }

  return (
    <div>
      {error && <ErrorBar msg={error} />}
      {!started ? (
        <div className="card max-w-sm text-center py-10">
          <Camera className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Live Camera Inspection</h3>
          <p className="text-sm text-gray-500 mb-5">
            Capture frames from your webcam. Each frame passes through the quality gate
            before inference. ArUco marker detection enables physical size calibration.
          </p>
          <button onClick={startSession} className="btn-primary mx-auto">
            <Camera className="w-4 h-4" /> Start Live Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="relative rounded-xl overflow-hidden bg-black min-h-48">
              {annotatedImg ? (
                <img src={annotatedImg} alt="Annotated" className="w-full" />
              ) : (
                <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full" audio={false} />
              )}
              {processing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <LoadingSpinner size="sm" />
                </div>
              )}
              {/* Calibration status badge */}
              <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold
                ${calStatus.startsWith('CALIBRATED') ? 'bg-green-600 text-white' : 'bg-gray-800/70 text-gray-200'}`}>
                {calStatus}
              </div>
            </div>

            {/* Quality indicator */}
            {quality && (
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span>Quality: <strong className={quality.usable ? 'text-green-600' : 'text-red-600'}>{Math.round(quality.overall * 100)}%</strong></span>
                <span>Brightness: {Math.round(quality.brightness * 100)}%</span>
                <span>Sharpness: {Math.round(quality.sharpness * 100)}%</span>
                {!quality.usable && <span className="text-red-600 font-medium">Image quality too low — waiting for a better frame.</span>}
              </div>
            )}

            <div className="flex gap-2 mt-3 flex-wrap">
              <button onClick={captureFrame} disabled={processing} className="btn-primary">
                <Eye className="w-4 h-4" /> Capture Frame
              </button>
              <button onClick={toggleAuto} className={captureInterval ? 'btn-danger' : 'btn-secondary'}>
                {captureInterval ? <><Pause className="w-4 h-4" /> Stop Auto</> : <><Activity className="w-4 h-4" /> Auto Capture</>}
              </button>
              <button onClick={finish} disabled={processing || !detections.length} className="btn-secondary ml-auto">
                <StopCircle className="w-4 h-4" /> Finish Batch
              </button>
            </div>
          </div>
          <StatsPanel stats={stats} detections={detections} onFinish={finish} processing={processing} />
        </div>
      )}
    </div>
  )
}

// ─── LIBRARY PANEL (single image or video) ───────────────────────────────────
function LibraryPanel({ navigate }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [isVideo, setIsVideo] = useState(false)
  const [batch, setBatch] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [], 'video/*': [] },
    maxFiles: 1,
    onDrop: (files) => {
      const f = files[0]
      if (!f) return
      setFile(f)
      setPreview(URL.createObjectURL(f))
      setIsVideo(f.type.startsWith('video/'))
      setResult(null)
    }
  })

  const run = async () => {
    if (!file) return
    setError(null)
    setProcessing(true)
    try {
      const b = batch || await createBatch(isVideo ? 'video' : 'image', false)
      if (!batch) setBatch(b)

      let resp
      if (isVideo) {
        resp = await inspectExtAPI.video(b.id, file, false)
      } else {
        resp = await inspectAPI.image(b.id, file, false)
      }

      if (resp.data.error) {
        setError(resp.data.message)
        return
      }
      setResult(resp.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Inspection failed')
    } finally {
      setProcessing(false)
    }
  }

  const finish = async () => {
    if (!batch) return
    setProcessing(true)
    try {
      await batchAPI.complete(batch.id)
      navigate(`/batches/${batch.id}`)
    } finally { setProcessing(false) }
  }

  return (
    <div className="max-w-3xl">
      {error && <ErrorBar msg={error} />}
      {/* Drop zone */}
      {!result && (
        <>
          <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4
            ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-400'}`}>
            <input {...getInputProps()} />
            <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Drop image or video here, or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">JPEG · PNG · WebP · MP4 · AVI · MOV</p>
          </div>
          {preview && !isVideo && (
            <div className="mb-4">
              <img src={preview} alt="Preview" className="max-h-52 rounded-xl border border-gray-200" />
            </div>
          )}
          {preview && isVideo && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
              <Video className="w-4 h-4" /> {file?.name}
              <span className="text-gray-400">— key frames will be extracted for inference</span>
            </div>
          )}
          {file && (
            <button onClick={run} disabled={processing} className="btn-primary">
              <Play className="w-4 h-4" />
              {processing ? (isVideo ? 'Extracting frames…' : 'Analysing…') : 'Analyse'}
            </button>
          )}
        </>
      )}

      {processing && <LoadingSpinner />}

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <img src={result.annotated_image} alt="Result" className="w-full rounded-xl border border-gray-200" />
            {result.model_version && (
              <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Model: {result.model_version}
                {result.frames_extracted && <span className="ml-2">· {result.frames_extracted} frames extracted</span>}
                {result.calibration_status && (
                  <span className={`ml-2 font-semibold ${result.calibration_status.startsWith('CALIBRATED') ? 'text-green-600' : 'text-gray-400'}`}>
                    · {result.calibration_status}
                  </span>
                )}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={finish}
                disabled={processing || !(result.detections?.length)}
                className="btn-primary"
              >
                <CheckCircle className="w-4 h-4" />
                {processing ? 'Completing…' : 'Finish & Grade Batch'}
              </button>
              <div {...getRootProps()}>
                <input {...getInputProps()} />
                <button className="btn-secondary"><Upload className="w-4 h-4" /> Add More</button>
              </div>
            </div>
          </div>
          <StatsPanel
            stats={buildStats(result.detections || [])}
            detections={result.detections || []}
            onFinish={finish}
            processing={processing}
          />
        </div>
      )}
    </div>
  )
}

// ─── BATCH UPLOAD PANEL ───────────────────────────────────────────────────────
function BatchUploadPanel({ navigate }) {
  const [files, setFiles] = useState([])
  const [batch, setBatch] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (dropped) => setFiles(prev => [...prev, ...dropped]),
  })

  const run = async () => {
    if (!files.length) return
    setError(null)
    setProcessing(true)
    try {
      const b = batch || await createBatch('batch_upload', false)
      if (!batch) setBatch(b)
      const resp = await inspectExtAPI.batchUpload(b.id, files, false)
      setResults(resp.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Batch upload failed')
    } finally {
      setProcessing(false)
    }
  }

  const finish = async () => {
    if (!batch) return
    setProcessing(true)
    try {
      await batchAPI.complete(batch.id)
      navigate(`/batches/${batch.id}`)
    } finally { setProcessing(false) }
  }

  return (
    <div className="max-w-3xl">
      {error && <ErrorBar msg={error} />}

      {!results && (
        <>
          <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4
            ${isDragActive ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-400'}`}>
            <input {...getInputProps()} />
            <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Drop multiple images here, or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">All images are processed through the same AI pipeline</p>
          </div>

          {files.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {files.slice(0, 8).map((f, i) => (
                  <div key={i} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{f.name}</div>
                ))}
                {files.length > 8 && <div className="text-xs text-gray-400">+{files.length - 8} more</div>}
              </div>
              <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:underline mr-4">Clear all</button>
              <span className="text-sm text-gray-600">{files.length} image{files.length !== 1 ? 's' : ''} ready</span>
            </div>
          )}

          {files.length > 0 && (
            <button onClick={run} disabled={processing} className="btn-primary">
              <Play className="w-4 h-4" />
              {processing ? `Processing ${files.length} images…` : `Analyse ${files.length} Image${files.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </>
      )}

      {processing && <LoadingSpinner />}

      {results && (
        <div>
          <div className="card mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Batch Upload Results</h3>
            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xl font-bold text-green-600">{results.files_processed}</div>
                <div className="text-xs text-gray-500">Processed</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-xl font-bold text-red-500">{results.files_skipped}</div>
                <div className="text-xs text-gray-500">Skipped (quality)</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xl font-bold text-blue-600">
                  {results.results.reduce((s, r) => s + r.detections_count, 0)}
                </div>
                <div className="text-xs text-gray-500">Total detections</div>
              </div>
            </div>

            {/* Per-file thumbnails */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {results.results.map((r, i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-gray-100">
                  <img src={r.annotated_image} alt={r.filename} className="w-full h-28 object-cover" />
                  <div className="p-2 text-xs text-gray-600 truncate">{r.filename}</div>
                  <div className="px-2 pb-2 text-xs text-blue-600">{r.detections_count} detected</div>
                </div>
              ))}
            </div>

            {results.model_version && (
              <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Model: {results.model_version}
              </div>
            )}
          </div>

          <button onClick={finish} disabled={processing} className="btn-primary">
            <CheckCircle className="w-4 h-4" />
            {processing ? 'Completing…' : 'Finish & Grade Batch'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── SHARED STATS PANEL ───────────────────────────────────────────────────────
function StatsPanel({ stats, detections, onFinish, processing }) {
  if (!stats) return null
  const confPct = Math.round((stats.avgConf || 0) * 100)
  const gateColor = confPct >= 85 ? 'text-green-600' : confPct >= 60 ? 'text-yellow-600' : 'text-red-600'
  const gateLabel = confPct >= 85 ? 'ACCEPT' : confPct >= 60 ? 'REVIEW' : 'RECAPTURE'

  return (
    <div className="card flex flex-col gap-3">
      <h3 className="font-semibold text-gray-900 text-sm">Live Statistics</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {[
          ['Detected', stats.total, 'text-gray-900'],
          ['Healthy', stats.healthy, 'text-green-600'],
          ['Damaged', stats.damaged, 'text-orange-600'],
          ['Rotten', stats.rotten, 'text-red-600'],
          ['Sprouted', stats.sprouted, 'text-yellow-600'],
          ['Undersized', stats.undersized, 'text-purple-600'],
          ['Unknown', stats.unknown, 'text-gray-400'],
        ].map(([lbl, val, cls]) => (
          <div key={lbl} className="bg-gray-50 rounded-lg p-2">
            <div className={`font-bold text-lg ${cls}`}>{val}</div>
            <div className="text-xs text-gray-400">{lbl}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Inspection Confidence</span>
          <span className={`font-bold ${gateColor}`}>{confPct}% — {gateLabel}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all ${confPct >= 85 ? 'bg-green-500' : confPct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${confPct}%` }} />
        </div>
      </div>

      {/* Recent detections */}
      <div className="flex-1 overflow-y-auto max-h-52">
        {[...detections].reverse().slice(0, 12).map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50">
            <span className="font-mono text-gray-400 w-10 flex-shrink-0">{d.onion_uid}</span>
            <DefectBadge cls={d.defect_class} />
            <span className="text-gray-400">{((d.confidence || 0) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      <button
        onClick={onFinish}
        disabled={processing || !detections.length}
        className="btn-primary w-full justify-center"
      >
        <CheckCircle className="w-4 h-4" />
        {processing ? 'Completing…' : 'Finish & Grade Batch'}
      </button>
    </div>
  )
}

// ─── Error bar ────────────────────────────────────────────────────────────────
function ErrorBar({ msg }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {msg}
    </div>
  )
}
