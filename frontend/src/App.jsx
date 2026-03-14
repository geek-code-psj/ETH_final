import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'

// Lazy-loaded pages
const LoginPage              = lazy(() => import('./pages/LoginPage'))
const DashboardPage          = lazy(() => import('./pages/DashboardPage'))
const EmployeesPage          = lazy(() => import('./pages/EmployeesPage'))
const EmployeeProfile        = lazy(() => import('./pages/EmployeeProfile'))
const AttendancePage         = lazy(() => import('./pages/AttendancePage'))
const AttendanceCalendarPage = lazy(() => import('./pages/AttendanceCalendarPage'))
const LeavePage              = lazy(() => import('./pages/LeavePage'))
const DepartmentsPage        = lazy(() => import('./pages/DepartmentsPage'))
const AdminsPage             = lazy(() => import('./pages/AdminsPage'))
const AuditPage              = lazy(() => import('./pages/AuditPage'))
const SettingsPage           = lazy(() => import('./pages/SettingsPage'))
const HealthPage             = lazy(() => import('./pages/HealthPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="spinner w-7 h-7" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner w-10 h-10" />
        <p className="text-ink-400 text-sm animate-pulse">Loading HRMS…</p>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950">
      <div className="spinner w-10 h-10" />
    </div>
  )

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index                  element={<DashboardPage />} />
          <Route path="employees"       element={<EmployeesPage />} />
          <Route path="employees/:id"   element={<EmployeeProfile />} />
          <Route path="attendance"      element={<AttendancePage />} />
          <Route path="attendance/calendar" element={<AttendanceCalendarPage />} />
          <Route path="leave"           element={<LeavePage />} />
          <Route path="departments"     element={<DepartmentsPage />} />
          <Route path="admins"          element={<AdminsPage />} />
          <Route path="audit"           element={<AuditPage />} />
          <Route path="settings"        element={<SettingsPage />} />
          <Route path="health"          element={<HealthPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#15152a', color: '#e2e2ea',
              border: '1px solid rgba(124,106,247,0.2)',
              borderRadius: '12px', fontSize: '14px',
            },
            success: { iconTheme: { primary: '#2dd4a0', secondary: '#0a0a1a' } },
            error:   { iconTheme: { primary: '#f97462', secondary: '#0a0a1a' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
