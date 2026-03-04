// src/components/admin/FieldEditor/tabs/ConditionsTab.tsx
// Conditions tab — configure visibleIf logic for a field.

import type { Condition, FieldConfig } from '../../../../types/form-builder.types';

interface Props {
  conditions:     Condition[];
  conditionLogic: 'and' | 'or';
  allFields:      FieldConfig[];
  onAdd:          () => void;
  onUpdate:       (index: number, updates: Partial<Condition>) => void;
  onDelete:       (index: number) => void;
  onLogicChange:  (logic: 'and' | 'or') => void;
}

export default function ConditionsTab({
  conditions, conditionLogic, allFields, onAdd, onUpdate, onDelete, onLogicChange,
}: Props) {
  return (
    <div className="conditions-section">
      <div className="conditions-info">
        <p>This field will be <strong>hidden by default</strong> and shown only when conditions are met.</p>
      </div>

      {conditions.length > 1 && (
        <div className="logic-toggle">
          <span>Match:</span>
          <button className={`logic-btn ${conditionLogic === 'and' ? 'active' : ''}`} onClick={() => onLogicChange('and')}>ALL conditions (AND)</button>
          <button className={`logic-btn ${conditionLogic === 'or'  ? 'active' : ''}`} onClick={() => onLogicChange('or')}>ANY condition (OR)</button>
        </div>
      )}

      {conditions.length === 0 && (
        <div className="empty-conditions">
          <p>No conditions — field is always visible.</p>
          {allFields.length === 0 && <small>⚠️ Add other fields first to create conditions.</small>}
        </div>
      )}

      {conditions.map((c, idx) => (
        <div key={idx} className="condition-row">
          {idx > 0 && <div className="condition-logic-label">{conditionLogic.toUpperCase()}</div>}
          <div className="condition-inputs">
            <select value={c.fieldName} onChange={e => onUpdate(idx, { fieldName: e.target.value })}>
              <option value="">Select field...</option>
              {allFields.map(f => <option key={f.id} value={f.name}>{f.title} ({f.name})</option>)}
            </select>
            <select value={c.operator} onChange={e => onUpdate(idx, { operator: e.target.value as Condition['operator'] })}>
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
                onChange={e => onUpdate(idx, { value: e.target.value })}
                placeholder="Value..."
              />
            )}
            <button className="btn-delete-small" onClick={() => onDelete(idx)}>×</button>
          </div>
        </div>
      ))}

      {allFields.length > 0 && (
        <button className="btn-add-condition" onClick={onAdd}>+ Add Condition</button>
      )}

      {/* Shows the raw SurveyJS visibleIf expression for debugging */}
      {conditions.length > 0 && (
        <div className="condition-preview">
          <strong>SurveyJS expression:</strong>
          <code>
            {conditions
              .filter(c => c.fieldName)
              .map(c => {
                if (c.operator === 'empty')     return `{${c.fieldName}} empty`;
                if (c.operator === 'notEmpty')  return `{${c.fieldName}} notempty`;
                if (c.operator === 'equals')    return `{${c.fieldName}} = '${c.value}'`;
                if (c.operator === 'notEquals') return `{${c.fieldName}} != '${c.value}'`;
                if (c.operator === 'contains')  return `{${c.fieldName}} contains '${c.value}'`;
                return '';
              })
              .join(` ${conditionLogic} `)}
          </code>
        </div>
      )}
    </div>
  );
}