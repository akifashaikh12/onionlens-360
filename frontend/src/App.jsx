import React, { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import LoadingSpinner from './components/LoadingSpinner'
import LandingPage from './pages/LandingPage'
import TechnicalApproach from './pages/TechnicalApproach'
import SharedBatchPage from './pages/SharedBatchPage'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const LiveInspection = lazy(() => import('./pages/LiveInspection'))
const BatchHistory = lazy(() => import('./pages/BatchHistory'))
const BatchDetail = lazy(() => import('./pages/BatchDetail'))
const EvidenceGallery = lazy(() => import('./pages/EvidenceGallery'))
const DisputeReplay = lazy(() => import('./pages/DisputeReplay'))
const Reports = lazy(() => import('./pages/Reports'))
const Standards = lazy(() => import('./pages/Standards'))
const Settings = lazy(() => import('./pages/Settings'))
const VerifyPage = lazy(() => import('./pages/VerifyPage'))
const DatasetManager = lazy(() => import('./pages/DatasetManager'))
const Intelligence = lazy(() => import('./pages/Intelligence'))

function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { isAuthenticated, fetchMe } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) fetchMe()
  }, [isAuthenticated])

  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/tech" element={<TechnicalApproach />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify/:token" element={<VerifyPage />} />
        <Route path="/share/:token" element={<SharedBatchPage />} />

        {/* Protected app */}
        <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inspect" element={<LiveInspection />} />
          <Route path="batches" element={<BatchHistory />} />
          <Route path="batches/:id" element={<BatchDetail />} />
          <Route path="evidence" element={<EvidenceGallery />} />
          <Route path="dispute" element={<DisputeReplay />} />
          <Route path="intelligence" element={<Intelligence />} />
          <Route path="reports" element={<Reports />} />
          <Route path="standards" element={<Standards />} />
          <Route path="settings" element={<Settings />} />
          <Route path="dataset" element={<DatasetManager />} />
        </Route>

        {/* Legacy redirects — existing links inside the app still use /dashboard etc */}
        <Route path="/dashboard" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
        </Route>
        <Route path="/inspect" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<LiveInspection />} />
        </Route>
        <Route path="/batches" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<BatchHistory />} />
        </Route>
        <Route path="/batches/:id" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<BatchDetail />} />
        </Route>
        <Route path="/evidence" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<EvidenceGallery />} />
        </Route>
        <Route path="/dispute" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DisputeReplay />} />
        </Route>
        <Route path="/intelligence" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Intelligence />} />
        </Route>
        <Route path="/reports" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Reports />} />
        </Route>
        <Route path="/standards" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Standards />} />
        </Route>
        <Route path="/settings" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Settings />} />
        </Route>
        <Route path="/dataset" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DatasetManager />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
