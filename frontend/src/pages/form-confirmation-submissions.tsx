// src/pages/form-confirmation-submissions.tsx

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { formAPI } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { extractErrorMessage } from '../lib/apiClient'
import BackButton from '../components/shared/BackButton'
import SubmissionLogs from '../components/shared/SubmissionLogs'
import type { Submission } from '../types'
import '../styles/pages/admin/submission-list.css'
import '../styles/components/modal.css'

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

export default function FormConfirmationSubmissions() {
  const { formId } = useParams<{ formId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [formTitle, setFormTitle] = useState('')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('pending')
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7d' | '30d' | '3m'>('all')
  const [logsOpenId, setLogsOpenId] = useState<number | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [showDeclineModal, setShowDeclineModal] = useState<number | null>(null)
  const [declineComment, setDeclineComment] = useState('')

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
    setProcessingId(submissionId)
    try {
      await formAPI.updateSubmissionStatus(Number(formId), submissionId, 'confirmed')
      toast.success('Confirmed', `Submission #${submissionId} has been approved.`)
      await loadData()
    } catch (err) {
      toast.error('Failed to confirm', extractErrorMessage(err))
    } finally {
      setProcessingId(null)
    }
  }

  const handleDecline = async () => {
    if (!showDeclineModal || !declineComment.trim()) {
      toast.error('Comment required', 'Please explain why this submission is being declined.')
      return
    }
    
    setProcessingId(showDeclineModal)
    try {
      await formAPI.updateSubmissionStatus(Number(formId), showDeclineModal, 'declined', declineComment.trim())
      toast.success('Declined', `Submission #${showDeclineModal} has been declined.`)
      setShowDeclineModal(null)
      setDeclineComment('')
      await loadData()
    } catch (err) {
      toast.error('Failed to decline', extractErrorMessage(err))
    } finally {
      setProcessingId(null)
    }
  }

  const filtered = useMemo(() => {
    let result = submissions
    if (filterStatus !== 'all') result = result.filter(s => s.status === filterStatus)
    if (dateRange !== 'all') {
      const cutoff = new Date()
      if (dateRange === 'today') {
        const today = new Date().toDateString()
        result = result.filter(s => new Date(s.created_at).toDateString() === today)
      } else {
        if (dateRange === '7d')  cutoff.setDate(cutoff.getDate() - 7)
        if (dateRange === '30d') cutoff.setDate(cutoff.getDate() - 30)
        if (dateRange === '3m')  cutoff.setMonth(cutoff.getMonth() - 3)
        result = result.filter(s => new Date(s.created_at) >= cutoff)
      }
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(s =>
        JSON.stringify(s.data).toLowerCase().includes(q) ||
        (s.submitted_by_username ?? '').toLowerCase().includes(q) ||
        String(s.id).includes(q)
      )
    }
    return [...result].sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [submissions, filterStatus, search, dateRange])

  const counts = useMemo(() => ({
    all: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    confirmed: submissions.filter(s => s.status === 'confirmed').length,
    declined: submissions.filter(s => s.status === 'declined').length,
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
            {(['all', 'pending', 'confirmed', 'declined'] as const).map(s => (
              <button
                key={s}
                className={`sub-filter-btn ${filterStatus === s ? 'active' : ''}`}
                onClick={() => setFilterStatus(s)}
              >
                {s === 'all' ? `All (${counts.all})` :
                 s === 'pending' ? `Pending (${counts.pending})` :
                 s === 'confirmed' ? `Confirmed (${counts.confirmed})` :
                 `Declined (${counts.declined})`}
              </button>
            ))}
            <select
              className="ms-date-select"
              value={dateRange}
              onChange={e => setDateRange(e.target.value as typeof dateRange)}
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="3m">Last 3 months</option>
            </select>
          </div>
        </div>

        {/* ── Decline Modal ── */}
        {showDeclineModal !== null && (
          <div className="modal-overlay">
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Decline Submission #{showDeclineModal}</h3>
                <button className="close-btn" onClick={() => { setShowDeclineModal(null); setDeclineComment('') }}>×</button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: 12, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                  This reason will be visible to the submitter and included in the notification email.
                </p>
                <textarea
                  value={declineComment}
                  onChange={e => setDeclineComment(e.target.value)}
                  placeholder="Enter reason for declining…"
                  rows={4}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', resize: 'vertical', outline: 'none' }}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  onClick={() => { setShowDeclineModal(null); setDeclineComment('') }}
                  disabled={processingId !== null}
                >
                  Cancel
                </button>
                <button
                  className="sub-btn sub-btn--danger"
                  onClick={handleDecline}
                  disabled={processingId !== null || !declineComment.trim()}
                >
                  {processingId === showDeclineModal ? 'Declining…' : 'Decline'}
                </button>
              </div>
            </div>
          </div>
        )}

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
              const isPending = sub.status === 'pending'

              return (
                <div key={sub.id} className={`sub-entry ${isOpen ? 'sub-entry--open' : ''}`}>
                  <div className="sub-entry__row">

                    <span className="sub-entry__id">#{sub.id}</span>

                    <span className={`sub-status sub-status--${sub.status}`}>
                      {sub.status}
                    </span>

                    <div className="sub-entry__meta">
                      <span className="sub-entry__user">
                        {sub.submitted_by_username ?? 'Unknown'}
                      </span>
                      <span className="sub-entry__dates">
                        received {new Date(sub.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="sub-entry__actions">
                      {isPending && (
                        <>
                          <button
                            className="sub-btn sub-btn--approve"
                            onClick={() => handleConfirm(sub.id)}
                            disabled={processingId === sub.id}
                          >
                            {processingId === sub.id ? '…' : '✓ Approve'}
                          </button>
                          <button
                            className="sub-btn sub-btn--decline"
                            onClick={() => setShowDeclineModal(sub.id)}
                            disabled={processingId === sub.id}
                          >
                            ✗ Decline
                          </button>
                        </>
                      )}
                      <button
                        className={`sub-btn sub-btn--data ${isOpen ? 'active' : ''}`}
                        onClick={() => setExpandedId(isOpen ? null : sub.id)}
                      >
                        {isOpen ? 'Hide' : 'View'}
                      </button>
                      <button
                        className={`sub-btn sub-btn--data ${logsOpenId === sub.id ? 'active' : ''}`}
                        onClick={() => setLogsOpenId(logsOpenId === sub.id ? null : sub.id)}
                      >
                        Logs
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="sub-entry__body">
                      <DataDisplay data={sub.data} />
                    </div>
                  )}
                  {logsOpenId === sub.id && (
                    <SubmissionLogs submissionId={sub.id} formId={Number(formId)} />
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
