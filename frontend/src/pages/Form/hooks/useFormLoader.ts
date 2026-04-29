// src/pages/public/Form/hooks/useFormLoader.ts
// Loads a form by ID, initialises the SurveyJS model, and wires up behaviors.
// When submissionId is provided, loads existing data for editing.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Model } from 'survey-core'
import { formAPI, submissionAPI } from '../../../services/api'
import { useToast } from '../../../contexts/ToastContext'
import { useAuth } from '../../../contexts/AuthContext'
import { attachRealtimeValidation } from '../utils/realtimeValidation'
import { attachLookupBehavior } from '../utils/lookupBehavior'
import { attachDynamicChoicesBehavior } from '../utils/dynamicChoicesBehavior'
import { attachCrossFieldValidation } from '../utils/crossFieldValidation'
import { attachUniqueValidation } from '../utils/uniqueValidation'
import { detectBulkPanels } from '../utils/bulkPanelDetector'
import type { BulkPanelWithPage } from '../../../types/survey.types'
import type { FormDefinition } from '../../../types'

interface UseFormLoaderResult {
  form: FormDefinition | null
  surveyModel: Model | null
  bulkPanels: BulkPanelWithPage[]
  loading: boolean
  error: string
  isEditMode: boolean
  isAdminEdit: boolean
  submitting: boolean
}

export function useFormLoader(
  formId: string | undefined,
  submissionId?: string,
): UseFormLoaderResult {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  const [form, setForm] = useState<FormDefinition | null>(null)
  const [surveyModel, setSurveyModel] = useState<Model | null>(null)
  const [bulkPanels, setBulkPanels] = useState<BulkPanelWithPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isEditMode = !!submissionId
  const isAdminEdit = isEditMode && user?.role === 'admin'

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

        let existingData: Record<string, unknown> | null = null
        if (submissionId) {
          try {
            const submission = await submissionAPI.get(Number(submissionId))
            if (submission.form_id !== id) {
              setError('Submission does not belong to this form')
              return
            }
            if (submission.status === 'confirmed') {
              setError('Confirmed submissions cannot be edited')
              return
            }
            existingData = submission.data
          } catch {
            setError('Submission not found or access denied')
            return
          }
        }

        const rawJson = formData.surveyjs_json as Record<string, unknown>
        const model = new Model(formData.surveyjs_json)

        model.textUpdateMode = 'onTyping'
        model.showCompletedPage = false

        attachRealtimeValidation(model)
        attachLookupBehavior(model, rawJson)
        attachDynamicChoicesBehavior(model, rawJson)
        attachCrossFieldValidation(model, rawJson)
        attachUniqueValidation(model, rawJson)

        if (existingData) {
          model.data = existingData
        }

        model.onCurrentPageChanged.add(() => { })

        model.onComplete.add(async (survey: { data: Record<string, unknown> }) => {
          setSubmitting(true)
          try {
            if (!formData.id) {
              toast.error('Submission failed', 'Form ID is missing.')
              setSubmitting(false)
              return
            }

            if (submissionId) {
              if (isAdminEdit) {
                await formAPI.adminUpdateSubmission(formData.id!, Number(submissionId), survey.data)
                toast.success('Submission updated', 'Changes saved.')
                navigate(`/admin/forms/${formData.id}/submissions`)
              } else {
                await formAPI.updateMySubmission(Number(submissionId), survey.data)
                toast.success('Submission updated', 'Your changes have been saved.')
                navigate(`/user/submissions/${formData.id}`)
              }
            } else {
              await formAPI.submitForm(formData.id, formData.title, survey.data)
              navigate(`/user/forms/${id}/success`, {
                state: { formTitle: formData.title }
              })
            }
          } catch {
            setSubmitting(false)
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

  return { form, surveyModel, bulkPanels, loading, error, isEditMode, isAdminEdit, submitting }
}