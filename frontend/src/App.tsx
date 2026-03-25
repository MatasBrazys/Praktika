// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }  from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import PrivateRoute      from './components/shared/PrivateRoute'
import ToastStack        from './components/shared/Toast'
import ErrorBoundary     from './components/shared/ErrorBoundary'

import LoginPage      from './pages/LoginPage'
import Home           from './pages/Home'
import FormList       from './pages/admin/FormList'
import FormBuilder    from './pages/admin/FormBuilder'
import SubmissionList from './pages/admin/SubmissionList'
import UserFormList   from './pages/public/FormList'
import PublicForm     from './pages/public/Form'
import MySubmissions      from './pages/public/MySubmissions'
import MyFormSubmissions from './pages/public/MyFormSubmissions'
import SuccessPage       from './pages/public/Success'
import LookupConfigs from './pages/admin/LookupConfigs'

import './styles/components/error-boundary.css'

// const ThrowError = () => { throw new Error('Test global boundary') }

export default function App() {
  return (
    <ErrorBoundary variant="fullPage">
      {/* <ThrowError/>  */}
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>

              {/* ── Public — login only ────────────────────── */}
              <Route path="/login" element={<LoginPage />} />

              {/* ── Success page — no auth needed ─────────── */}
              <Route path="/user/forms/:id/success" element={<SuccessPage />} />

              {/* ── Protected: any authenticated user ──────── */}
              <Route element={<PrivateRoute />}>
                <Route path="/"                                  element={<Home />} />
                <Route path="/user/forms"                        element={<UserFormList />} />
                <Route path="/user/forms/:id"                    element={<PublicForm />} />
                <Route path="/user/forms/:id/edit/:submissionId" element={<PublicForm />} />
                <Route path="/user/submissions"                  element={<MySubmissions />} />
                <Route path="/user/submissions/:formId"          element={<MyFormSubmissions />} />
              </Route>

              {/* ── Protected: admin only ───────────────────── */}
              <Route element={<PrivateRoute requireAdmin />}>
                <Route path="/admin/forms"                     element={<FormList />} />
                <Route path="/admin/form-builder"              element={<FormBuilder />} />
                <Route path="/admin/form-builder/:id"          element={<FormBuilder />} />
                <Route path="/admin/forms/:id/submissions"     element={<SubmissionList />} />
                <Route path="/admin/lookup-configs" element={<LookupConfigs />} />
              </Route>

              {/* ── Fallback ────────────────────────────────── */}
              <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>

            <ToastStack />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}