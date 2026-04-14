// src/pages/public/Form/utils/realtimeValidation.ts
// Triggers SurveyJS's own validators on value change instead of waiting for submit.
// Requires model.textUpdateMode = 'onTyping' (set in useFormLoader.ts).
//
// Note: only inputType 'text' (plain text) fires onValueChanged per keystroke.
// All other inputTypes (email, phone, number, date, ipv4, cidr, mac) fire on blur.
// This is a SurveyJS limitation — textUpdateMode only applies to plain text inputs.

import type { Model } from 'survey-core'

export function attachRealtimeValidation(surveyModel: Model): void {
  surveyModel.onValueChanged.add((_survey: unknown, options: { name: string; value: unknown }) => {
    const field = (surveyModel.getAllQuestions() as any[])
      .find((q: any) => q.name === options.name)
    if (!field?.validators?.length) return

    const value = String(options.value ?? '').trim()
    if (!value) return

    field.validate()
  })
}