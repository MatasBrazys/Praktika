// src/pages/user/Profile/tabs/StatsTab.tsx

import { useState, useEffect } from 'react'
import { submissionAPI } from '../../../services/api'
import type { Submission } from '../../../types'

export default function StatsTab() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    submissionAPI.mine()
      .then(setSubmissions)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="profile-loading">Loading statistics…</div>

  const byForm = submissions.reduce<Record<string, number>>((acc, s) => {
    acc[s.form_type] = (acc[s.form_type] ?? 0) + 1
    return acc
  }, {})

  const byStatus = submissions.reduce<Record<string, number>>((acc, s) => {
    const status = s.status ?? 'pending'
    acc[status] = (acc[status] ?? 0) + 1
    return acc
  }, {})

  const lastSubmission = [...submissions].sort(
    (a, b) => b.created_at.localeCompare(a.created_at)
  )[0]

  return (
    <div className="profile-section">
      <div className="profile-section-header">
        <h2>Your Statistics</h2>
        <p>Overview of your submission activity.</p>
      </div>

      <div className="stats-grid">
        <div className="stats-card">
          <span className="stats-card__num">{submissions.length}</span>
          <span className="stats-card__label">Total Submissions</span>
        </div>
        <div className="stats-card">
          <span className="stats-card__num">{Object.keys(byForm).length}</span>
          <span className="stats-card__label">Forms Used</span>
        </div>
        <div className="stats-card">
          <span className="stats-card__num">{byStatus['pending'] ?? 0}</span>
          <span className="stats-card__label">Pending Review</span>
        </div>
        <div className="stats-card">
          <span className="stats-card__num">{byStatus['reviewed'] ?? 0}</span>
          <span className="stats-card__label">Reviewed</span>
        </div>
      </div>

      {Object.keys(byForm).length > 0 && (
        <div className="stats-breakdown">
          <h3>Submissions by Form</h3>
          {Object.entries(byForm)
            .sort(([, a], [, b]) => b - a)
            .map(([formType, count]) => (
              <div key={formType} className="stats-bar-row">
                <span className="stats-bar-label">{formType}</span>
                <div className="stats-bar-track">
                  <div
                    className="stats-bar-fill"
                    style={{ width: `${(count / submissions.length) * 100}%` }}
                  />
                </div>
                <span className="stats-bar-count">{count}</span>
              </div>
            ))}
        </div>
      )}

      {submissions.length === 0 && (
        <p className="stats-last">No submissions yet.</p>
      )}

      {lastSubmission && (
        <p className="stats-last">
          Last submission: {new Date(lastSubmission.created_at).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}