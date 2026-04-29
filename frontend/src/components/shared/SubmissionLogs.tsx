// Inline event-log panel shown below a submission row when "Logs" is clicked.
// Fetches lazily on first open.

import { useState, useEffect } from 'react'
import { formAPI } from '../../services/api'
import type { SubmissionEvent } from '../../types'

interface Props {
  submissionId: number
  formId?: number   // omit → uses getMySubmissionEvents (user own)
}

const EVENT_LABELS: Record<string, string> = {
  submitted:   'submitted',
  declined:    'declined',
  confirmed:   'confirmed',
  edited:      'edited',
  resubmitted: 'resubmitted',
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function SubmissionLogs({ submissionId, formId }: Props) {
  const [events, setEvents] = useState<SubmissionEvent[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      try {
        const data = formId !== undefined
          ? await formAPI.getSubmissionEvents(formId, submissionId)
          : await formAPI.getMySubmissionEvents(submissionId)
        if (!cancelled) setEvents(data)
      } catch {
        if (!cancelled) setEvents([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [submissionId, formId])

  if (loading) return (
    <div className="sub-log">
      <div className="sub-log__loading"><div className="spinner sub-log__spinner" />Loading history…</div>
    </div>
  )

  if (!events?.length) return (
    <div className="sub-log">
      <p className="sub-log__empty">No history available.</p>
    </div>
  )

  return (
    <div className="sub-log">
      {events.map(ev => (
        <div key={ev.id} className="sub-log__event">
          <span className={`sub-log__dot sub-log__dot--${ev.event_type}`} />
          <span className="sub-log__actor">{ev.actor_username}</span>
          <span className="sub-log__type">{EVENT_LABELS[ev.event_type] ?? ev.event_type}</span>
          <span className="sub-log__time">{fmt(ev.occurred_at)}</span>
          {ev.comment && (
            <div className="sub-log__reason">"{ev.comment}"</div>
          )}
        </div>
      ))}
    </div>
  )
}
