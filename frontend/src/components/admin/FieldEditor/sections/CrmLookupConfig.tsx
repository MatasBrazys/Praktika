// src/components/admin/FieldEditor/sections/CrmLookupConfig.tsx
// CRM Lookup section — configure auto-fill field labels shown after a CRM ID match.

import type { FieldConfig } from '../../../../types/form-builder.types';

interface CrmLabels {
  name:     string;
  street:   string;
  postcode: string;
  state:    string;
}

interface Props {
  config:    FieldConfig;
  crmLabels: CrmLabels;
  onConfigChange: (updates: Partial<FieldConfig>) => void;
  onLabelsChange: (updates: Partial<CrmLabels>) => void;
}

export default function CrmLookupConfig({ config, crmLabels, onConfigChange, onLabelsChange }: Props) {
  return (
    <div className="crm-section">
      <h3>🔍 CRM Lookup — Auto-fill Fields</h3>
      <p>When a user enters a valid CRM ID, the fields below will be auto-populated and made read-only.</p>

      <div className="form-group">
        <label>Description / Help text</label>
        <input
          type="text"
          value={config.description || ''}
          onChange={e => onConfigChange({ description: e.target.value })}
          placeholder="e.g., Enter the client CRM ID to auto-fill details"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>CRM ID Placeholder</label>
          <input
            type="text"
            value={config.placeholder || ''}
            onChange={e => onConfigChange({ placeholder: e.target.value })}
            placeholder="e.g., CRM001"
          />
        </div>
      </div>

      <p className="crm-labels-title">Auto-fill field labels:</p>
      <div className="form-row">
        <div className="form-group">
          <label>Name label</label>
          <input type="text" value={crmLabels.name}     onChange={e => onLabelsChange({ name:     e.target.value })} />
        </div>
        <div className="form-group">
          <label>Street label</label>
          <input type="text" value={crmLabels.street}   onChange={e => onLabelsChange({ street:   e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Postcode label</label>
          <input type="text" value={crmLabels.postcode} onChange={e => onLabelsChange({ postcode: e.target.value })} />
        </div>
        <div className="form-group">
          <label>City / State label</label>
          <input type="text" value={crmLabels.state}    onChange={e => onLabelsChange({ state:    e.target.value })} />
        </div>
      </div>

      {/* Shows what field names SurveyJS will generate based on the CRM ID field name */}
      <div className="crm-field-names">
        <strong>Generated field names (auto):</strong>
        <ul>
          <li><code>{config.name || 'crm_id'}</code> — CRM ID input</li>
          <li><code>{config.name || 'crm_id'}_name</code> — {crmLabels.name}</li>
          <li><code>{config.name || 'crm_id'}_street</code> — {crmLabels.street}</li>
          <li><code>{config.name || 'crm_id'}_postcode</code> — {crmLabels.postcode}</li>
          <li><code>{config.name || 'crm_id'}_state</code> — {crmLabels.state}</li>
        </ul>
      </div>
    </div>
  );
}