// src/pages/admin/SubmissionList.tsx

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate }  from 'react-router-dom'
import { formAPI }                 from '../../services/api'
import { useToast }                from '../../contexts/ToastContext'
import { extractErrorMessage }     from '../../lib/apiClient'
import Navbar                      from '../../components/shared/Navbar'
import type { Submission }         from '../../types'
import '../../styles/pages/admin/submission-list.css'

export default function SubmissionList() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const { toast } = useToast()

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [formTitle,   setFormTitle]   = useState('')
  const [loading,     setLoading]     = useState(true)

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

  const exportToCSV = () => {
    if (!submissions.length) return

    const allFields = Array.from(
      new Set(submissions.flatMap(s => Object.keys(s.data)))
    )

    const rows = [
      ['ID', 'Date', ...allFields],
      ...submissions.map(s => [
        String(s.id),
        new Date(s.created_at).toLocaleString(),
        ...allFields.map(f => String((s.data as Record<string, unknown>)[f] ?? '')),
      ]),
    ]

    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href:     url,
      download: `${formTitle.replace(/\s+/g, '_')}_submissions.csv`,
    })
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export ready', `${submissions.length} submissions downloaded.`)
  }

  if (loading) return(
    <>
    <Navbar/>
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
              <button className="btn-back" onClick={() => navigate('/admin/forms')}>
                ← Back to Forms
              </button>
              <h1>Submissions: {formTitle}</h1>
              <p className="subtitle">{submissions.length} total submissions</p>
            </div>
            <div className="header-actions">
              <button className="btn-export" onClick={exportToCSV} disabled={!submissions.length}>
                Export CSV
              </button>
            </div>
          </div>

          {submissions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h2>No submissions yet</h2>      
            </div>
          ) : (
            <div className="submissions-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Submitted At</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map(sub => (
                    <tr key={sub.id}>
                      <td>#{sub.id}</td>
                      <td>{new Date(sub.created_at).toLocaleString()}</td>
                      <td>
                        <details>
                          <summary>View Details</summary>
                          <pre>{JSON.stringify(sub.data, null, 2)}</pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
