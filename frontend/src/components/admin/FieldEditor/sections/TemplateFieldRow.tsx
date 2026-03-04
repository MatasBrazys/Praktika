// src/components/admin/FieldEditor/sections/TemplateFieldRow.tsx
// A single repeatable field row inside a paneldynamic configuration.
// Includes type, title, name, validators, and conditions for that field.

import type { FieldConfig, Validator, Condition } from '../../../../types/form-builder.types';


const TEXT_INPUT_TYPES = [
  { value: 'text',   label: 'Plain Text' },
  { value: 'email',  label: '📧 Email Address' },
  { value: 'phone',  label: '📞 Phone Number' },
  { value: 'ipv4',   label: '🌐 IPv4 Address' },
  { value: 'cidr',   label: '🔗 CIDR Subnet' },
  { value: 'mac',    label: '🔌 MAC Address' },
  { value: 'number', label: '🔢 Number' },
  { value: 'date',   label: '📅 Date' },
];

interface Props {
  tf:                        FieldConfig;
  idx:                       number;
  allTemplateFields:         FieldConfig[];
  choicesText:               string;
  expandedValidators:        number | null;
  expandedConditions:        number | null;
  onUpdate:                  (idx: number, updates: Partial<FieldConfig>) => void;
  onDelete:                  (idx: number) => void;
  onChoicesChange:           (idx: number, text: string) => void;
  onTypeChange:              (idx: number, type: string) => void;
  onInputTypeChange:         (idx: number, inputType: string) => void;
  onToggleValidators:        (idx: number) => void;
  onToggleConditions:        (idx: number) => void;
  onAddValidator:            (idx: number, presetKey?: string) => void;
  onUpdateValidator:         (ti: number, vi: number, updates: Partial<Validator>) => void;
  onDeleteValidator:         (ti: number, vi: number) => void;
  onAddCondition:            (idx: number) => void;
  onUpdateCondition:         (ti: number, ci: number, updates: Partial<Condition>) => void;
  onDeleteCondition:         (ti: number, ci: number) => void;
  onConditionLogicChange:    (idx: number, logic: 'and' | 'or') => void;
}

