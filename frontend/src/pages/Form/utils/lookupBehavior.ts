// src/pages/public/Form/utils/lookupBehavior.ts
// Attaches real-time lookup to SurveyJS models for Lookup fields.
//
// Flow: user types 3+ chars → debounced → backend proxy → API returns result(s)
//   1 result  → auto-fill immediately
//   N results → show radiogroup picker; user selects → auto-fill
//   0 results → "not found" message
//
// Race condition safe: each search has a request counter.
// Session cache: Map keyed by configId:query — avoids redundant API calls.

import type { Model } from 'survey-core'
import { lookupAPI } from '../../../services/api'
import { debounce } from '../../../lib/utils'

interface LookupPanelConfig {
  triggerFieldName: string
  pickerFieldName: string
  configId: number
  fieldMappings: Array<{ key: string; fieldName: string }>
}

type LookupResult = { value: string; display: string; fields: Record<string, string> }

const LOOKUP_PANEL_MARKER = '__lookup_panel__'

// Session-scoped cache — avoids redundant API calls for identical queries.
const cache = new Map<string, LookupResult[]>()

// Picker results stored outside SurveyJS question objects — more reliable than __results.
const pickerResultsStore = new Map<string, LookupResult[]>()

export function attachLookupBehavior(
  surveyModel: Model,
  rawJson: Record<string, unknown>,
): void {
  const panels = detectLookupPanels(rawJson)
  if (!panels.length) return

  const states: Record<string, string> = {}
  const counters: Record<string, number> = {}
  const searches: Record<string, (q: string) => void> = {}
  const pickerToPanel = new Map<string, LookupPanelConfig>()
  // Tracks values set programmatically so the trigger's onValueChanged doesn't re-search.
  const justFilled = new Map<string, string>()
  // Tracks the last query string typed per trigger field, used to find the matching field
  // value after selection (e.g. typed "CRM" → field "cf_CRM_ID" = "CRM001" wins).
  const lastQueries = new Map<string, string>()

  for (const panel of panels) {
    states[panel.triggerFieldName] = 'idle'
    counters[panel.triggerFieldName] = 0
    searches[panel.triggerFieldName] = debounce(
      (q: string) => doSearch(surveyModel, panel, q, states, counters, justFilled),
      600,
    )
    pickerToPanel.set(panel.pickerFieldName, panel)
    initFields(surveyModel, panel)
    initPicker(surveyModel, panel)
  }

  surveyModel.onValidateQuestion.add((_s: any, opt: any) => {
    const panel = panels.find(p => p.triggerFieldName === opt.name)
    if (!panel) return
    const state = states[opt.name]
    if (state === 'idle') return
    if (state === 'searching')          opt.error = 'Still searching — please wait.'
    if (state === 'awaiting_selection') opt.error = 'Please select a result from the list.'
    if (state === 'not_found')          opt.error = 'Not found. Check the value and try again.'
    if (state === 'error')              opt.error = 'Lookup failed. Please try again.'
  })

  surveyModel.onValueChanged.add((_s: any, opt: any) => {
    // Picker selection
    const pickerPanel = pickerToPanel.get(opt.name)
    if (pickerPanel) {
      if (!opt.value) return
      const stored = pickerResultsStore.get(opt.name)
      const result = stored?.find(r => String(r.value) === String(opt.value))
      if (!result) return

      const lastQuery = lastQueries.get(pickerPanel.triggerFieldName) ?? ''
      const newTriggerValue = resolveTriggerValue(result, lastQuery, pickerPanel)

      // Set justFilled BEFORE fillFields — fillFields may synchronously fire onValueChanged
      // for the trigger (when trigger is in fieldMappings), and the guard must be ready.
      justFilled.set(pickerPanel.triggerFieldName, newTriggerValue)

      fillFields(surveyModel, pickerPanel, result.fields)
      clearPicker(surveyModel, pickerPanel)
      states[pickerPanel.triggerFieldName] = 'found'
      setDesc(surveyModel, pickerPanel.triggerFieldName, `Found: ${result.display}`)
      clearErr(surveyModel, pickerPanel.triggerFieldName)

      // If trigger is NOT in fieldMappings, fillFields won't touch it — update manually.
      const triggerMapping = pickerPanel.fieldMappings.find(
        m => m.fieldName === pickerPanel.triggerFieldName,
      )
      if (!triggerMapping) {
        const triggerQ = getQ(surveyModel, pickerPanel.triggerFieldName)
        if (triggerQ) triggerQ.value = newTriggerValue
      }
      return
    }

    // Trigger field input
    const panel = panels.find(p => p.triggerFieldName === opt.name)
    if (!panel) return

    const q = (opt.value || '').trim()

    // Skip re-search when the value was just set programmatically.
    if (justFilled.get(panel.triggerFieldName) === q) {
      justFilled.delete(panel.triggerFieldName)
      return
    }

    if (!q) {
      clearFields(surveyModel, panel)
      clearPicker(surveyModel, panel)
      states[panel.triggerFieldName] = 'idle'
      counters[panel.triggerFieldName]++
      setDesc(surveyModel, panel.triggerFieldName, 'Type to search…')
      clearErr(surveyModel, panel.triggerFieldName)
      return
    }

    if (q.length < 3) {
      clearFields(surveyModel, panel)
      clearPicker(surveyModel, panel)
      states[panel.triggerFieldName] = 'idle'
      counters[panel.triggerFieldName]++
      setDesc(surveyModel, panel.triggerFieldName, 'Type at least 3 characters…')
      clearErr(surveyModel, panel.triggerFieldName)
      return
    }

    clearFields(surveyModel, panel)
    clearPicker(surveyModel, panel)
    states[panel.triggerFieldName] = 'searching'
    clearErr(surveyModel, panel.triggerFieldName)
    setDesc(surveyModel, panel.triggerFieldName, `Searching…`)
    lastQueries.set(panel.triggerFieldName, q)
    searches[panel.triggerFieldName]?.(q)
  })
}

