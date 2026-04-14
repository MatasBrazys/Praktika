// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation} from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider }  from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import PrivateRoute      from './components/shared/PrivateRoute'
import ToastStack        from './components/shared/Toast'
import ErrorBoundary     from './components/shared/ErrorBoundary'
import Navbar            from './components/shared/Navbar'

import LoginPage         from './pages/LoginPage'
import Home              from './pages/Home'
import ProfilePage from './pages/Profile'
import FormList          from './pages/admin/FormList'
import FormBuilder       from './pages/admin/FormBuilder'
import SubmissionList    from './pages/admin/SubmissionList'
import UserFormList      from './pages/FormList'
import PublicForm        from './pages/Form'
import MySubmissions     from './pages/MySubmissions'
import MyFormSubmissions from './pages/MyFormSubmissions'
import SuccessPage       from './pages/Success'
import LookupConfigs     from './pages/admin/LookupConfigs'
import FormConfirmerList from './pages/form-confirmations'
import FormConfirmationSubmissions from './pages/form-confirmation-submissions'

import './styles/components/error-boundary.css'

// Shared layout — renders Navbar once, pages render inside <Outlet />
function Layout() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  useEffect(() => {
    document.body.classList.toggle('theme-admin', isAdmin)
    return () => document.body.classList.remove('theme-admin')
  }, [isAdmin])

  return (
    <>
      <Navbar />
      <Outlet />
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary variant="fullPage">
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>

              {/* ── Public — no Navbar ────────────────────── */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/user/forms/:id/success" element={<SuccessPage />} />

              {/* ── Protected: any authenticated user ──────── */}
              <Route element={<PrivateRoute />}>
                <Route element={<Layout />}>
                  <Route path="/"                                  element={<Home />} />
                  <Route path="/user/forms"                        element={<UserFormList />} />
                  <Route path="/user/forms/:id"                    element={<PublicForm />} />
                  <Route path="/user/forms/:id/edit/:submissionId" element={<PublicForm />} />
                  <Route path="/user/submissions"                  element={<MySubmissions />} />
                  <Route path="/user/submissions/:formId"          element={<MyFormSubmissions />} />
                  <Route path="/user/profile"                      element={<ProfilePage/>} />
                </Route>
              </Route>

              {/* ── Protected: admin only ───────────────────── */}
              <Route element={<PrivateRoute allowedRoles={['admin']} />}>
                <Route element={<Layout />}>
                  <Route path="/admin/forms"                   element={<FormList />} />
                  <Route path="/admin/form-builder"            element={<FormBuilder />} />
                  <Route path="/admin/form-builder/:id"        element={<FormBuilder />} />
                  <Route path="/admin/forms/:id/submissions"   element={<SubmissionList />} />
                  <Route path="/admin/lookup-configs"          element={<LookupConfigs />} />
                </Route>
              </Route>

              {/* ── Protected: form_confirmer only ───────────────────── */}
              <Route element={<PrivateRoute allowedRoles={['form_confirmer', 'admin']} />}>
                <Route element={<Layout />}>
                  <Route path="/form-confirmations"                        element={<FormConfirmerList />} />
                  <Route path="/form-confirmations/submissions/:formId"    element={<FormConfirmationSubmissions />} />
                </Route>
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