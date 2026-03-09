// src/pages/public/Form/hooks/useFormLoader.ts
// Loads a form by ID, initialises the SurveyJS model, and wires up CRM behaviour.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Model } from 'survey-core'
import { formAPI } from '../../../../services/api'
import { useToast } from '../../../../contexts/ToastContext'
import { attachRealtimeBehavior } from '../utils/crmBehavior'
import { detectBulkPanels } from '../utils/bulkPanelDetector'
import type { BulkPanelWithPage } from '../../../../types/survey.types'
import type { FormDefinition } from '../../../../types'

interface UseFormLoaderResult {
  form: FormDefinition | null
  surveyModel: Model | null
  bulkPanels: BulkPanelWithPage[]
  loading: boolean
  error: string
}

export function useFormLoader(formId: string | undefined): UseFormLoaderResult {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [form, setForm] = useState<FormDefinition | null>(null)
  const [surveyModel, setSurveyModel] = useState<Model | null>(null)
  const [bulkPanels, setBulkPanels] = useState<BulkPanelWithPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!formId) return

    const loadForm = async (id: number) => {
      try {
        setLoading(true)
        const formData = await formAPI.get(id)

        if (!formData.is_active) {
          setError('This form is not currently active')
          return
        }

        const model = new Model(formData.surveyjs_json)
        model.textUpdateMode = 'onTyping'   
        attachRealtimeBehavior(model)

        // pageIndex is tracked in Form/index.tsx via onCurrentPageChanged
        model.onCurrentPageChanged.add(() => { })

        model.onComplete.add(async (survey: { data: Record<string, unknown> }) => {
          try {
            if (!formData.id) {
              toast.error('Submission failed', 'Form ID is missing.')
              return
            }
            await formAPI.submitForm(formData.id, formData.title, survey.data)
            navigate(`/user/forms/${id}/success`)
          } catch {
            toast.error('Submission failed', 'Please try again or contact support.')
          }
        })

        setForm(formData)
        setSurveyModel(model)
        setBulkPanels(detectBulkPanels(formData.surveyjs_json))
      } catch {
        setError('Form not found')
      } finally {
        setLoading(false)
      }
    }

    loadForm(Number(formId))
  }, [formId, navigate, toast])

  return { form, surveyModel, bulkPanels, loading, error }
}