// ── Trigger value resolution ──────────────────────────────────────────────
// Determines what the trigger field should display after a lookup selection.
//
// Priority:
//   1. If the trigger field is explicitly in fieldMappings → use that API field value
//      (e.g. trigger field "crm_id" mapped to key "cf_CRM_ID" → "CRM002")
//   2. Find the result field whose value starts with what the user typed
//      (e.g. typed "CRM" → "cf_CRM_ID"="CRM001" matches → "CRM001")
//   3. Exact match in result fields (typed the full value)
//   4. Fall back to display name

function resolveTriggerValue(
  result: LookupResult,
  lastQuery: string,
  panel: LookupPanelConfig,
): string {
  const triggerMapping = panel.fieldMappings.find(m => m.fieldName === panel.triggerFieldName)
  if (triggerMapping && result.fields[triggerMapping.key]) {
    return result.fields[triggerMapping.key]
  }

  if (lastQuery) {
    const lq = lastQuery.toLowerCase()
    const entries = Object.entries(result.fields).filter(([, v]) => v !== '')
    const exact = entries.find(([, v]) => v.toLowerCase() === lq)
    if (exact) return exact[1]
    const sw = entries.find(([, v]) => v.toLowerCase().startsWith(lq))
    if (sw) return sw[1]
  }

  return result.display
}

// ── Question lookup helper ────────────────────────────────────────────────
// getQuestionByName sometimes misses questions nested inside panels.
// getAllQuestions() is exhaustive.
function getQ(model: Model, name: string): any {
  return (model.getAllQuestions() as any[]).find((q: any) => q.name === name) ?? null
}

// ── Detection ─────────────────────────────────────────────────────────────

function detectLookupPanels(raw: Record<string, unknown>): LookupPanelConfig[] {
  const panels: LookupPanelConfig[] = []
  for (const el of extractElements(raw)) {
    if (el[LOOKUP_PANEL_MARKER] !== true || !el.lookupConfigId || !el.elements) continue
    const elements = el.elements as any[]
    const trigger = elements[0]
    if (!trigger?.name) continue
    const mappings = el.lookupFieldMappings as any[] | undefined
    if (!mappings?.length) continue
    panels.push({
      triggerFieldName: trigger.name,
      pickerFieldName: `${trigger.name}_picker`,
      configId: el.lookupConfigId as number,
      fieldMappings: mappings.map((m: any) => ({ key: m.key, fieldName: m.fieldName })),
    })
  }
  return panels
}

function extractElements(json: Record<string, unknown>): Record<string, unknown>[] {
  const els: Record<string, unknown>[] = []
  if (Array.isArray(json.pages)) {
    for (const p of json.pages as Record<string, unknown>[])
      if (Array.isArray(p.elements)) els.push(...(p.elements as Record<string, unknown>[]))
  }
  if (Array.isArray(json.elements)) els.push(...(json.elements as Record<string, unknown>[]))
  return els
}

// ── Search ────────────────────────────────────────────────────────────────

