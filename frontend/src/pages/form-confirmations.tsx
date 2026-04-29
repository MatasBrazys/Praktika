// src/pages/form-confirmations.tsx

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { formAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { extractErrorMessage } from '../lib/apiClient'
import type { FormDefinition } from '../types'
import '../styles/pages/admin/form-list.css'

type JsonWithPages = { pages?: Array<{ elements?: unknown[] }>; elements?: unknown[] }

function getFieldCount(form: FormDefinition): number {
  const json = form.surveyjs_json as JsonWithPages
  if (json.pages) return json.pages.reduce((t, p) => t + (p.elements?.length ?? 0), 0)
  return json.elements?.length ?? 0
}

interface FormWithCounts {
  form: FormDefinition
  total: number
  pending: number
}

export default function FormConfirmerList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'
  const [items, setItems] = useState<FormWithCounts[]>([])
  const [loading, setLoading] = useState(true)

  const loadForms = useCallback(async () => {
    try {
      setLoading(true)
      const all = await formAPI.list()
      const active = all.filter(f => f.is_active)

      // Fetch submission counts in parallel
      const withCounts = await Promise.all(
        active.map(async form => {
          try {
            const subs = await formAPI.getSubmissions(form.id!)
            const pending = subs.filter(s => (s.status ?? 'pending') === 'pending').length
            return { form, total: subs.length, pending }
          } catch {
            return { form, total: 0, pending: 0 }
          }
        })
      )

      setItems(withCounts)
    } catch (err) {
      toast.error('Failed to load forms', extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadForms() }, [loadForms])

  if (loading) return (
    <div className="page-loading"><div className="spinner" />Loading forms…</div>
  )

  return (
    <div className="page-container-admin">
      <div className="form-list-wrapper">

        <div className="page-header">
          <div>
            <h1>Form Confirmations</h1>
            <p className="subtitle">Review and confirm submissions</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h2>No active forms</h2>
            <p>Active forms will appear here once created by an administrator.</p>
          </div>
        ) : (
          <div className="forms-grid">
            {items.map(({ form, total, pending }) => (
              <div key={form.id} className="form-card">
                <div className="card-header">
                  <h3>{form.title}</h3>
                  {pending > 0
                    ? <span className="status inactive">⏳ {pending} pending</span>
                    : <span className="status active">✓ All reviewed</span>
                  }
                </div>
                <p className="card-description">
                  {form.description ?? 'No description provided'}
                </p>
                <div className="card-meta">
                  <span>📝 {getFieldCount(form)} fields</span>
                  <span>📥 {total} submissions</span>
                  <span>📅 {new Date(form.created_at!).toLocaleDateString()}</span>
                </div>
                <div className="card-actions" style={{ gridTemplateColumns: '1fr' }}>
                  <button
                    className={pending > 0 ? 'btn-edit' : 'btn-view'}
                    onClick={() => navigate(
                      isAdmin
                        ? `/admin/forms/${form.id}/submissions`
                        : `/form-confirmations/submissions/${form.id}`
                    )}
                  >
                    {pending > 0 ? `Review ${pending} pending` : 'View submissions'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}