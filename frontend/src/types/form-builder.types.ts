// src/types/form-builder.types.ts
// All types shared between FormBuilder, FieldEditor, and BulkkImporter.
// Previously duplicated across FormBuilder.tsx and FieldEditor.tsx.

// ── Field validation ──────────────────────────────────────────────────────────

export interface Validator {
  _id?: string;
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
  _id?: string;
  fieldName: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notEmpty' | 'empty';
  value: string;
}

// ── Bulk CSV import configuration per paneldynamic field ─────────────────────

export interface BulkImportField {
  name: string; // field name, for example "ip_address"
  required: boolean; // is this column required in csv file
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
  allowBulkImport?: boolean; // bulk import enabled on this group?
  bulkImportFields?: BulkImportField[]; //which sub-fields needs to be in csv import.
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