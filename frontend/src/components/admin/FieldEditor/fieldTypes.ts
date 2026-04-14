// src/components/admin/FieldEditor/fieldTypes.ts
// Shared field type and input type options used in BasicTab and TemplateFieldRow.

export const FIELD_TYPES = [
  { value: 'text',         label: '📝 Text Input' },
  { value: 'comment',      label: '📄 Text Area' },
  { value: 'dropdown',     label: '🔽 Dropdown' },
  { value: 'radiogroup',   label: '◉ Radio Buttons' },
  { value: 'checkbox',     label: '☑️ Checkboxes' },
  { value: 'boolean',      label: '✓ Yes/No' },
  { value: 'paneldynamic', label: '🔁 Repeated Group' },
  { value: 'lookup',       label: '🔍 Lookup (API)' },
];

export const TEXT_INPUT_TYPES = [
  { value: 'text',   label: 'Plain Text' },
  { value: 'email',  label: '📧 Email Address' },
  { value: 'phone',  label: '📞 Phone Number' },
  { value: 'ipv4',   label: '🌐 IPv4 Address' },
  { value: 'cidr',   label: '🔗 CIDR Subnet' },
  { value: 'mac',    label: '🔌 MAC Address' },
  { value: 'number', label: '🔢 Number' },
  { value: 'date',   label: '📅 Date' },
];