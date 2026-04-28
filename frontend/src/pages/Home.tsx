// src/pages/Home.tsx

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { dashboardAPI } from '../services/api'
import type { DashboardData } from '../services/api'
import '../styles/pages/home.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  admin:          'Administrator',
  form_confirmer: 'Form Confirmer',
  user:           'User',
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function StatusDot({ status }: { status: string }) {
  return <span className={`dash-dot dash-dot--${status}`} aria-label={status} />
}

// ── Role views ────────────────────────────────────────────────────────────────

function AdminView({ data }: { data: Extract<DashboardData, { role: 'admin' }> }) {
  const navigate = useNavigate()
  return (
    <>
      {/* Metrics bar */}
      <div className="dash-metrics">
        <div className="dash-metric">
          <span className="dash-metric__val">{data.total_forms}</span>
          <span className="dash-metric__key">Forms</span>
        </div>
        <div className="dash-metric">
          <span className="dash-metric__val">{data.active_forms}</span>
          <span className="dash-metric__key">Active</span>
        </div>
        <div className="dash-metric">
          <span className="dash-metric__val">{data.total_submissions}</span>
          <span className="dash-metric__key">Submissions</span>
        </div>
        <div className={`dash-metric ${data.pending > 0 ? 'dash-metric--warn' : ''}`}>
          <span className="dash-metric__val">{data.pending}</span>
          <span className="dash-metric__key">Pending</span>
        </div>
        <div className="dash-metric dash-metric--ok">
          <span className="dash-metric__val">{data.confirmed}</span>
          <span className="dash-metric__key">Confirmed</span>
        </div>
        <div className={`dash-metric ${data.declined > 0 ? 'dash-metric--danger' : ''}`}>
          <span className="dash-metric__val">{data.declined}</span>
          <span className="dash-metric__key">Declined</span>
        </div>
      </div>

      {/* Pending alert */}
      {data.pending > 0 && (
        <div className="dash-alert dash-alert--warn" onClick={() => navigate('/form-confirmations')}>
          <span className="dash-alert__dot" />
          <span className="dash-alert__text">
            {data.pending} submission{data.pending !== 1 ? 's' : ''} awaiting review
          </span>
          <span className="dash-alert__arrow">Review →</span>
        </div>
      )}

      {/* Recent submissions */}
      {data.recent_submissions.length > 0 && (
        <>
          <div className="dash-section-hd">
            <span className="dash-section-hd__title">Recent submissions</span>
            <button className="dash-section-hd__link" onClick={() => navigate('/admin/forms')}>
              View all forms →
            </button>
          </div>
          <div className="dash-list">
            {data.recent_submissions.map(s => (
              <div key={s.id} className="dash-list-row">
                <span className="dash-list-id">#{s.id}</span>
                <StatusDot status={s.status} />
                <div className="dash-list-main">
                  <div className="dash-list-title">{s.form_type}</div>
                  <div className="dash-list-sub">{s.submitted_by_username}</div>
                </div>
                <span className={`dash-status-chip dash-status-chip--${s.status}`}>{s.status}</span>
                <span className="dash-list-time">{timeAgo(s.created_at)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {data.total_submissions === 0 && (
        <div className="dash-empty">
          <p className="dash-empty__title">No submissions yet</p>
          <p className="dash-empty__sub">Submissions will appear here once users start filling forms.</p>
        </div>
      )}
    </>
  )
}

function ConfirmerView({ data }: { data: Extract<DashboardData, { role: 'form_confirmer' }> }) {
  const navigate = useNavigate()
  const allClear = data.pending_total === 0

  return (
    <>
      {/* Big headline number */}
      <div className="dash-headline">
        <div className={`dash-headline__num ${allClear ? 'dash-headline__num--ok' : 'dash-headline__num--warn'}`}>
          {data.pending_total}
        </div>
        <div className="dash-headline__label">
          {allClear ? 'submissions pending review — all clear' : `submission${data.pending_total !== 1 ? 's' : ''} pending review`}
        </div>
      </div>

      {allClear ? (
        <div className="dash-alert dash-alert--ok" style={{ cursor: 'default' }}>
          <span className="dash-alert__text">All submissions have been reviewed. Check back later.</span>
        </div>
      ) : (
        <>
          <div className="dash-section-hd">
            <span className="dash-section-hd__title">Forms awaiting review</span>
            <button className="dash-section-hd__link" onClick={() => navigate('/form-confirmations')}>
              All forms →
            </button>
          </div>
          <div className="dash-list">
            {data.forms_with_pending.map(f => (
              <div
                key={f.id}
                className="dash-list-row"
                onClick={() => navigate(`/form-confirmations/submissions/${f.id}`)}
              >
                <div className="dash-list-main">
                  <div className="dash-list-title">{f.title}</div>
                </div>
                <span className="dash-pending-badge">{f.pending_count} pending</span>
                <span className="dash-list-cta">Review →</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function UserView({ data }: { data: Extract<DashboardData, { role: 'user' }> }) {
  const navigate = useNavigate()

  if (data.total === 0) {
    return (
      <div className="dash-empty">
        <p className="dash-empty__title">No submissions yet</p>
        <p className="dash-empty__sub">
          {data.active_forms_count > 0
            ? `${data.active_forms_count} form${data.active_forms_count !== 1 ? 's' : ''} available — browse and submit your first request.`
            : 'No active forms available at the moment.'}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Metrics bar */}
      <div className="dash-metrics">
        <div className="dash-metric dash-metric--accent">
          <span className="dash-metric__val">{data.total}</span>
          <span className="dash-metric__key">Total</span>
        </div>
        <div className={`dash-metric ${data.pending > 0 ? 'dash-metric--warn' : ''}`}>
          <span className="dash-metric__val">{data.pending}</span>
          <span className="dash-metric__key">Pending</span>
        </div>
        <div className="dash-metric dash-metric--ok">
          <span className="dash-metric__val">{data.confirmed}</span>
          <span className="dash-metric__key">Confirmed</span>
        </div>
        <div className={`dash-metric ${data.declined > 0 ? 'dash-metric--danger' : ''}`}>
          <span className="dash-metric__val">{data.declined}</span>
          <span className="dash-metric__key">Declined</span>
        </div>
      </div>

      {/* Declined alert */}
      {data.declined > 0 && (
        <div className="dash-alert dash-alert--danger" onClick={() => navigate('/user/submissions')}>
          <span className="dash-alert__text">
            {data.declined} submission{data.declined !== 1 ? 's' : ''} declined — review feedback and resubmit
          </span>
          <span className="dash-alert__arrow">View →</span>
        </div>
      )}

      {/* Recent activity */}
      {data.recent_submissions.length > 0 && (
        <>
          <div className="dash-section-hd">
            <span className="dash-section-hd__title">Recent activity</span>
            <button className="dash-section-hd__link" onClick={() => navigate('/user/submissions')}>
              View all →
            </button>
          </div>
          <div className="dash-list">
            {data.recent_submissions.map(s => (
              <div key={s.id} className="dash-list-row">
                <span className="dash-list-id">#{s.id}</span>
                <StatusDot status={s.status} />
                <div className="dash-list-main">
                  <div className="dash-list-title">{s.form_type || `Submission #${s.id}`}</div>
                </div>
                <span className={`dash-status-chip dash-status-chip--${s.status}`}>{s.status}</span>
                <span className="dash-list-time">{timeAgo(s.created_at)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth()
  const [data, setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardAPI.get().then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (!user) return null

  return (
    <div className="home-page">

      <section className="home-hero home-hero--compact">
        <div className="home-hero__aurora" aria-hidden />
        <div className="home-hero__blob3"  aria-hidden />
        <div className="home-hero__grid"   aria-hidden />
        <div className="home-hero__inner">
          <span className="home-hero__eyebrow">IT Services Portal</span>
          <h1 className="home-hero__title">{greeting()}, {user.username}.</h1>
          <p className="home-hero__role-badge">{ROLE_LABEL[user.role] ?? user.role}</p>
        </div>
      </section>

      <section className="home-dashboard">
        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : (
          <>
            {data?.role === 'admin'          && <AdminView     data={data} />}
            {data?.role === 'form_confirmer' && <ConfirmerView data={data} />}
            {data?.role === 'user'           && <UserView      data={data} />}
          </>
        )}
      </section>

    </div>
  )
}
