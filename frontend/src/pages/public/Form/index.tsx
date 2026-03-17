// src/pages/public/Form/index.tsx
// Public form page — loads form, renders SurveyJS, handles keyboard nav and bulk import.
// Supports edit mode when submissionId is present in the URL.

import { useState, useRef }  from 'react'
import { useParams }          from 'react-router-dom'
import { Survey }             from 'survey-react-ui'
import 'survey-core/survey-core.min.css'

import BulkImporter        from '../../../components/public/BulkImporter'
import { useFormLoader }      from './hooks/useFormLoader'
import '../../../styles/pages/public/form.css'
import '../../../styles/components/bulk-importer.css'

// Shape of the options object SurveyJS passes to onCurrentPageChanged
interface PageChangedOptions {
  newCurrentPage?: { visibleIndex?: number }
}

export default function Form() {
  const { id, submissionId } = useParams<{ id: string; submissionId?: string }>()

  // form - raw data from database, surveyModel -  form definition from types/index.ts
  const { form, surveyModel, bulkPanels, loading, error, isEditMode } = useFormLoader(id, submissionId)

  const [currentPageNo,  setCurrentPageNo]  = useState(0)
  const surveyWrapperRef = useRef<HTMLDivElement>(null)

  // Track current page for bulk panel visibility.
  // Registered outside render to avoid adding duplicate listeners on each render.
  if (surveyModel) {
    surveyModel.onCurrentPageChanged.add((_sender: unknown, options: PageChangedOptions) => {
      setCurrentPageNo(options.newCurrentPage?.visibleIndex ?? 0)
    })
  }

  // Moves focus to the next input on Enter — skips bulk importer fields
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
    const next         = focusable[currentIndex + 1]

    if (next) {
      next.focus()
      if (next instanceof HTMLInputElement && next.type === 'text') {
        next.setSelectionRange(next.value.length, next.value.length)
      }
    }
  }

  if (loading) return (
    <div className="public-page">
      <div className="loading-spinner">Loading form...</div>
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

  // Both form and surveyModel are set together — if one is null so is the other
  if (!surveyModel || !form) return null

  const visiblePanels = bulkPanels.filter(p => p.pageIndex === currentPageNo)

  return (
    <div className="public-page">
      <div className="public-form-container">
        <div className={`form-header ${isEditMode ? 'form-header--edit' : ''}`}>
          {isEditMode && <span className="form-edit-badge">Editing submission</span>}
          <h1>{form.title}</h1>
          {form.description && <p className="form-description">{form.description}</p>}
        </div>

        <div className="survey-wrapper" ref={surveyWrapperRef} onKeyDown={handleKeyDown}>
          {visiblePanels.map(panel => (
            <BulkImporter key={panel.questionName} surveyModel={surveyModel} config={panel} />
          ))}
          <Survey model={surveyModel} />
        </div>
      </div>
    </div>
  )
}