export default function TemplateFieldRow({
  tf, idx, allTemplateFields, choicesText,
  expandedValidators, expandedConditions,
  onUpdate, onDelete, onChoicesChange, onTypeChange, onInputTypeChange,
  onToggleValidators, onToggleConditions,
  onAddValidator, onUpdateValidator, onDeleteValidator,
  onAddCondition, onUpdateCondition, onDeleteCondition, onConditionLogicChange,
}: Props) {
  const otherFields = allTemplateFields.filter((_f, i) => i !== idx);

  return (
    <div className="template-field-row">
      <div className="header-section">
        <button className="btn-delete-small" onClick={() => onDelete(idx)}>×</button>
      </div>

      {/* Title / Name / Type */}
      <div className="form-row three-cols">
        <div className="form-group">
          <label>Title</label>
          <input type="text" value={tf.title} onChange={e => onUpdate(idx, { title: e.target.value })} placeholder="Field title" />
        </div>
        <div className="form-group">
          <label>Name</label>
          <input type="text" value={tf.name} onChange={e => onUpdate(idx, { name: e.target.value })} placeholder="fieldName" />
        </div>
        <div className="form-group">
          <label>Type</label>
          <select value={tf.type} onChange={e => onTypeChange(idx, e.target.value)}>
            <option value="text">Text Input</option>
            <option value="comment">Text Area</option>
            <option value="dropdown">Dropdown</option>
            <option value="radiogroup">Radio Buttons</option>
            <option value="checkbox">Checkboxes</option>
            <option value="boolean">Yes/No</option>
          </select>
        </div>
      </div>

      {/* Default / Placeholder */}
      <div className="form-row">
        <div className="form-group">
          <label>Default</label>
          <input type="text" value={tf.defaultValue || ''} onChange={e => onUpdate(idx, { defaultValue: e.target.value })} placeholder="Default value" />
        </div>
        <div className="form-group">
          <label>Placeholder</label>
          <input type="text" value={tf.placeholder || ''} onChange={e => onUpdate(idx, { placeholder: e.target.value })} placeholder="e.g. Enter value..." />
        </div>
      </div>

      {tf.type === 'text' && (
        <div className="form-group">
          <label>Input Type</label>
          <select value={tf.inputType || 'text'} onChange={e => onInputTypeChange(idx, e.target.value)}>
            {TEXT_INPUT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      )}

      {['dropdown', 'radiogroup', 'checkbox'].includes(tf.type) && (
        <div className="form-group">
          <label>Choices (one per line)</label>
          <textarea
            value={choicesText}
            onChange={e => onChoicesChange(idx, e.target.value)}
            rows={3}
            placeholder="Type each option on a new line"
          />
        </div>
      )}

      <div className="template-required-section">
        <label className="template-checkbox-label">
          <input type="checkbox" checked={tf.isRequired || false} onChange={e => onUpdate(idx, { isRequired: e.target.checked })} />
          Required field
        </label>
      </div>

      {/* Validators accordion */}
      <div className="template-validators-section">
        <button className="btn-toggle-validators" onClick={() => onToggleValidators(idx)}>
          {expandedValidators === idx ? '▼' : '▶'} Validators{tf.validators?.length ? ` (${tf.validators.length})` : ''}
        </button>
        {expandedValidators === idx && (
          <div className="template-validators-content">
            <div className="validator-presets-compact">
              <label>Quick add:</label>
              {['ipv4', 'email', 'phone', 'mac'].map(key => (
                <code key={key} onClick={() => onAddValidator(idx, key)}>{key.toUpperCase()}</code>
              ))}
              <button className="btn-add-small" onClick={() => onAddValidator(idx)}>+ Custom Regex</button>
            </div>
            {!(tf.validators || []).length && <p className="no-validators">No validators</p>}
            {(tf.validators || []).map((v, vIdx) => (
              <div key={vIdx} className="template-validator-item">
                <div className="form-group">
                  <label>Error Message</label>
                  <input type="text" value={v.text} onChange={e => onUpdateValidator(idx, vIdx, { text: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Regex Pattern</label>
                  <div className="validator-regex-row">
                    <input type="text" value={v.regex || ''} onChange={e => onUpdateValidator(idx, vIdx, { regex: e.target.value })} className="code-input" />
                    <button className="btn-delete-small" onClick={() => onDeleteValidator(idx, vIdx)}>×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conditions accordion */}
      <div className="template-validators-section">
        <button className="btn-toggle-validators" onClick={() => onToggleConditions(idx)}>
          {expandedConditions === idx ? '▼' : '▶'} Conditionals{tf.conditions?.length ? ` (${tf.conditions.length})` : ''}
        </button>
        {expandedConditions === idx && (
          <div className="template-validators-content">
            <div className="conditions-info-compact">
              <p>This field will be <strong>hidden</strong> until conditions are met.</p>
            </div>

            {(tf.conditions || []).length > 1 && (
              <div className="logic-toggle-compact">
                <span>Match:</span>
                {(['and', 'or'] as const).map(l => (
                  <button
                    key={l}
                    className={`logic-btn-small ${(tf.conditionLogic || 'and') === l ? 'active' : ''}`}
                    onClick={() => onConditionLogicChange(idx, l)}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {!(tf.conditions || []).length && (
              <p className="no-validators">No conditions — field is always visible</p>
            )}

            {(tf.conditions || []).map((c, cIdx) => (
              <div key={cIdx} className="template-condition-row">
                {cIdx > 0 && (
                  <div className="condition-logic-label-small">{(tf.conditionLogic || 'and').toUpperCase()}</div>
                )}
                <div className="condition-inputs-compact">
                  <select value={c.fieldName} onChange={e => onUpdateCondition(idx, cIdx, { fieldName: e.target.value })}>
                    <option value="">Select field...</option>
                    {otherFields.map(f => <option key={f.id} value={f.name}>{f.title}</option>)}
                  </select>
                  <select value={c.operator} onChange={e => onUpdateCondition(idx, cIdx, { operator: e.target.value as Condition['operator'] })}>
                    <option value="equals">equals</option>
                    <option value="notEquals">not equals</option>
                    <option value="contains">contains</option>
                    <option value="notEmpty">is not empty</option>
                    <option value="empty">is empty</option>
                  </select>
                  {!['empty', 'notEmpty'].includes(c.operator) && (
                    <input
                      type="text"
                      value={c.value}
                      onChange={e => onUpdateCondition(idx, cIdx, { value: e.target.value })}
                      placeholder="Value..."
                      className="condition-value-input"
                    />
                  )}
                  <button className="btn-delete-small" onClick={() => onDeleteCondition(idx, cIdx)}>×</button>
                </div>
              </div>
            ))}

            <button className="btn-add-small" style={{ marginTop: '8px', width: '100%' }} onClick={() => onAddCondition(idx)}>
              + Add Condition
            </button>
          </div>
        )}
      </div>
    </div>
  );
}