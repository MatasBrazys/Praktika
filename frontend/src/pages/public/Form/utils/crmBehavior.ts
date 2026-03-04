// src/pages/public/Form/utils/crmBehavior.ts
// Attaches real-time CRM lookup behaviour to a SurveyJS model.
// When a user types a CRM ID, the 4 read-only autofill fields are populated automatically.

import type { Model } from 'survey-core';
import { crmAPI } from '../../../../services/api';
import { debounce } from '../../../../lib/utils';

const CRM_SUFFIXES = ['name', 'street', 'postcode', 'state'] as const;

type LookupState = 'idle' | 'searching' | 'found' | 'not_found' | 'error';

// Wires up CRM autofill and inline regex validation to the given survey model.
// Call this once after creating the Model, before rendering.
export function attachRealtimeBehavior(surveyModel: Model): void {
  const allQuestions = () => surveyModel.getAllQuestions() as any[];

  const crmPrefixes = detectCrmPrefixes(allQuestions());
  initCrmFields(allQuestions, crmPrefixes);

  const states: Record<string, LookupState> = {};
  crmPrefixes.forEach(prefix => { states[prefix] = 'idle'; });

  // Blocks form submission if a CRM lookup is still in progress or failed
  surveyModel.onValidateQuestion.add((_survey, options) => {
    if (!crmPrefixes.includes(options.name)) return;
    if (!(options.value || '').trim()) return;

    const state = states[options.name];
    if (state === 'searching')                      options.error = 'Still searching — please wait.';
    if (state === 'not_found' || state === 'error') options.error = 'Enter a valid CRM ID before submitting.';
  });

  // Triggers CRM lookup on ID change, or inline regex validation for other fields
  surveyModel.onValueChanged.add((_survey, options) => {
    if (crmPrefixes.includes(options.name)) {
      handleCrmIdChange(options.name, options.value, allQuestions, states);
      return;
    }
    handleRegexValidation(options.name, options.value, allQuestions);
  });
}

// ── Private helpers ───────────────────────────────────────────────────────────

// Finds all CRM ID fields by checking which questions have a matching _name sibling
function detectCrmPrefixes(questions: any[]): string[] {
  return questions
    .filter(q => questions.some(s => s.name === `${q.name}_name`))
    .map(q => q.name);
}

// Hides autofill fields and sets initial description for each CRM ID field
function initCrmFields(allQuestions: () => any[], crmPrefixes: string[]): void {
  crmPrefixes.forEach(prefix => {
    CRM_SUFFIXES.forEach(suffix => {
      const field = allQuestions().find(q => q.name === `${prefix}_${suffix}`);
      if (field) { field.visibleIf = ''; field.visible = false; }
    });

    const idField = allQuestions().find(q => q.name === prefix);
    if (idField) idField.description = 'Enter a CRM ID to look up client details.';
  });
}

// Updates the CRM ID field's description or error based on lookup state
function setCrmState(
  prefix: string,
  state: LookupState,
  allQuestions: () => any[],
  meta?: { id?: string; company?: string },
): void {
  const idField = allQuestions().find(q => q.name === prefix);
  if (!idField) return;

  switch (state) {
    case 'idle':
      idField.description = 'Enter a CRM ID to look up client details.';
      idField.clearErrors?.();
      break;
    case 'searching':
      idField.description = `🔍 Searching for "${meta?.id}"…`;
      idField.clearErrors?.();
      break;
    case 'found':
      idField.description = `✅ Found: ${meta?.company ?? 'Client'}`;
      idField.clearErrors?.();
      break;
    case 'not_found':
      idField.description = '';
      idField.addError?.(`CRM ID "${meta?.id}" not found. Please check and try again.`);
      break;
    case 'error':
      idField.description = '';
      idField.addError?.('CRM lookup failed. Please try again.');
      break;
  }
}

// Hides and clears all 4 autofill fields for a CRM prefix
function clearAutofillFields(prefix: string, allQuestions: () => any[]): void {
  CRM_SUFFIXES.forEach(suffix => {
    const field = allQuestions().find(q => q.name === `${prefix}_${suffix}`);
    if (field) { field.value = undefined; field.visible = false; }
  });
}

// Fires the CRM API lookup after a 600ms debounce and populates autofill fields
const doCrmLookup = debounce(async (
  prefix: string,
  crmId: string,
  allQuestions: () => any[],
  states: Record<string, LookupState>,
) => {
  states[prefix] = 'searching';
  setCrmState(prefix, 'searching', allQuestions, { id: crmId });
  clearAutofillFields(prefix, allQuestions);

  try {
    const result = await crmAPI.lookup(crmId);

    if (!result.found) {
      states[prefix] = 'not_found';
      setCrmState(prefix, 'not_found', allQuestions, { id: crmId });
      return;
    }

    CRM_SUFFIXES.forEach(suffix => {
      const field = allQuestions().find(q => q.name === `${prefix}_${suffix}`);
      if (field) { field.value = result[suffix] ?? ''; field.visible = true; }
    });

    states[prefix] = 'found';
    setCrmState(prefix, 'found', allQuestions, { id: crmId, company: result.name });
  } catch {
    states[prefix] = 'error';
    setCrmState(prefix, 'error', allQuestions);
  }
}, 600);

// Handles value changes on CRM ID fields
function handleCrmIdChange(
  fieldName: string,
  rawValue: string,
  allQuestions: () => any[],
  states: Record<string, LookupState>,
): void {
  const crmId = (rawValue || '').trim().toUpperCase();

  if (!crmId) {
    clearAutofillFields(fieldName, allQuestions);
    states[fieldName] = 'idle';
    setCrmState(fieldName, 'idle', allQuestions);
    return;
  }

  doCrmLookup(fieldName, crmId, allQuestions, states);
}

// Shows inline error if the value does not match the field's regex validators
function handleRegexValidation(fieldName: string, value: any, allQuestions: () => any[]): void {
  const field = allQuestions().find(q => q.name === fieldName);
  if (!field) return;

  const regexValidators = (field.validators || []).filter((v: any) => v.regex);
  if (!regexValidators.length) return;

  const stringValue = String(value ?? '').trim();
  field.clearErrors?.();
  if (!stringValue) return;

  for (const validator of regexValidators) {
    try {
      if (!new RegExp(validator.regex).test(stringValue)) {
        field.addError?.(validator.text || 'Invalid format');
        return;
      }
    } catch {
      // Skip malformed regex patterns
    }
  }
}