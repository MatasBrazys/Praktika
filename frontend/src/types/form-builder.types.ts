// src/types/form-builder.types.ts
// All types shared between FormBuilder, FieldEditor, and BulkImporter.

// ── Field validation ──────────────────────────────────────────────────────────

export interface Validator {
  _id?: string;
  type: 'regex' | 'numeric' | 'text' | 'crossfield';
  text: string;
  regex?: string;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  // crossfield specific
  compareField?: string;   // name of the field to compare against
  operation?: string;      // e.g. "subnet_contains", "not_equal", "less_than"
}

// ── Cross-field operations ───────────────────────────────────────────────────

export interface CrossFieldOperation {
  value: string;
  label: string;
  description: string;
}

export const CROSSFIELD_OPERATIONS: CrossFieldOperation[] = [
  { value: 'subnet_contains', label: '⊂ IP in subnet',     description: 'IP address must be within the CIDR subnet range' },
  { value: 'not_equal',       label: '≠ Not equal',         description: 'Values must be different' },
  { value: 'less_than',       label: '< Less than',         description: 'Number must be less than the other field' },
  { value: 'greater_than',    label: '> Greater than',       description: 'Number must be greater than the other field' },
  { value: 'before_date',     label: '◀ Before date',       description: 'Date must be earlier than the other field' },
  { value: 'after_date',      label: '▶ After date',        description: 'Date must be later than the other field' },
];


// ── Conditional visibility (maps to SurveyJS visibleIf expressions) ──────────

export interface Condition {
  _id?: string;
  fieldName: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notEmpty' | 'empty';
  value: string;
}

// ── Bulk CSV import configuration per paneldynamic field ─────────────────────

export interface BulkImportField {
  name: string;
  required: boolean;
}

// ── Dynamic choices — dropdown/radiogroup pulls choices from another field ───

export interface DynamicChoicesSource {
  fieldName: string;
  subFieldName?: string;
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
  // dynamic choices
  dynamicChoicesSource?: DynamicChoicesSource;
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
