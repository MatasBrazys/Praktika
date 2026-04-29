// src/pages/public/MyFormSubmissions.tsx

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { submissionAPI, formAPI } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { extractErrorMessage } from '../lib/apiClient'
import BackButton from '../components/shared/BackButton'
import SubmissionLogs from '../components/shared/SubmissionLogs'
import type { Submission } from '../types'
import '../styles/pages/public/form-list.css'
import '../styles/pages/public/my-submissions.css'

// ── Types & helpers ───────────────────────────────────────────────────────────

type DateRange = 'all' | 'today' | '7d' | '30d' | '3m'


function inRange(iso: string, range: DateRange): boolean {
  if (range === 'all') return true
  const d = new Date(iso)
  if (range === 'today') return d.toDateString() === new Date().toDateString()
  const cutoff = new Date()
  if (range === '7d')  cutoff.setDate(cutoff.getDate() - 7)
  if (range === '30d') cutoff.setDate(cutoff.getDate() - 30)
  if (range === '3m')  cutoff.setMonth(cutoff.getMonth() - 3)
  return d >= cutoff
}

function getLabel(data: Record<string, unknown>): string {
  for (const val of Object.values(data)) {
    if (typeof val === 'string' && val.trim()) return val.trim()
    if (typeof val === 'number') return String(val)
  }
  return ''
}

// ── Sub-components ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:   '#f59e0b',
  confirmed: '#10b981',
  declined:  '#ef4444',
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="ms-status-pill" style={{ background: STATUS_COLORS[status] ?? '#6b7280' }}>
      {status}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyFormSubmissions() {
  const { formId } = useParams<{ formId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [formType, setFormType] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [logsOpenId, setLogsOpenId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>('all')

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

  const handleDelete = async (sub: Submission) => {
    try {
      await formAPI.deleteSubmission(sub.form_id, sub.id)
      setSubmissions(prev => prev.filter(s => s.id !== sub.id))
      setDeletingId(null)
      toast.success('Deleted', `Submission #${sub.id} has been deleted.`)
    } catch (err) {
      toast.error('Failed to delete', extractErrorMessage(err))
      setDeletingId(null)
    }
  }

  const filtered = useMemo(() => {
    let result = submissions.filter(s => inRange(s.created_at, dateRange))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(s =>
        JSON.stringify(s.data).toLowerCase().includes(q) ||
        String(s.id).includes(q)
      )
    }
    return result
  }, [submissions, search, dateRange])

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
          <div className="ms-toolbar">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search submissions…"
              className="sub-search"
            />
            <select
              className="ms-date-select"
              value={dateRange}
              onChange={e => setDateRange(e.target.value as DateRange)}
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="3m">Last 3 months</option>
            </select>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="empty-state-simple">
            <div className="empty-icon">📭</div>
            <h2>{search || dateRange !== 'all' ? 'No results' : 'No submissions found'}</h2>
            <p>{search || dateRange !== 'all' ? 'Try adjusting your filters' : 'This form has no submissions from your account'}</p>
          </div>
        ) : (
          <div className="ms-list">
            {filtered.map((sub, idx) => {
              const label = getLabel(sub.data)
              const isOpen = expandedId === sub.id
              const canEdit = sub.status === 'declined' || sub.status === 'pending'

              return (
                <div key={sub.id} className="ms-entry" style={{ animationDelay: `${idx * 40}ms` }}>
                  <div className="ms-entry__row">

                    <div className="ms-entry__id">#{sub.id}</div>

                    <div className="ms-entry__body">
                      <div className="ms-entry__headline">
                        <h3 className="ms-entry__label">{label || `Submission #${sub.id}`}</h3>
                        <StatusPill status={sub.status} />
                      </div>
                      <span className="ms-entry__dates">
                        received {new Date(sub.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="ms-entry__actions">
                      {canEdit && (
                        <button
                          className="ms-btn-edit"
                          onClick={() => navigate(`/user/forms/${sub.form_id}/edit/${sub.id}`)}
                        >
                          Edit
                        </button>
                      )}
                      {sub.status === 'declined' && (
                        deletingId === sub.id ? (
                          <>
                            <button className="ms-btn-delete-confirm" onClick={() => handleDelete(sub)}>
                              Confirm
                            </button>
                            <button className="ms-btn-cancel" onClick={() => setDeletingId(null)}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button className="ms-btn-delete" onClick={() => setDeletingId(sub.id)}>
                            Delete
                          </button>
                        )
                      )}
                      <button
                        className={`ms-btn-data ${isOpen ? 'ms-btn-data--open' : ''}`}
                        onClick={() => setExpandedId(isOpen ? null : sub.id)}
                      >
                        {isOpen ? 'Hide' : 'Data'}
                      </button>
                      <button
                        className={`ms-btn-data ${logsOpenId === sub.id ? 'ms-btn-data--open' : ''}`}
                        onClick={() => setLogsOpenId(logsOpenId === sub.id ? null : sub.id)}
                      >
                        Logs
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="ms-entry__expand">
                      <pre>{JSON.stringify(sub.data, null, 2)}</pre>
                    </div>
                  )}
                  {logsOpenId === sub.id && (
                    <SubmissionLogs submissionId={sub.id} />
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
