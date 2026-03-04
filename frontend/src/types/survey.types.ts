// src/types/survey.types.ts
// Types related to SurveyJS runtime and bulk import panel detection.

import type { BulkImportField } from './form-builder.types';

// ── Bulk import panel config passed to NetworkImporter component ──────────────

export interface BulkPanelConfig {
  questionName: string;
  templateElements: any[];     // raw SurveyJS templateElements from JSON
  bulkImportFields: BulkImportField[];
}

// ── Extends BulkPanelConfig with the page index for multi-page forms ─────────

export interface BulkPanelWithPage extends BulkPanelConfig {
  pageIndex: number;
}