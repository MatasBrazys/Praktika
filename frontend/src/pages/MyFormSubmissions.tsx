// src/pages/public/MyFormSubmissions.tsx

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { submissionAPI } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { extractErrorMessage } from '../lib/apiClient'
import BackButton from '../components/shared/BackButton'
import type { Submission } from '../types'
import '../styles/pages/public/form-list.css'
import '../styles/pages/public/my-submissions.css'

function getLabel(data: Record<string, unknown>): string {
  for (const val of Object.values(data)) {
    if (typeof val === 'string' && val.trim()) return val.trim()
    if (typeof val === 'number') return String(val)
  }
  return ''
}

function getFirstFieldName(data: Record<string, unknown>): string {
  const key = Object.keys(data)[0]
  return key ? key.replace(/_/g, ' ') : ''
}

export default function MyFormSubmissions() {
  const { formId } = useParams<{ formId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [formType, setFormType] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const all = await submissionAPI.mine()
      const mine = all
        .filter(s => s.form_id === Number(formId))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
      setSubmissions(mine)
      if (mine.length) setFormType(mine[0].form_type)
    } catch (err) {
      toast.error('Failed to load submissions', extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [formId, toast])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (!search.trim()) return submissions
    const q = search.trim().toLowerCase()
    return submissions.filter(s =>
      JSON.stringify(s.data).toLowerCase().includes(q) ||
      String(s.id).includes(q)
    )
  }, [submissions, search])

  if (loading) return (
    <div className="page-loading">
      <div className="spinner" />
      Loading submissions…
    </div>
  )

  return (
    <div className="user-page-container">
      <div className="user-forms-wrapper" style={{ maxWidth: 860 }}>

        <div className="page-header-simple">
          <BackButton to="/user/submissions" label="All Forms" />
          <h1>{formType || 'Submissions'}</h1>
          <p>{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
        </div>

        {submissions.length > 0 && (
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search submissions…"
            className="sub-search"
            style={{ width: '100%', marginBottom: '16px' }}
          />
        )}

        {filtered.length === 0 ? (
          <div className="empty-state-simple">
            <div className="empty-icon">📭</div>
            <h2>{search ? 'No results' : 'No submissions found'}</h2>
            <p>{search ? 'Try a different search term' : 'This form has no submissions from your account'}</p>
          </div>
        ) : (
          <div className="ms-list">
            {filtered.map((sub, idx) => {
              const label = getLabel(sub.data)
              const fieldHint = getFirstFieldName(sub.data)
              const isOpen = expandedId === sub.id

              return (
                <div key={sub.id} className="ms-entry" style={{ animationDelay: `${idx * 40}ms` }}>
                  <div className="ms-entry__row">
                    <div className="ms-entry__id">#{sub.id}</div>

                    <div className="ms-entry__body">
                      <h3 className="ms-entry__label">{label || `Submission #${sub.id}`}</h3>
                      {label && fieldHint && <span className="ms-entry__field">{fieldHint}</span>}
                    </div>

                    <div className="ms-entry__date">
                      <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                      {sub.updated_at && <span className="ms-edited-pill">edited</span>}
                    </div>

                    <div className="ms-entry__actions">
                      <button className="ms-btn-edit" onClick={() => navigate(`/user/forms/${sub.form_id}/edit/${sub.id}`)}>
                        Edit
                      </button>
                      <button
                        className={`ms-btn-data ${isOpen ? 'ms-btn-data--open' : ''}`}
                        onClick={() => setExpandedId(isOpen ? null : sub.id)}
                      >
                        {isOpen ? 'Hide' : 'Data'}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="ms-entry__expand">
                      <pre>{JSON.stringify(sub.data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}