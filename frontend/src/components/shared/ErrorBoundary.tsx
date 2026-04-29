// src/components/shared/ErrorBoundary.tsx
// Class component — required by React for error boundaries.
// Two variants:
//   fullPage — covers the whole screen (used in App.tsx)
//   inline   — covers just a widget, page continues (used around SurveyJS)
//
// POST-MVP: add Sentry in componentDidCatch:
//   import * as Sentry from '@sentry/react'
//   Sentry.captureException(error, { extra: { errorInfo } })

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children:  ReactNode
  variant?:  'fullPage' | 'inline'
  fallback?: ReactNode   // custom fallback — overrides default UI
}

interface State {
  hasError: boolean
  error:    Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // POST-MVP: Sentry.captureException(error, { extra: { errorInfo } })
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    const { variant = 'fullPage' } = this.props

    if (variant === 'inline') {
      return (
        <div className="eb-inline">
          <p className="eb-inline__msg">
            Something went wrong rendering this section.
          </p>
          <button className="eb-inline__retry" onClick={this.handleReset}>
            Try again
          </button>
        </div>
      )
    }

    return (
      <div className="eb-fullpage">
        <div className="eb-fullpage__card">
          <div className="eb-fullpage__icon"><AlertTriangle size={48} strokeWidth={1.5} /></div>
          <h1 className="eb-fullpage__title">Something went wrong</h1>
          <p className="eb-fullpage__desc">
            An unexpected error occurred. You can try reloading the page.
          </p>
          {this.state.error && (
            <details className="eb-fullpage__details">
              <summary>Error details</summary>
              <pre>{this.state.error.message}</pre>
            </details>
          )}
          <div className="eb-fullpage__actions">
            <button className="btn-secondary" onClick={this.handleReset}>
              Try again
            </button>
            <button className="btn-primary" onClick={() => window.location.href = '/'}>
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }
}