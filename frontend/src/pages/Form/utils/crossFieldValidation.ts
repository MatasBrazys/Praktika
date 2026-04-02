// src/pages/public/Form/utils/crossFieldValidation.ts
// Attaches cross-field validation to a SurveyJS model.
// Supports bidirectional re-validation: changing EITHER field re-validates the relationship.
//
// IMPORTANT: Like dynamicChoicesBehavior, SurveyJS drops custom validator properties.
// We scan raw JSON to find crossfield validators, then use the Model for values/errors.
//
// PANELDYNAMIC NOTE: When a sub-field changes, SurveyJS fires onValueChanged with the
// paneldynamic's name (e.g. "network_config"), NOT the sub-field name ("gateway").
// So we detect which paneldynamic contains our rules and trigger on its name too.

import type { Model } from 'survey-core'
import { subnetContains } from '../../../lib/subnetUtils'

// ── Types ─────────────────────────────────────────────────────────────────

interface CrossFieldRule {
  targetName: string       // field that HAS the validator (e.g. "gateway")
  compareField: string     // field to compare against (e.g. "ip_subnet")
  operation: string        // e.g. "subnet_contains", "not_equal"
  errorMessage: string     // shown when validation fails
  panelContext: boolean    // true if both fields are inside the same paneldynamic
  parentPanelName?: string // paneldynamic name that contains these fields
}

// ── Public API ────────────────────────────────────────────────────────────

export function attachCrossFieldValidation(
  surveyModel: Model,
  rawJson: Record<string, unknown>,
): void {
  const rules = detectCrossFieldRules(rawJson)
  if (!rules.length) return

  // For paneldynamic rules: any change to the paneldynamic triggers re-validation
  surveyModel.onValueChanged.add((_survey: unknown, options: { name: string }) => {
    const changedName = options.name

    for (const rule of rules) {
      let shouldValidate = false

      if (rule.panelContext && rule.parentPanelName) {
        // Paneldynamic: fires with paneldynamic name when ANY sub-field changes
        if (changedName === rule.parentPanelName) shouldValidate = true
      } else {
        // Top-level: fires with the exact field name
        if (changedName === rule.targetName || changedName === rule.compareField) {
          shouldValidate = true
        }
      }

      if (shouldValidate) {
        if (rule.panelContext) {
          validateAllPanelRows(surveyModel, rule)
        } else {
          validateTopLevel(surveyModel, rule)
        }
      }
    }
  })

  // Also validate on panel add/remove
  surveyModel.onDynamicPanelAdded.add(() => {
    for (const rule of rules) {
      if (rule.panelContext) validateAllPanelRows(surveyModel, rule)
    }
  })
  surveyModel.onDynamicPanelRemoved.add(() => {
    for (const rule of rules) {
      if (rule.panelContext) validateAllPanelRows(surveyModel, rule)
    }
  })
}

// ── Detection ─────────────────────────────────────────────────────────────

function detectCrossFieldRules(rawJson: Record<string, unknown>): CrossFieldRule[] {
  const rules: CrossFieldRule[] = []
  const topElements = extractTopLevelElements(rawJson)

  // Check top-level elements
  for (const el of topElements) {
    const validators = el.validators as any[] | undefined
    if (!validators) continue
    for (const v of validators) {
      if (v.type === 'crossfield' && v.compareField && v.operation) {
        rules.push({
          targetName: el.name as string,
          compareField: v.compareField,
          operation: v.operation,
          errorMessage: v.text || 'Cross-field validation failed',
          panelContext: false,
        })
      }
    }
  }

  // Check paneldynamic templateElements
  for (const el of topElements) {
    if (el.type !== 'paneldynamic') continue
    const templates = el.templateElements as any[] | undefined
    if (!templates) continue
    const panelName = el.name as string

    for (const te of templates) {
      const validators = te.validators as any[] | undefined
      if (!validators) continue
      for (const v of validators) {
        if (v.type === 'crossfield' && v.compareField && v.operation) {
          rules.push({
            targetName: te.name,
            compareField: v.compareField,
            operation: v.operation,
            errorMessage: v.text || 'Cross-field validation failed',
            panelContext: true,
            parentPanelName: panelName,
          })
        }
      }
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

// Top-level fields — direct comparison
function validateTopLevel(surveyModel: Model, rule: CrossFieldRule): void {
  const targetQ = surveyModel.getQuestionByName(rule.targetName) as any
  const compareQ = surveyModel.getQuestionByName(rule.compareField) as any
  if (!targetQ || !compareQ) return

  const targetVal = String(targetQ.value ?? '').trim()
  const compareVal = String(compareQ.value ?? '').trim()

  if (!targetVal || !compareVal) {
    targetQ.clearErrors?.()
    return
  }

  const pass = runOperation(rule.operation, compareVal, targetVal)

  targetQ.clearErrors?.()
  if (!pass) {
    targetQ.addError?.(rule.errorMessage)
  }
}

// Paneldynamic — validate each row independently
function validateAllPanelRows(surveyModel: Model, rule: CrossFieldRule): void {
  if (!rule.parentPanelName) return

  const panelQ = surveyModel.getQuestionByName(rule.parentPanelName) as any
  if (!panelQ) return

  const panels = panelQ.panels as any[] | undefined
  if (!Array.isArray(panels)) return

  for (const panel of panels) {
    const targetQ = panel.getQuestionByName?.(rule.targetName)
    const compareQ = panel.getQuestionByName?.(rule.compareField)
    if (!targetQ || !compareQ) continue

    const targetVal = String(targetQ.value ?? '').trim()
    const compareVal = String(compareQ.value ?? '').trim()

    targetQ.clearErrors?.()

    if (!targetVal || !compareVal) continue

    const pass = runOperation(rule.operation, compareVal, targetVal)
    if (!pass) {
      targetQ.addError?.(rule.errorMessage)
    }
  }
}

// ── Operations (plug-in pattern) ──────────────────────────────────────────

// compareVal = value from compareField (e.g. subnet CIDR)
// targetVal  = value from the field being validated (e.g. gateway IP)
function runOperation(operation: string, compareVal: string, targetVal: string): boolean {
  switch (operation) {
    case 'subnet_contains':
      return subnetContains(compareVal, targetVal)

    case 'not_equal':
      return targetVal.toLowerCase() !== compareVal.toLowerCase()

    case 'less_than':
      return parseFloat(targetVal) < parseFloat(compareVal)

    case 'greater_than':
      return parseFloat(targetVal) > parseFloat(compareVal)

    case 'before_date':
      return new Date(targetVal).getTime() < new Date(compareVal).getTime()

    case 'after_date':
      return new Date(targetVal).getTime() > new Date(compareVal).getTime()

    default:
      return true
  }
}