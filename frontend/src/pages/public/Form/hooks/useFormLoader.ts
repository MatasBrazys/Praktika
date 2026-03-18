// src/pages/public/Form/hooks/useFormLoader.ts
// Loads a form by ID, initialises the SurveyJS model, and wires up behaviors.
// When submissionId is provided, loads existing data for editing.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Model } from 'survey-core'
import { formAPI, submissionAPI } from '../../../../services/api'
import { useToast } from '../../../../contexts/ToastContext'
import { attachRealtimeValidation } from '../utils/realtimeValidation'
import { attachCrmBehavior } from '../utils/crmBehavior'
import { detectBulkPanels } from '../utils/bulkPanelDetector'
import type { BulkPanelWithPage } from '../../../../types/survey.types'
import type { FormDefinition } from '../../../../types'

interface UseFormLoaderResult {
  form: FormDefinition | null
  surveyModel: Model | null
  bulkPanels: BulkPanelWithPage[]
  loading: boolean
  error: string
  isEditMode: boolean
}

export function useFormLoader(
  formId: string | undefined,
  submissionId?: string,
): UseFormLoaderResult {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [form, setForm] = useState<FormDefinition | null>(null)
  const [surveyModel, setSurveyModel] = useState<Model | null>(null)
  const [bulkPanels, setBulkPanels] = useState<BulkPanelWithPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isEditMode = !!submissionId

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

        // If editing, load existing submission data
        let existingData: Record<string, unknown> | null = null
        if (submissionId) {
          try {
            const submission = await submissionAPI.get(Number(submissionId))
            if (submission.form_id !== id) {
              setError('Submission does not belong to this form')
              return
            }
            existingData = submission.data
          } catch {
            setError('Submission not found or access denied')
            return
          }
        }

        const model = new Model(formData.surveyjs_json)
        model.textUpdateMode = 'onTyping'
        attachRealtimeValidation(model)
        attachCrmBehavior(model)

        // Pre-fill with existing data when editing
        if (existingData) {
          model.data = existingData
        }

        // pageIndex is tracked in Form/index.tsx via onCurrentPageChanged
        model.onCurrentPageChanged.add(() => { })

        model.onComplete.add(async (survey: { data: Record<string, unknown> }) => {
          try {
            if (!formData.id) {
              toast.error('Submission failed', 'Form ID is missing.')
              return
            }

            if (submissionId) {
              // Edit mode — update existing submission
              await submissionAPI.update(Number(submissionId), survey.data)
              toast.success('Submission updated', 'Your changes have been saved.')
              navigate('/user/submissions')
            } else {
              // New mode — create submission
              await formAPI.submitForm(formData.id, formData.title, survey.data)
              navigate(`/user/forms/${id}/success`)
            }
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
  }, [formId, submissionId, navigate, toast])

  return { form, surveyModel, bulkPanels, loading, error, isEditMode }
}