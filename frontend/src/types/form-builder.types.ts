// src/types/form-builder.types.ts
// All types shared between FormBuilder, FieldEditor, and NetworkImporter.
// Previously duplicated across FormBuilder.tsx and FieldEditor.tsx.

// ── Field validation ──────────────────────────────────────────────────────────

export interface Validator {
  type: 'regex' | 'numeric' | 'text';
  text: string;
  regex?: string;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
}

// ── Conditional visibility (maps to SurveyJS visibleIf expressions) ──────────

export interface Condition {
  fieldName: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notEmpty' | 'empty';
  value: string;
}

// ── Bulk CSV import configuration per paneldynamic field ─────────────────────

export interface BulkImportField {
  name: string;
  required: boolean;
}

// ── Single form field configuration ──────────────────────────────────────────

export interface FieldConfig {
  id: string;
  name: string;
  title: string;
  description?: string;
  type: string;
  isRequired: boolean;
  inputType?: string;
  choices?: string[];
  defaultValue?: string;
  placeholder?: string;
  validators?: Validator[];
  conditions?: Condition[];
  conditionLogic?: 'and' | 'or';
  // paneldynamic specific
  templateElements?: FieldConfig[];
  addPanelText?: string;
  removePanelText?: string;
  minPanelCount?: number;
  panelCount?: number;
  // bulk import
  allowBulkImport?: boolean;
  bulkImportFields?: BulkImportField[];
  // crmlookup specific
  crmFieldLabels?: {
    name?: string;
    street?: string;
    postcode?: string;
    state?: string;
  };
}

// ── Form page (multi-page forms) ──────────────────────────────────────────────

export interface Page {
  id: string;
  name: string;
  title: string;
  fields: FieldConfig[];
}