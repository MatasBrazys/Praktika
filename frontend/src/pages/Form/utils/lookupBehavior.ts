// src/pages/public/Form/utils/lookupBehavior.ts
// Attaches real-time lookup to SurveyJS models for Lookup fields.
//
// Flow: user types unique ID → debounced → backend proxy → API returns result → autofill
// Simple: if API returns anything → autofill first result. If nothing → not found.
// The API endpoint itself is responsible for filtering — we just display what comes back.
//
// Race condition safe: each search has a request counter.

import type { Model } from 'survey-core'
import { lookupAPI } from '../../../services/api'
import { debounce } from '../../../lib/utils'

interface LookupPanelConfig {
  triggerFieldName: string
  configId: number
  fieldMappings: Array<{ key: string; fieldName: string }>
}

const LOOKUP_PANEL_MARKER = '__lookup_panel__'

export function attachLookupBehavior(
  surveyModel: Model,
  rawJson: Record<string, unknown>,
): void {
  const panels = detectLookupPanels(rawJson)
  if (!panels.length) return

  const states: Record<string, string> = {}
  const counters: Record<string, number> = {}
  const searches: Record<string, (q: string) => void> = {}

  for (const panel of panels) {
    states[panel.triggerFieldName] = 'idle'
    counters[panel.triggerFieldName] = 0
    searches[panel.triggerFieldName] = debounce(
      (q: string) => doSearch(surveyModel, panel, q, states, counters),
      600,
    )
    initFields(surveyModel, panel)
  }

  // Block submit while searching
  surveyModel.onValidateQuestion.add((_s: any, opt: any) => {
    const panel = panels.find(p => p.triggerFieldName === opt.name)
    if (!panel) return
    if (!(opt.value || '').trim()) return
    const state = states[opt.name]
    if (state === 'searching') opt.error = 'Still searching — please wait.'
    if (state === 'not_found') opt.error = 'Not found. Check the value and try again.'
    if (state === 'error') opt.error = 'Lookup failed. Please try again.'
  })

  surveyModel.onValueChanged.add((_s: any, opt: any) => {
    const panel = panels.find(p => p.triggerFieldName === opt.name)
    if (!panel) return

    const q = (opt.value || '').trim()
    if (!q) {
      clearFields(surveyModel, panel)
      states[panel.triggerFieldName] = 'idle'
      counters[panel.triggerFieldName]++
      setDesc(surveyModel, panel.triggerFieldName, 'Type to search…')
      clearErr(surveyModel, panel.triggerFieldName)
      return
    }

    clearFields(surveyModel, panel)
    states[panel.triggerFieldName] = 'searching'
    clearErr(surveyModel, panel.triggerFieldName)
    setDesc(surveyModel, panel.triggerFieldName, `🔍 Searching…`)
    searches[panel.triggerFieldName]?.(q)
  })
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
): Promise<void> {
  const myId = ++counters[panel.triggerFieldName]

  try {
    const res = await lookupAPI.query(panel.configId, query)

    // Stale — newer search already fired
    if (counters[panel.triggerFieldName] !== myId) return

    if (res.error) {
      states[panel.triggerFieldName] = 'error'
      setErr(model, panel.triggerFieldName, `Lookup error: ${res.error}`)
      clearFields(model, panel)
      return
    }

    if (!res.found || !res.results.length) {
      states[panel.triggerFieldName] = 'not_found'
      clearFields(model, panel)
      clearErr(model, panel.triggerFieldName)
      setDesc(model, panel.triggerFieldName, `❌ Not found for "${query}"`)
      return
    }

    // Got result(s) — always use first. API is responsible for filtering.
    const result = res.results[0]
    fillFields(model, panel, result.fields)
    states[panel.triggerFieldName] = 'found'
    clearErr(model, panel.triggerFieldName)
    setDesc(model, panel.triggerFieldName, `✅ Found: ${result.display}`)

  } catch {
    if (counters[panel.triggerFieldName] !== myId) return
    states[panel.triggerFieldName] = 'error'
    setErr(model, panel.triggerFieldName, 'Lookup failed. Please try again.')
    clearFields(model, panel)
  }
}

// ── Field helpers ─────────────────────────────────────────────────────────

function initFields(model: Model, panel: LookupPanelConfig): void {
  for (const m of panel.fieldMappings) {
    const f = model.getQuestionByName(m.fieldName) as any
    if (f) f.visible = false
  }
  setDesc(model, panel.triggerFieldName, 'Type to search…')
}

function fillFields(model: Model, panel: LookupPanelConfig, fields: Record<string, string>): void {
  for (const m of panel.fieldMappings) {
    const f = model.getQuestionByName(m.fieldName) as any
    if (f) { f.value = fields[m.key] ?? ''; f.visible = true }
  }
}

function clearFields(model: Model, panel: LookupPanelConfig): void {
  for (const m of panel.fieldMappings) {
    const f = model.getQuestionByName(m.fieldName) as any
    if (f) { f.value = undefined; f.visible = false }
  }
}

function setDesc(model: Model, name: string, text: string): void {
  const f = model.getQuestionByName(name) as any
  if (f) f.description = text
}

function setErr(model: Model, name: string, msg: string): void {
  const f = model.getQuestionByName(name) as any
  if (f) { f.description = ''; f.clearErrors?.(); f.addError?.(msg) }
}

function clearErr(model: Model, name: string): void {
  const f = model.getQuestionByName(name) as any
  if (f) f.clearErrors?.()
}