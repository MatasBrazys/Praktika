// src/pages/admin/SubmissionList.tsx

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate }  from 'react-router-dom'
import { formAPI }                 from '../../services/api'
import { useToast }                from '../../contexts/ToastContext'
import { extractErrorMessage }     from '../../lib/apiClient'
import Navbar                      from '../../components/shared/Navbar'
import BackButton                  from '../../components/shared/BackButton'
import type { Submission, SubmissionStatus } from '../../types'
import '../../styles/pages/admin/submission-list.css'

// ── Status config ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; className: string; next: SubmissionStatus }> = {
  pending:  { label: 'Pending',  className: 'sub-status sub-status--pending',  next: 'reviewed'  },
  reviewed: { label: 'Reviewed', className: 'sub-status sub-status--reviewed', next: 'archived'  },
  archived: { label: 'Archived', className: 'sub-status sub-status--archived', next: 'pending'   },
}

// ── Data display helpers ──────────────────────────────────────────────────

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
        <button
          className={`sub-data__toggle ${!showJson ? 'active' : ''}`}
          onClick={() => setShowJson(false)}
        >
          Fields
        </button>
        <button
          className={`sub-data__toggle ${showJson ? 'active' : ''}`}
          onClick={() => setShowJson(true)}
        >
          JSON
        </button>
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

export default function SubmissionList() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const { toast } = useToast()

  const [submissions,   setSubmissions]   = useState<Submission[]>([])
  const [formTitle,     setFormTitle]     = useState('')
  const [loading,       setLoading]       = useState(true)
  const [expandedId,    setExpandedId]    = useState<number | null>(null)
  const [search,        setSearch]        = useState('')
  const [filterStatus,  setFilterStatus]  = useState<SubmissionStatus | 'all'>('all')
  const [updatingId,    setUpdatingId]    = useState<number | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [form, subs] = await Promise.all([
        formAPI.get(Number(id)),
        formAPI.getSubmissions(Number(id)),
      ])
      setFormTitle(form.title)
      setSubmissions(subs)
    } catch (err) {
      toast.error('Failed to load submissions', extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => { loadData() }, [loadData])

  // ── Status cycle ────────────────────────────────────────────────────────

  const handleStatusClick = async (sub: Submission) => {
    const nextStatus = STATUS_CONFIG[sub.status ?? 'pending'].next
    setUpdatingId(sub.id)
    try {
      const updated = await formAPI.updateSubmissionStatus(Number(id), sub.id, nextStatus)
      setSubmissions(prev => prev.map(s => s.id === sub.id ? updated : s))
    } catch (err) {
      toast.error('Failed to update status', extractErrorMessage(err))
    } finally {
      setUpdatingId(null)
    }
  }

  // ── CSV export ───────────────────────────────────────────────────────────

  const exportToCSV = () => {
    if (!filtered.length) return

    const allFields = Array.from(
      new Set(filtered.flatMap(s => Object.keys(s.data)))
    )

    const rows = [
      ['ID', 'Status', 'Submitted by', 'Submitted at', 'Edited at', ...allFields],
      ...filtered.map(s => [
        String(s.id),
        s.status ?? 'pending',
        s.submitted_by_username ?? String(s.submitted_by_user_id ?? ''),
        new Date(s.created_at).toLocaleString(),
        s.updated_at ? new Date(s.updated_at).toLocaleString() : '',
        ...allFields.map(f => String((s.data as Record<string, unknown>)[f] ?? '')),
      ]),
    ]

    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `${formTitle.replace(/\s+/g, '_')}_submissions.csv`,
    })
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export ready', `${filtered.length} submissions downloaded.`)
  }

  // ── Filtering ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = submissions

    if (filterStatus !== 'all') {
      result = result.filter(s => (s.status ?? 'pending') === filterStatus)
    }

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

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <>
      <Navbar />
      <div className="page-loading"><div className="spinner" />Loading submissions…</div>
    </>
  )

  return (
    <>
      <Navbar />
      <div className="page-container-admin">
        <div className="submissions-wrapper">

          <div className="page-header">
            <div>
              <BackButton to="/admin/forms" label="Back to Forms" />
              <h1>Submissions: {formTitle}</h1>
              <p className="subtitle">{submissions.length} total</p>
            </div>
            <div className="header-actions">
              <button className="btn-export" onClick={exportToCSV} disabled={!filtered.length}>
                Export CSV
              </button>
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
                  {s === 'all' ? `All (${submissions.length})` : `${STATUS_CONFIG[s].label} (${submissions.filter(x => (x.status ?? 'pending') === s).length})`}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h2>{search || filterStatus !== 'all' ? 'No results' : 'No submissions yet'}</h2>
            </div>
          ) : (
            <div className="sub-list">
              {filtered.map(sub => {
                const status = sub.status ?? 'pending'
                const cfg    = STATUS_CONFIG[status]
                const isOpen = expandedId === sub.id

                return (
                  <div key={sub.id} className={`sub-entry ${isOpen ? 'sub-entry--open' : ''}`}>
                    <div className="sub-entry__row">

                      {/* ID */}
                      <span className="sub-entry__id">#{sub.id}</span>

                      {/* Status — click to cycle */}
                      <button
                        className={`${cfg.className} ${updatingId === sub.id ? 'sub-status--loading' : ''}`}
                        onClick={() => handleStatusClick(sub)}
                        title="Click to change status"
                        disabled={updatingId === sub.id}
                      >
                        {updatingId === sub.id ? '…' : cfg.label}
                      </button>

                      {/* Who + when */}
                      <div className="sub-entry__meta">
                        <span className="sub-entry__user">
                          {sub.submitted_by_username ?? `user #${sub.submitted_by_user_id ?? '?'}`}
                        </span>
                        <span className="sub-entry__dates">
                          <span title="Submitted">{new Date(sub.created_at).toLocaleString()}</span>
                          {sub.updated_at && (
                            <span className="sub-entry__edited" title={`Edited by ${sub.updated_by_username ?? 'unknown'}`}>
                              · edited {new Date(sub.updated_at).toLocaleString()}
                              {sub.updated_by_username && ` by ${sub.updated_by_username}`}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="sub-entry__actions">
                        <button
                          className="sub-btn sub-btn--edit"
                          onClick={() => navigate(`/user/forms/${sub.form_id}/edit/${sub.id}`)}
                        >
                          Edit
                        </button>
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
    </>
  )
}