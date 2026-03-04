// src/pages/public/Form/utils/bulkPanelDetector.ts
// Scans a SurveyJS JSON object for paneldynamic fields with bulk import enabled.

import type { BulkPanelWithPage } from '../../../../types/survey.types';

// Returns all paneldynamic fields that have allowBulkImport=true configured.
// Handles both single-page (elements) and multi-page (pages) SurveyJS JSON formats.
export function detectBulkPanels(surveyJson: any): BulkPanelWithPage[] {
  if (surveyJson.pages) {
    return surveyJson.pages.flatMap((page: any, pageIndex: number) =>
      extractBulkPanelsFromElements(page.elements || [], pageIndex)
    );
  }

  return extractBulkPanelsFromElements(surveyJson.elements || [], 0);
}

// ── Private helpers ───────────────────────────────────────────────────────────

// Filters elements array for paneldynamic fields with bulk import configured
function extractBulkPanelsFromElements(elements: any[], pageIndex: number): BulkPanelWithPage[] {
  return elements
    .filter(el =>
      el.type === 'paneldynamic' &&
      el.allowBulkImport === true &&
      (el.bulkImportFields || []).length > 0
    )
    .map(el => ({
      questionName:     el.name,
      templateElements: el.templateElements || [],
      bulkImportFields: el.bulkImportFields || [],
      pageIndex,
    }));
}