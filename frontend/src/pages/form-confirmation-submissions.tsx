// src/pages/form-confirmation-submissions.tsx

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiClient } from '../lib/apiClient'
import { formAPI } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { extractErrorMessage } from '../lib/apiClient'
import BackButton from '../components/shared/BackButton'
import type { Submission, SubmissionStatus } from '../types'
import '../styles/pages/admin/submission-list.css'

// ── Data display ──────────────────────────────────────────────────────────

function flattenData(data: Record<string, unknown>): { key: string; value: string }[] {
  const entries: { key: string; value: string }[] = []
  const walk = (obj: unknown, prefix = '') => {
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => walk(item, prefix ? `${prefix}[${i}]` : `[${i}]`))
    } else if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        walk(v, prefix ? `${prefix}.${k}` : k)
      }
    } else {
      entries.push({ key: prefix, value: String(obj ?? '') })
    }
  }
  walk(data)
  return entries
}

function DataDisplay({ data }: { data: Record<string, unknown> }) {
  const [showJson, setShowJson] = useState(false)
  const flat = useMemo(() => flattenData(data), [data])

  return (
    <div className="sub-data">
      <div className="sub-data__toggle-row">
        <button className={`sub-data__toggle ${!showJson ? 'active' : ''}`} onClick={() => setShowJson(false)}>Fields</button>
        <button className={`sub-data__toggle ${showJson ? 'active' : ''}`} onClick={() => setShowJson(true)}>JSON</button>
      </div>
      {showJson ? (
        <pre className="sub-data__json">{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <dl className="sub-data__fields">
          {flat.map(({ key, value }) => (
            <div key={key} className="sub-data__field">
              <dt>{key}</dt>
              <dd>{value || <em>empty</em>}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function FormConfirmationSubmissions() {
  const { formId } = useParams<{ formId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [formTitle, setFormTitle] = useState('')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<SubmissionStatus | 'all'>('all')
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [form, subs] = await Promise.all([
        formAPI.get(Number(formId)),
        formAPI.getSubmissions(Number(formId)),
      ])
      setFormTitle(form.title)
      setSubmissions(subs)
    } catch (err) {
      toast.error('Failed to load data', extractErrorMessage(err))
      navigate('/form-confirmations')
    } finally {
      setLoading(false)
    }
  }, [formId, toast, navigate])

  useEffect(() => { loadData() }, [loadData])

  const handleConfirm = async (submissionId: number) => {
    setConfirmingId(submissionId)
    try {
      await apiClient.patch(
        `/api/forms/${formId}/submissions/${submissionId}/status`,
        { status: 'reviewed' }
      )
      toast.success('Confirmed', `Submission #${submissionId} marked as reviewed.`)
      await loadData()
    } catch (err) {
      toast.error('Failed to confirm', extractErrorMessage(err))
    } finally {
      setConfirmingId(null)
    }
  }

  const filtered = useMemo(() => {
    let result = submissions
    if (filterStatus !== 'all') result = result.filter(s => (s.status ?? 'pending') === filterStatus)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(s =>
        JSON.stringify(s.data).toLowerCase().includes(q) ||
        (s.submitted_by_username ?? '').toLowerCase().includes(q) ||
        String(s.id).includes(q)
      )
    }
    return result
  }, [submissions, filterStatus, search])

  const counts = useMemo(() => ({
    all: submissions.length,
    pending: submissions.filter(s => (s.status ?? 'pending') === 'pending').length,
    reviewed: submissions.filter(s => s.status === 'reviewed').length,
    archived: submissions.filter(s => s.status === 'archived').length,
  }), [submissions])

  if (loading) return (
    <div className="page-loading"><div className="spinner" />Loading submissions…</div>
  )

  return (
    <div className="page-container-admin">
      <div className="submissions-wrapper">

        <div className="page-header">
          <div>
            <BackButton to="/form-confirmations" label="Back to Forms" />
            <h1>{formTitle}</h1>
            <p className="subtitle">{submissions.length} total submissions</p>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="sub-toolbar">
          <input
            className="sub-search"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by content, username or ID…"
          />
          <div className="sub-filter-group">
            {(['all', 'pending', 'reviewed', 'archived'] as const).map(s => (
              <button
                key={s}
                className={`sub-filter-btn ${filterStatus === s ? 'active' : ''}`}
                onClick={() => setFilterStatus(s)}
              >
                {s === 'all' ? `All (${counts.all})` :
                 s === 'pending' ? `Pending (${counts.pending})` :
                 s === 'reviewed' ? `Reviewed (${counts.reviewed})` :
                 `Archived (${counts.archived})`}
              </button>
            ))}
          </div>
        </div>

        {/* ── List ── */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h2>{search || filterStatus !== 'all' ? 'No results' : 'No submissions yet'}</h2>
          </div>
        ) : (
          <div className="sub-list">
            {filtered.map(sub => {
              const isOpen = expandedId === sub.id
              const isPending = (sub.status ?? 'pending') === 'pending'

              return (
                <div key={sub.id} className={`sub-entry ${isOpen ? 'sub-entry--open' : ''}`}>
                  <div className="sub-entry__row">

                    <span className="sub-entry__id">#{sub.id}</span>

                    {/* Status badge — read only for confirmer */}
                    <span className={`sub-status sub-status--${sub.status ?? 'pending'}`}>
                      {sub.status ?? 'pending'}
                    </span>

                    <div className="sub-entry__meta">
                      <span className="sub-entry__user">
                        {sub.submitted_by_username ?? `user #${sub.submitted_by_user_id ?? '?'}`}
                      </span>
                      <span className="sub-entry__dates">
                        {new Date(sub.created_at).toLocaleString()}
                        {sub.updated_at && sub.updated_by_user_id && (
                          <span className="sub-entry__edited">
                            · reviewed {new Date(sub.updated_at).toLocaleString()}
                            {sub.updated_by_username && ` by ${sub.updated_by_username}`}
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="sub-entry__actions">
                      {isPending && (
                        <button
                          className="sub-btn sub-btn--edit"
                          onClick={() => handleConfirm(sub.id)}
                          disabled={confirmingId === sub.id}
                        >
                          {confirmingId === sub.id ? 'Confirming…' : '✓ Confirm'}
                        </button>
                      )}
                      <button
                        className={`sub-btn sub-btn--data ${isOpen ? 'active' : ''}`}
                        onClick={() => setExpandedId(isOpen ? null : sub.id)}
                      >
                        {isOpen ? 'Hide' : 'View'}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="sub-entry__body">
                      <DataDisplay data={sub.data} />
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