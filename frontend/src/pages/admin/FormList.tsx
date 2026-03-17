// src/pages/admin/FormList.tsx

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { formAPI } from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { extractErrorMessage } from '../../lib/apiClient'
import Navbar from '../../components/shared/Navbar'
import type { FormDefinition } from '../../types'
import '../../styles/pages/admin/form-list.css'

// surveyjs_json is Record<string,unknown> — cast only for page/element counting
type JsonWithPages = { pages?: Array<{ elements?: unknown[] }>; elements?: unknown[] }

function getFieldCount(form: FormDefinition): number {
  const json = form.surveyjs_json as JsonWithPages
  if (json.pages) return json.pages.reduce((t, p) => t + (p.elements?.length ?? 0), 0)
  return json.elements?.length ?? 0
}

// ─── Delete Modal ──────────────────────────────────────────────────────────

interface DeleteModalProps {
  form: FormDefinition
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}

function DeleteConfirmModal({ form, onConfirm, onCancel, deleting }: DeleteModalProps) {
  const [inputValue, setInputValue] = useState('')
  const isMatch = inputValue === form.title

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) onCancel()
      if (e.key === 'Enter' && isMatch && !deleting) onConfirm()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel, onConfirm, isMatch, deleting])

  return (
    <div className="delete-modal-overlay" onClick={() => { if (!deleting) onCancel() }}>
      <div className="delete-modal" onClick={e => e.stopPropagation()}>

        <div className="delete-modal-header">
          <div className="delete-modal-title-row">
            <div className="delete-modal-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>
            <h2>Delete form</h2>
          </div>
          <button className="delete-modal-close" onClick={onCancel} disabled={deleting} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="delete-modal-body">
          <p className="delete-modal-desc">
            This action <strong>cannot be undone</strong>. The following will be permanently deleted:
          </p>
          <ul className="delete-consequences">
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Form definition and all configuration
            </li>
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              All submissions associated with this form
            </li>
          </ul>
          <div className="delete-modal-field">
            <label htmlFor="confirm-input">
              Type <span className="delete-modal-name-inline">{form.title}</span> to confirm
            </label>
            <input
              id="confirm-input"
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Enter form name"
              className={isMatch ? 'match' : ''}
              autoFocus
              autoComplete="off"
              disabled={deleting}
              spellCheck={false}
            />
          </div>
        </div>

        <div className="delete-modal-footer">
          <button className="btn-modal-cancel" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button
            className={`btn-modal-delete ${isMatch && !deleting ? 'enabled' : ''}`}
            onClick={onConfirm}
            disabled={!isMatch || deleting}
          >
            {deleting ? <><span className="delete-spinner" />Deleting…</> : 'Delete form'}
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────

export default function FormList() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [forms, setForms] = useState<FormDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [formToDelete, setFormToDelete] = useState<FormDefinition | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadForms = useCallback(async () => {
    try {
      setLoading(true)
      setForms(await formAPI.list())
    } catch (err) {
      toast.error('Failed to load forms', extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadForms() }, [loadForms])

  const handleDeleteConfirm = async () => {
    if (!formToDelete) return
    setDeleting(true)
    try {
      await formAPI.delete(formToDelete.id!)
      setForms(prev => prev.filter(f => f.id !== formToDelete.id))
      setFormToDelete(null)
      toast.success('Form deleted', `"${formToDelete.title}" has been removed.`)
    } catch (err) {
      toast.error('Delete failed', extractErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (form: FormDefinition) => {
    try {
      await formAPI.toggleActive(form.id!)
      await loadForms()
      toast.success(
        form.is_active ? 'Form deactivated' : 'Form activated',
        `"${form.title}" is now ${form.is_active ? 'inactive' : 'active'}.`,
      )
    } catch (err) {
      toast.error('Failed to update form', extractErrorMessage(err))
    }
  }

  if (loading) return <div className="page-loading">Loading forms…</div>

  return (
    <>
      <Navbar />
      <div className="page-container-admin">
        <div className="form-list-wrapper">

          <div className="page-header">
            <div>
              <h1>Form Management</h1>
              <p className="subtitle">Create and manage your forms</p>
            </div>
            <button className="btn-create" onClick={() => navigate('/admin/form-builder')}>
              + Create New Form
            </button>
          </div>

          {forms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h2>No forms yet</h2>
              <p>Create your first form to get started</p>
              <button className="btn-create" onClick={() => navigate('/admin/form-builder')}>
                Create Form
              </button>
            </div>
          ) : (
            <div className="forms-grid">
              {forms.map(form => (
                <div key={form.id} className={`form-card ${!form.is_active ? 'inactive' : ''}`}>
                  <div className="card-header">
                    <h3>{form.title}</h3>
                    <span className={`status ${form.is_active ? 'active' : 'inactive'}`}>
                      {form.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                  <p className="card-description">{form.description ?? 'No description provided'}</p>
                  <div className="card-meta">
                    <span>📝 {getFieldCount(form)} fields</span>
                    <span>📅 {new Date(form.created_at!).toLocaleDateString()}</span>
                  </div>
                  <div className="card-actions">
                    <button className="btn-edit" onClick={() => navigate(`/admin/form-builder/${form.id}`)}>Edit</button>
                    <button className="btn-view" onClick={() => navigate(`/admin/forms/${form.id}/submissions`)}>Submissions</button>
                    <button className={`btn-toggle ${form.is_active ? '' : 'activate'}`} onClick={() => handleToggleActive(form)}>
                      {form.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="btn-delete" onClick={() => setFormToDelete(form)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {formToDelete && (
        <DeleteConfirmModal
          form={formToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { if (!deleting) setFormToDelete(null) }}
          deleting={deleting}
        />
      )}
    </>
  )
}
