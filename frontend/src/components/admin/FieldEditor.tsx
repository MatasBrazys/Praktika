import { useState } from 'react';
import '../../styles/FieldEditor.css';

interface FieldConfig {
  id: string;
  name: string;
  title: string;
  type: string;
  isRequired: boolean;
  inputType?: string;
  choices?: string[];
}

interface Props {
  field: FieldConfig;
  onSave: (field: FieldConfig) => void;
  onCancel: () => void;
}

export default function FieldEditor({ field, onSave, onCancel }: Props) {
  const [config, setConfig] = useState<FieldConfig>(field);
  const [choicesText, setChoicesText] = useState(
    field.choices?.join('\n') || ''
  );

  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radiogroup', label: 'Radio Group' },
    { value: 'boolean', label: 'Yes/No' },
    { value: 'comment', label: 'Text Area' },
  ];

  const handleSave = () => {
    if (!config.title.trim()) {
      alert('Please enter a field title');
      return;
    }

    const finalConfig = { ...config };
    
    // Parse choices for dropdown/radio
    if (['dropdown', 'radiogroup'].includes(config.type)) {
      finalConfig.choices = choicesText
        .split('\n')
        .map(c => c.trim())
        .filter(c => c.length > 0);
      
      if (finalConfig.choices.length === 0) {
        alert('Please add at least one choice');
        return;
      }
    } else {
      delete finalConfig.choices;
    }

    onSave(finalConfig);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Field Configuration</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Field Title *</label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              placeholder="e.g., First Name"
            />
          </div>

          <div className="form-group">
            <label>Field Name (internal) *</label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              placeholder="e.g., firstName (no spaces)"
            />
            <small>Used for data storage (no spaces or special characters)</small>
          </div>

          <div className="form-group">
            <label>Field Type *</label>
            <select
              value={config.type}
              onChange={(e) => setConfig({ ...config, type: e.target.value })}
            >
              {fieldTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {config.type === 'text' && (
            <div className="form-group">
              <label>Input Type</label>
              <select
                value={config.inputType || 'text'}
                onChange={(e) => setConfig({ ...config, inputType: e.target.value })}
              >
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="tel">Phone</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
              </select>
            </div>
          )}

          {['dropdown', 'radiogroup'].includes(config.type) && (
            <div className="form-group">
              <label>Choices (one per line) *</label>
              <textarea
                value={choicesText}
                onChange={(e) => setChoicesText(e.target.value)}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                rows={5}
              />
            </div>
          )}

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={config.isRequired}
                onChange={(e) => setConfig({ ...config, isRequired: e.target.checked })}
              />
              Required field
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Save Field
          </button>
        </div>
      </div>
    </div>
  );
}