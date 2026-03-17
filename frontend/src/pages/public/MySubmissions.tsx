// src/pages/public/MySubmissions.tsx
// Groups the user's submissions by form and shows a card per form.
// Click a form card → navigates to the per-form submission list.

import { useState, useEffect, useCallback } from 'react'
import { useNavigate }         from 'react-router-dom'
import { submissionAPI }       from '../../services/api'
import { useToast }            from '../../contexts/ToastContext'
import { extractErrorMessage } from '../../lib/apiClient'
import Navbar                  from '../../components/shared/Navbar'
import type { Submission }     from '../../types'
import '../../styles/pages/public/form-list.css'
import '../../styles/pages/public/my-submissions.css'

interface FormGroup {
  formId:   number
  formType: string
  count:    number
  lastDate: string
}

function groupByForm(submissions: Submission[]): FormGroup[] {
  const map = new Map<number, FormGroup>()

  for (const sub of submissions) {
    const existing = map.get(sub.form_id)
    if (existing) {
      existing.count++
      if (sub.created_at > existing.lastDate) existing.lastDate = sub.created_at
    } else {
      map.set(sub.form_id, {
        formId:   sub.form_id,
        formType: sub.form_type,
        count:    1,
        lastDate: sub.created_at,
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => b.lastDate.localeCompare(a.lastDate))
}

export default function MySubmissions() {
  const navigate  = useNavigate()
  const { toast } = useToast()

  const [groups,  setGroups]  = useState<FormGroup[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const subs = await submissionAPI.mine()
      setGroups(groupByForm(subs))
    } catch (err) {
      toast.error('Failed to load submissions', extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <>
      <Navbar />
      <div className="page-loading">Loading your submissions…</div>
    </>
  )

  return (
    <>
      <Navbar />
      <div className="user-page-container">
        <div className="user-forms-wrapper" style={{ maxWidth: 860 }}>

          <div className="page-header-simple">
            <h1>My Submissions</h1>
            <p>{groups.length} form{groups.length !== 1 ? 's' : ''} submitted</p>
          </div>

          {groups.length === 0 ? (
            <div className="empty-state-simple">
              <div className="empty-icon">📋</div>
              <h2>No submissions yet</h2>
              <p>Once you fill out a form, it will appear here</p>
            </div>
          ) : (
            <div className="forms-list-simple">
              {groups.map(group => (
                <button
                  key={group.formId}
                  className="form-list-item ms-form-item"
                  onClick={() => navigate(`/user/submissions/${group.formId}`)}
                >
                  <div className="form-item-header">
                    <h3>{group.formType}</h3>
                    <span className="arrow">→</span>
                  </div>
                  <div className="form-item-meta">
                    <span>{group.count} submission{group.count !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>Last submitted {new Date(group.lastDate).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  )
}