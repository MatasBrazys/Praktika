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
  compareField?: string;
  operation?: string;
}

// ── Cross-field operations ───────────────────────────────────────────────────

export interface CrossFieldOperation {
  value: string;
  label: string;
  description: string;
}

export const CROSSFIELD_OPERATIONS: CrossFieldOperation[] = [
  { value: 'subnet_contains', label: '⊂ IP in subnet',  description: 'IP address must be within the CIDR subnet range' },
  { value: 'not_equal',       label: '≠ Not equal',      description: 'Values must be different' },
  { value: 'less_than',       label: '< Less than',      description: 'Number must be less than the other field' },
  { value: 'greater_than',    label: '> Greater than',    description: 'Number must be greater than the other field' },
  { value: 'before_date',     label: '◀ Before date',    description: 'Date must be earlier than the other field' },
  { value: 'after_date',      label: '▶ After date',     description: 'Date must be later than the other field' },
];

// ── Conditional visibility ───────────────────────────────────────────────────

export interface Condition {
  _id?: string;
  fieldName: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notEmpty' | 'empty';
  value: string;
}

// ── Bulk CSV import configuration ────────────────────────────────────────────

export interface BulkImportField {
  name: string;
  required: boolean;
}

// ── Dynamic choices ─────────────────────────────────────────────────────────

export interface DynamicChoicesSource {
  fieldName: string;
  subFieldName?: string;
}

// ── Lookup field mappings ───────────────────────────────────────────────────

export interface LookupFieldMapping {
  key: string;      // API response field path, e.g. "site.name"
  label: string;    // Form label, e.g. "Site"
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
  // lookup specific
  lookupConfigId?: number;
  lookupFieldMappings?: LookupFieldMapping[];
}

// ── Form page ─────────────────────────────────────────────────────────────────

export interface Page {
  id: string;
  name: string;
  title: string;
  fields: FieldConfig[];
}