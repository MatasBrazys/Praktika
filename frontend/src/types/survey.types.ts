// src/types/survey.types.ts
// Types related to SurveyJS runtime and bulk import panel detection.

import type { BulkImportField } from './form-builder.types'

// ── Minimal SurveyJS element used only in bulk

export interface SurveyElement {
  name:        string
  type?:       string
  validators?: Array<{ regex?: string; text?: string }>
  choices?:    Array<string | { value?: string; text?: string }>
  [key: string]: unknown  // SurveyJS has many optional props we don't need to enumerate
}

// ── Bulk import panel config passed to BulkImporter component ──────────────

export interface BulkPanelConfig {
  questionName:     string           // paneldynamic field name, for example 'servers'
  templateElements: SurveyElement[]  // sub-field description (types, validators, choices)
  bulkImportFields: BulkImportField[] // which columns present and necessary.
}

// ── Extends BulkPanelConfig with the page index for multi-page forms ─────────

export interface BulkPanelWithPage extends BulkPanelConfig {
  pageIndex: number
}