// src/components/admin/FieldEditor/tabs/ValidatorsTab.tsx
// Validators tab — add regex, numeric range, or text length validators to a field.

import type { Validator } from '../../../../types/form-builder.types';


interface Props {
  validators: Validator[];
  onAdd:       (type: Validator['type']) => void;
  onAddPreset: (key: string) => void;
  onUpdate:    (index: number, updates: Partial<Validator>) => void;
  onDelete:    (index: number) => void;
}

export default function ValidatorsTab({ validators, onAdd, onAddPreset, onUpdate, onDelete }: Props) {
  return (
    <div className="validators-section">
      {validators.length === 0 && (
        <div className="empty-validators">
          <p>Click a pattern below to add validation:</p>
          <div className="validator-examples">
            <strong>Network &amp; Infrastructure:</strong>
            {['ipv4', 'cidr', 'mac'].map(k => (
              <code key={k} onClick={() => onAddPreset(k)}>{k.charAt(0).toUpperCase() + k.slice(1)}</code>
            ))}
          </div>
          <div className="validator-examples">
            <strong>Contact &amp; Business:</strong>
            <code onClick={() => onAddPreset('email')}>Email Address</code>
            <code onClick={() => onAddPreset('phone')}>Phone Number</code>
            <code onClick={() => onAddPreset('abbrev3')}>3-Letter Code (ABC)</code>
          </div>
          <div className="validator-manual">
            <p>Or create custom validator:</p>
            <div className="validator-add-row">
              <button className="btn-add-small" onClick={() => onAdd('regex')}>+ Custom Regex</button>
              <button className="btn-add-small" onClick={() => onAdd('numeric')}>+ Numeric Range</button>
              <button className="btn-add-small" onClick={() => onAdd('text')}>+ Text Length</button>
            </div>
          </div>
        </div>
      )}

      {validators.map((v, idx) => (
        <div key={v._id ?? idx} className="validator-item">
          <div className="validator-header">
            <span className="validator-type-label">
              {v.type === 'regex'   && '🔤 Regex'}
              {v.type === 'numeric' && '🔢 Numeric Range'}
              {v.type === 'text'    && '📏 Text Length'}
            </span>
            <button className="btn-delete-small" onClick={() => onDelete(idx)}>×</button>
          </div>

          <div className="form-group">
            <label>Error Message</label>
            <input
              type="text"
              value={v.text}
              onChange={e => onUpdate(idx, { text: e.target.value })}
              placeholder="Shown when validation fails"
            />
          </div>

          {v.type === 'regex' && (
            <div className="form-group">
              <label>Regex Pattern</label>
              <input
                type="text"
                value={v.regex || ''}
                onChange={e => onUpdate(idx, { regex: e.target.value })}
                placeholder="e.g., ^[A-Z]{3}$"
                className="code-input"
              />
            </div>
          )}

          {v.type === 'numeric' && (
            <div className="form-row">
              <div className="form-group">
                <label>Min Value</label>
                <input type="number" value={v.minValue ?? 0}   onChange={e => onUpdate(idx, { minValue: parseFloat(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>Max Value</label>
                <input type="number" value={v.maxValue ?? 100} onChange={e => onUpdate(idx, { maxValue: parseFloat(e.target.value) })} />
              </div>
            </div>
          )}

          {v.type === 'text' && (
            <div className="form-row">
              <div className="form-group">
                <label>Min Length</label>
                <input type="number" value={v.minLength ?? 1}   onChange={e => onUpdate(idx, { minLength: parseInt(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>Max Length</label>
                <input type="number" value={v.maxLength ?? 100} onChange={e => onUpdate(idx, { maxLength: parseInt(e.target.value) })} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}