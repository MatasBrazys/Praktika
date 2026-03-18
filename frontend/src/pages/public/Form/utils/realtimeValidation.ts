// src/pages/public/Form/utils/realtimeValidation.ts
// Attaches real-time regex validation to any SurveyJS model.
// Validates fields on every keystroke via onValueChanged.
// Independent of CRM — works on any field that has regex validators.

import type { Model } from 'survey-core'

// Wires up per-keystroke regex validation for all fields with regex validators.
// Call this once after creating the Model, before rendering.
// Requires model.textUpdateMode = 'onTyping' to fire on each keystroke.
export function attachRealtimeValidation(surveyModel: Model): void {
  surveyModel.onValueChanged.add((_survey: unknown, options: { name: string; value: unknown }) => {
    validateFieldRegex(options.name, options.value, surveyModel)
  })
}

// ── Private ───────────────────────────────────────────────────────────────

// Shows inline error if the value does not match the field's regex validators.
// Clears errors when the value passes or is empty.
function validateFieldRegex(fieldName: string, value: unknown, surveyModel: Model): void {
  const allQuestions = surveyModel.getAllQuestions() as any[]
  const field = allQuestions.find((q: any) => q.name === fieldName)
  if (!field) return

  const regexValidators = (field.validators || []).filter((v: any) => v.regex)
  if (!regexValidators.length) return

  const stringValue = String(value ?? '').trim()
  field.clearErrors?.()
  if (!stringValue) return

  for (const validator of regexValidators) {
    try {
      if (!new RegExp(validator.regex).test(stringValue)) {
        field.addError?.(validator.text || 'Invalid format')
        return
      }
    } catch {
      // Skip malformed regex patterns
    }
  }
}