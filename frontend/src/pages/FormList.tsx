// src/pages/public/FormList.tsx

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { formAPI } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { extractErrorMessage } from '../lib/apiClient'

import type { FormDefinition } from '../types'
import '../styles/pages/public/form-list.css'

// surveyjs_json is Record<string,unknown> — cast only for page/element counting
type JsonWithPages = { pages?: Array<{ elements?: unknown[] }>; elements?: unknown[] }

function getFieldCount(form: FormDefinition): number {
  const json = form.surveyjs_json as JsonWithPages
  if (json.pages) return json.pages.reduce((t, p) => t + (p.elements?.length ?? 0), 0)
  return json.elements?.length ?? 0
}

export default function FormList() {
  const [forms, setForms] = useState<FormDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadForms = useCallback(async () => {
    try {
      setLoading(true)
      const data = await formAPI.list()
      setForms(data.filter(f => f.is_active))
    } catch (err) {
      toast.error('Failed to load forms', extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadForms() }, [loadForms])

  if (loading) return (
    <div className="page-loading"><div className="spinner" />Loading available forms…</div>
  )

  return (

    <div className="user-page-container">
      <div className="user-forms-wrapper">

        <div className="page-header-simple">
          <h1>Available Forms</h1>
          <p>Select a form to register a client</p>
        </div>

        {forms.length === 0 ? (
          <div className="empty-state-simple">
            <div className="empty-icon">📋</div>
            <h2>No forms available</h2>
            <p>Please contact your administrator</p>
          </div>
        ) : (
          <div className="forms-list-simple">
            {forms.map(form => (
              <Link key={form.id} to={`/user/forms/${form.id}`} className="form-list-item">
                <div className="form-item-header">
                  <h3>{form.title}</h3>
                  <span className="arrow">→</span>
                </div>
                <p className="form-item-description">
                  {form.description ?? 'Click to fill out this form'}
                </p>
                <div className="form-item-meta">
                  <span>📝 {getFieldCount(form)} fields</span>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>

  )
}
