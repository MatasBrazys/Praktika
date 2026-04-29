// src/components/admin/FormPreview.tsx

import { Model }  from 'survey-core'
import { Survey } from 'survey-react-ui'
import { FileText } from 'lucide-react'
import 'survey-core/survey-core.min.css'
import '../../styles/components/form-preview.css'

interface Props {
  surveyJson:       Record<string, unknown>
  activePageIndex?: number
}

export default function FormPreview({ surveyJson, activePageIndex = 0 }: Props) {
  const pages      = (surveyJson.pages as Array<{ elements?: unknown[] }> | undefined)
                     ?? [{ elements: (surveyJson.elements as unknown[] | undefined) ?? [] }]
  const activePage = pages[activePageIndex]
  const elements   = activePage?.elements ?? []

  if (!elements.length) {
    return (
      <div className="preview-empty">
        <div className="empty-icon"><FileText size={48} strokeWidth={1.5} /></div>
        <p>Add fields to see live preview</p>
      </div>
    )
  }

  // Render only the active page so the preview stays in sync with the selected tab
  const survey = new Model({ elements })
  survey.mode  = 'display'

  return (
    <div className="preview-container">
      <Survey model={survey} />
    </div>
  )
}
