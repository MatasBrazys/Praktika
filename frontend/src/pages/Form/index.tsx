// src/pages/public/Form/index.tsx
// Public form page — loads form, renders SurveyJS, handles keyboard nav and bulk import.
// Supports edit mode when submissionId is present in the URL.

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Survey } from 'survey-react-ui'
import 'survey-core/survey-core.min.css'

import BulkImporter  from '../../components/public/BulkImporter'
import BackButton    from '../../components/shared/BackButton'
import ErrorBoundary from '../../components/shared/ErrorBoundary'
import { useFormLoader } from './hooks/useFormLoader'
import '../../styles/pages/public/form.css'
import '../../styles/components/bulk-importer.css'
import '../../styles/components/error-boundary.css'
import '../../components/shared/Navbar'

interface PageChangedOptions {
  newCurrentPage?: { visibleIndex?: number }
}

export default function Form() {
  const { id, submissionId } = useParams<{ id: string; submissionId?: string }>()

  const { form, surveyModel, bulkPanels, loading, error, isEditMode, submitting } = useFormLoader(id, submissionId)

  const [currentPageNo, setCurrentPageNo] = useState(0)
  const surveyWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!surveyModel) return
    const handler = (_sender: unknown, options: PageChangedOptions) => {
      setCurrentPageNo(options.newCurrentPage?.visibleIndex ?? 0)
    }
    surveyModel.onCurrentPageChanged.add(handler)
    return () => { surveyModel.onCurrentPageChanged.remove(handler) }
  }, [surveyModel])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter') return

    const target = e.target as HTMLElement
    const skipTags = ['TEXTAREA', 'BUTTON', 'SELECT']
    if (skipTags.includes(target.tagName)) return
    if (target instanceof HTMLInputElement && ['checkbox', 'radio', 'submit', 'button'].includes(target.type)) return

    e.preventDefault()

    const wrapper = surveyWrapperRef.current
    if (!wrapper) return

    const focusable = Array.from(
      wrapper.querySelectorAll<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
      ),
    ).filter(el => !el.closest('.bi-wrapper'))

    const currentIndex = focusable.indexOf(target)
    const next = focusable[currentIndex + 1]

    if (next) {
      next.focus()
      if (next instanceof HTMLInputElement && next.type === 'text') {
        next.setSelectionRange(next.value.length, next.value.length)
      }
    }
  }

  if (loading) return (
    <div className="public-page">
      <div className="loading-spinner">
        <div className="spinner" />
        Loading form...
      </div>
    </div>
  )

  if (submitting) return (
    <div className="public-page">
      <div className="loading-spinner">
        <div className="spinner" />
        Submitting...
      </div>
    </div>
  )

  if (error) return (
    <div className="public-page">
      <div className="error-box">
        <h2>❌ {error}</h2>
        <p>Please contact support if you believe this is an error.</p>
      </div>
    </div>
  )

  if (!surveyModel || !form) return null

  const visiblePanels = bulkPanels.filter(p => p.pageIndex === currentPageNo)

  return (

    <div className="public-page">
      <div className="public-form-container">
        <div className={`form-header ${isEditMode ? 'form-header--edit' : ''}`}>
          <BackButton
            to={isEditMode ? `/user/submissions/${form.id}` : '/user/forms'}
            label={isEditMode ? 'Back to Submissions' : 'Back to Forms'}
          />
          {isEditMode && <span className="form-edit-badge">Editing submission</span>}
          <h1>{form.title}</h1>
          {form.description && <p className="form-description">{form.description}</p>}
        </div>

        <div className="survey-wrapper" ref={surveyWrapperRef} onKeyDown={handleKeyDown}>
          {visiblePanels.map(panel => (
            <BulkImporter key={panel.questionName} surveyModel={surveyModel} config={panel} />
          ))}
          <ErrorBoundary variant="inline">
            <Survey model={surveyModel} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}