async function doSearch(
  model: Model,
  panel: LookupPanelConfig,
  query: string,
  states: Record<string, string>,
  counters: Record<string, number>,
  justFilled: Map<string, string>,
): Promise<void> {
  const myId = ++counters[panel.triggerFieldName]

  try {
    const cacheKey = `${panel.configId}:${query}`
    let results: LookupResult[]

    if (cache.has(cacheKey)) {
      if (counters[panel.triggerFieldName] !== myId) return
      results = cache.get(cacheKey)!
    } else {
      const res = await lookupAPI.query(panel.configId, query)
      if (counters[panel.triggerFieldName] !== myId) return

      if (res.error) {
        states[panel.triggerFieldName] = 'error'
        setErr(model, panel.triggerFieldName, `Lookup error: ${res.error}`)
        clearFields(model, panel)
        return
      }

      results = res.results ?? []
      if (!res.error) cache.set(cacheKey, results)
    }

    if (!results.length) {
      states[panel.triggerFieldName] = 'not_found'
      clearFields(model, panel)
      clearErr(model, panel.triggerFieldName)
      setDesc(model, panel.triggerFieldName, `Not found for "${query}"`)
      return
    }

    handleResults(model, panel, results, states, justFilled, query)

  } catch {
    if (counters[panel.triggerFieldName] !== myId) return
    states[panel.triggerFieldName] = 'error'
    setErr(model, panel.triggerFieldName, 'Lookup failed. Please try again.')
    clearFields(model, panel)
  }
}

function handleResults(
  model: Model,
  panel: LookupPanelConfig,
  results: LookupResult[],
  states: Record<string, string>,
  justFilled: Map<string, string>,
  query: string,
): void {
  if (results.length === 1) {
    const newTriggerValue = resolveTriggerValue(results[0], query, panel)
    justFilled.set(panel.triggerFieldName, newTriggerValue)
    fillFields(model, panel, results[0].fields)
    const triggerMapping = panel.fieldMappings.find(m => m.fieldName === panel.triggerFieldName)
    if (!triggerMapping) {
      const triggerQ = getQ(model, panel.triggerFieldName)
      if (triggerQ) triggerQ.value = newTriggerValue
    }
    states[panel.triggerFieldName] = 'found'
    clearErr(model, panel.triggerFieldName)
    setDesc(model, panel.triggerFieldName, `Found: ${results[0].display}`)
  } else {
    states[panel.triggerFieldName] = 'awaiting_selection'
    showPicker(model, panel, results)
    clearErr(model, panel.triggerFieldName)
    setDesc(model, panel.triggerFieldName, `${results.length} results found — select one below:`)
  }
}

// ── Field helpers ─────────────────────────────────────────────────────────

function initFields(model: Model, panel: LookupPanelConfig): void {
  for (const m of panel.fieldMappings) {
    // Never hide the trigger field — it's the search input, always visible.
    if (m.fieldName === panel.triggerFieldName) continue
    const f = getQ(model, m.fieldName) as any
    if (f) f.visible = false
  }
  setDesc(model, panel.triggerFieldName, 'Type to search…')
}

function fillFields(model: Model, panel: LookupPanelConfig, fields: Record<string, string>): void {
  for (const m of panel.fieldMappings) {
    const f = getQ(model, m.fieldName) as any
    if (f) { f.value = fields[m.key] ?? ''; f.visible = true }
  }
}

function clearFields(model: Model, panel: LookupPanelConfig): void {
  for (const m of panel.fieldMappings) {
    // Never clear/hide the trigger field — user is actively typing in it.
    if (m.fieldName === panel.triggerFieldName) continue
    const f = getQ(model, m.fieldName) as any
    if (f) { f.value = undefined; f.visible = false }
  }
}

// ── Picker helpers ─────────────────────────────────────────────────────────

function initPicker(model: Model, panel: LookupPanelConfig): void {
  clearPicker(model, panel)
}

function showPicker(model: Model, panel: LookupPanelConfig, results: LookupResult[]): void {
  const q = getQ(model, panel.pickerFieldName) as any
  if (!q) return
  pickerResultsStore.set(panel.pickerFieldName, results)
  q.choices = results.map(r => ({ value: r.value, text: r.display }))
  q.value = undefined
  q.visible = true
}

function clearPicker(model: Model, panel: LookupPanelConfig): void {
  const q = getQ(model, panel.pickerFieldName) as any
  if (!q) return
  pickerResultsStore.delete(panel.pickerFieldName)
  q.choices = []
  q.value = undefined
  q.visible = false
}

// ── Desc / error helpers ──────────────────────────────────────────────────

function setDesc(model: Model, name: string, text: string): void {
  const f = getQ(model, name) as any
  if (f) f.description = text
}

function setErr(model: Model, name: string, msg: string): void {
  const f = getQ(model, name) as any
  if (f) { f.description = ''; f.clearErrors?.(); f.addError?.(msg) }
}

function clearErr(model: Model, name: string): void {
  const f = getQ(model, name) as any
  if (f) f.clearErrors?.()
}
