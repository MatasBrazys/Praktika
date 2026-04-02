// src/pages/public/Form/utils/uniqueValidation.ts
// Attaches unique-value enforcement to paneldynamic template fields
// that have isUnique=true configured.
//
// Flow: any panel row value changes → collect all values for that field
// across every row → find duplicates → addError to offending rows.
//
// Empty values are ignored — required validation handles those separately.
// Clearing errors: we call clearErrors() per question before re-evaluating,
// which means other validators re-run on the next user keystroke (same
// behaviour as crossFieldValidation.ts).

import type { Model } from 'survey-core'

// ── Types ─────────────────────────────────────────────────────────────────

interface UniqueFieldRule {
  panelName: string
  fieldName: string
  errorMessage: string
}

// ── Public API ────────────────────────────────────────────────────────────

export function attachUniqueValidation(
  surveyModel: Model,
  rawJson: Record<string, unknown>,
): void {
  const rules = detectUniqueRules(rawJson)
  if (!rules.length) return

  // Re-validate all rules for a given panel question name
  const validateForPanel = (changedPanelName: string) => {
    for (const rule of rules) {
      if (rule.panelName === changedPanelName) {
        validateUnique(surveyModel, rule)
      }
    }
  }

  surveyModel.onValueChanged.add((_survey: unknown, options: { name: string }) => {
    validateForPanel(options.name)
  })

  // Re-validate when rows are added or removed
  surveyModel.onDynamicPanelAdded.add((_survey: unknown, options: { question: { name: string } }) => {
    validateForPanel(options.question.name)
  })

  surveyModel.onDynamicPanelRemoved.add((_survey: unknown, options: { question: { name: string } }) => {
    validateForPanel(options.question.name)
  })
}

// ── Detection ─────────────────────────────────────────────────────────────

function detectUniqueRules(rawJson: Record<string, unknown>): UniqueFieldRule[] {
  const rules: UniqueFieldRule[] = []
  const elements = extractTopLevelElements(rawJson)

  for (const el of elements) {
    if (el.type !== 'paneldynamic') continue

    const templates = el.templateElements as Record<string, unknown>[] | undefined
    if (!templates?.length) continue

    const panelName = el.name as string

    for (const te of templates) {
      if (!te.isUnique) continue
      rules.push({
        panelName,
        fieldName: te.name as string,
        errorMessage: `"${te.title || te.name}" must be unique across all rows`,
      })
    }
  }

  return rules
}

function extractTopLevelElements(json: Record<string, unknown>): Record<string, unknown>[] {
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

// ── Validation execution ──────────────────────────────────────────────────

function validateUnique(model: Model, rule: UniqueFieldRule): void {
  const panelQ = model.getQuestionByName(rule.panelName) as any
  if (!panelQ) return

  const panels: any[] = panelQ.panels ?? []
  if (!panels.length) return

  // Collect value + question reference per row
  type RowEntry = { idx: number; value: string; question: any }
  const entries: RowEntry[] = []

  for (let i = 0; i < panels.length; i++) {
    const q = panels[i].getQuestionByName?.(rule.fieldName)
    if (!q) continue
    const val = String(q.value ?? '').trim()
    entries.push({ idx: i, value: val, question: q })
  }

  // Build duplicate index set
  // First pass: record first occurrence of each non-empty value
  const firstSeen = new Map<string, number>()
  const duplicateIndices = new Set<number>()

  for (const { idx, value } of entries) {
    if (!value) continue
    if (firstSeen.has(value)) {
      // Mark both the original and the duplicate
      duplicateIndices.add(firstSeen.get(value)!)
      duplicateIndices.add(idx)
    } else {
      firstSeen.set(value, idx)
    }
  }

  // Second pass: clear and re-apply errors
  for (const { idx, question } of entries) {
    question.clearErrors?.()
    if (duplicateIndices.has(idx)) {
      question.addError?.(rule.errorMessage)
    }
  }
}