// src/pages/public/Form/utils/dynamicChoicesBehavior.ts
// Attaches live choice syncing to dropdown/radiogroup fields that have dynamicChoicesSource configured.
// Supports two source types:
//   - paneldynamic: collects values of a specific sub-field across all panel rows
//   - checkbox: collects the selected values array
//
// IMPORTANT: SurveyJS Model drops unknown/custom properties from question objects.
// So we scan the raw surveyjs_json to find dynamicChoicesSource mappings, then use
// the Model only for reading values and setting choices at runtime.

import type { Model } from 'survey-core'

interface DynamicChoicesConfig {
  fieldName: string
  subFieldName?: string
}

interface TargetMapping {
  targetName: string
  source: DynamicChoicesConfig
}

export function attachDynamicChoicesBehavior(surveyModel: Model, rawJson: Record<string, unknown>): void {
  const mappings = detectDynamicChoiceFields(rawJson)
  if (!mappings.length) return

  for (const mapping of mappings) {
    syncChoices(surveyModel, mapping)
  }

  surveyModel.onValueChanged.add((_survey: unknown, options: { name: string }) => {
    for (const mapping of mappings) {
      if (isSourceChange(options.name, mapping.source)) {
        syncChoices(surveyModel, mapping)
      }
    }
  })

  surveyModel.onDynamicPanelAdded.add(() => {
    for (const mapping of mappings) syncChoices(surveyModel, mapping)
  })
  surveyModel.onDynamicPanelRemoved.add(() => {
    for (const mapping of mappings) syncChoices(surveyModel, mapping)
  })
}

// ── Private ───────────────────────────────────────────────────────────────

function detectDynamicChoiceFields(rawJson: Record<string, unknown>): TargetMapping[] {
  const mappings: TargetMapping[] = []
  const allElements = extractAllElements(rawJson)

  for (const el of allElements) {
    const source = el.dynamicChoicesSource as DynamicChoicesConfig | undefined
    if (source?.fieldName) {
      mappings.push({
        targetName: el.name as string,
        source: {
          fieldName: source.fieldName,
          subFieldName: source.subFieldName,
        },
      })
    }
  }

  return mappings
}

function extractAllElements(json: Record<string, unknown>): Record<string, unknown>[] {
  const elements: Record<string, unknown>[] = []

  if (Array.isArray(json.pages)) {
    for (const page of json.pages as Record<string, unknown>[]) {
      if (Array.isArray(page.elements)) {
        elements.push(...(page.elements as Record<string, unknown>[]))
      }
    }
  }

  if (Array.isArray(json.elements)) {
    elements.push(...(json.elements as Record<string, unknown>[]))
  }

  return elements
}

function isSourceChange(changedName: string, source: DynamicChoicesConfig): boolean {
  if (changedName === source.fieldName) return true
  if (changedName.startsWith(source.fieldName + '[')) return true
  return false
}

function syncChoices(surveyModel: Model, mapping: TargetMapping): void {
  const target = surveyModel.getQuestionByName(mapping.targetName) as any
  if (!target) return

  const values = collectSourceValues(surveyModel, mapping.source)
  const uniqueValues = [...new Set(values)].filter(v => v !== '' && v != null)
  const currentValue = target.value

  target.choices = uniqueValues.map(v => ({ value: v, text: v }))

  if (currentValue) {
    if (Array.isArray(currentValue)) {
      const stillValid = currentValue.filter((cv: string) => uniqueValues.includes(cv))
      if (stillValid.length !== currentValue.length) target.value = stillValid
    } else if (!uniqueValues.includes(currentValue)) {
      target.value = undefined
    }
  }
}

function collectSourceValues(surveyModel: Model, source: DynamicChoicesConfig): string[] {
  const sourceQuestion = surveyModel.getQuestionByName(source.fieldName) as any
  if (!sourceQuestion) return []

  const sourceType = sourceQuestion.getType?.() ?? ''

  if (sourceType === 'paneldynamic' && source.subFieldName) {
    const panels = sourceQuestion.value as Record<string, unknown>[] | undefined
    if (!Array.isArray(panels)) return []

    return panels
      .map(panel => {
        const val = panel[source.subFieldName!]
        return val != null ? String(val) : ''
      })
      .filter(v => v !== '')
  }

  if (sourceType === 'checkbox') {
    const val = sourceQuestion.value
    if (Array.isArray(val)) return val.map(String)
    return []
  }

  const val = sourceQuestion.value
  if (val != null && val !== '') return [String(val)]

  return []
}