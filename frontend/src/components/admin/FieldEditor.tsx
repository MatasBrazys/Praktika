// frontend/src/components/admin/FieldEditor.tsx
import { useState, useEffect } from 'react';
import type { FieldConfig } from '../../pages/admin/FormBuilderPage';
import '../../styles/FieldEditor.css';

interface Validator {
  type: 'regex' | 'numeric' | 'text';
  text: string;
  regex?: string;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
}

interface Condition {
  fieldName: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notEmpty' | 'empty';
  value: string;
}

interface Props {
  field: FieldConfig;
  allFields: FieldConfig[];
  onSave: (field: FieldConfig) => void;
  onCancel: () => void;
}

type Tab = 'basic' | 'validators' | 'conditions';

// ═══ VALIDATOR PRESETS ═══
const VALIDATOR_PRESETS: Record<string, { regex: string; text: string }> = {
  ipv4: {
    regex: '^(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)$',
    text: 'Enter valid IPv4 (e.g., 192.168.1.1)'
  },
  cidr: {
    regex: '^(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)/(?:[0-9]|[12]\\d|3[0-2])$',
    text: 'Enter valid CIDR (e.g., 10.0.0.0/24)'
  },
  mac: {
    regex: '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$',
    text: 'Enter valid MAC (e.g., AA:BB:CC:DD:EE:FF)'
  },
  email: {
    regex: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    text: 'Enter valid email address'
  },
  phone: {
    regex: '^\\+?[1-9]\\d{1,14}$',
    text: 'Enter phone with country code (e.g., +37061234567)'
  },
  url: {
    regex: '^https?://[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/.*)?$',
    text: 'Enter valid URL (http:// or https://)'
  },
  number: {
    regex: '^-?\\d+(\\.\\d+)?$',
    text: 'Enter valid number (e.g., 42 or 3.14)'
  },
  date: {
    regex: '^\\d{4}-\\d{2}-\\d{2}$',
    text: 'Enter date in YYYY-MM-DD format'
  },
  abbrev3: {
    regex: '^[A-Z]{3}$',
    text: 'Enter exactly 3 capital letters (e.g., ABC)'
  },
  hostname: {
    regex: '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$',
    text: 'Enter valid hostname or FQDN'
  },
};

export default function FieldEditor({ field, allFields, onSave, onCancel }: Props) {
  const [config, setConfig] = useState<FieldConfig>(field);
  const [choicesText, setChoicesText] = useState(field.choices?.join('\n') || '');
  const [templateChoicesText, setTemplateChoicesText] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [validators, setValidators] = useState<Validator[]>(field.validators || []);
  const [conditions, setConditions] = useState<Condition[]>(field.conditions || []);
  const [conditionLogic, setConditionLogic] = useState<'and' | 'or'>(field.conditionLogic || 'and');
  const [templateFields, setTemplateFields] = useState<FieldConfig[]>(field.templateElements || []);
  const [expandedTemplateField, setExpandedTemplateField] = useState<number | null>(null);
  const [expandedTemplateConditions, setExpandedTemplateConditions] = useState<number | null>(null);

  // ═══ AUTO-ADD VALIDATORS WHEN INPUT TYPE CHANGES ═══
  useEffect(() => {
    const autoPresetRegexes = Object.values(VALIDATOR_PRESETS).map(p => p.regex);

    if (config.type === 'text' && config.inputType) {
      const inputType = config.inputType;
      const needsValidator = ['email', 'phone', 'ipv4', 'cidr', 'mac', 'url', 'hostname', 'number', 'date'].includes(inputType);

      if (needsValidator && VALIDATOR_PRESETS[inputType]) {
        const preset = VALIDATOR_PRESETS[inputType];
        const manualValidators = validators.filter(v =>
          v.type !== 'regex' || !autoPresetRegexes.includes(v.regex || '')
        );
        setValidators([...manualValidators, { type: 'regex', ...preset }]);
      } else {
        setValidators(prev => prev.filter(v =>
          v.type !== 'regex' || !autoPresetRegexes.includes(v.regex || '')
        ));
      }
    } else if (config.type !== 'text') {
      setValidators(prev => prev.filter(v =>
        v.type !== 'regex' || !autoPresetRegexes.includes(v.regex || '')
      ));
    }
  }, [config.inputType, config.type]);

  // ═══ FIELD TYPES ═══
  const fieldTypes = [
    { value: 'text', label: '📝 Text Input' },
    { value: 'comment', label: '📄 Text Area' },
    { value: 'dropdown', label: '🔽 Dropdown' },
    { value: 'radiogroup', label: '◉ Radio Buttons' },
    { value: 'checkbox', label: '☑️ Checkboxes' },
    { value: 'boolean', label: '✓ Yes/No' },
    { value: 'paneldynamic', label: '🔁 Repeated Group' },
  ];

  // ═══ TEXT INPUT TYPES ═══
  const textInputTypes = [
    { value: 'text', label: 'Plain Text' },
    { value: 'email', label: '📧 Email Address' },
    { value: 'phone', label: '📞 Phone Number' },
    { value: 'ipv4', label: '🌐 IPv4 Address' },
    { value: 'cidr', label: '🔗 CIDR Subnet' },
    { value: 'mac', label: '🔌 MAC Address' },
    { value: 'url', label: '🔗 URL' },
    { value: 'number', label: '🔢 Number' },
    { value: 'date', label: '📅 Date' },
  ];

  // ═══ TEMPLATE FIELDS ═══
  const addTemplateField = () => {
    const newField: FieldConfig = {
      id: `template_${Date.now()}`,
      name: `field_${templateFields.length + 1}`,
      title: 'New Field',
      type: 'text',
      isRequired: false,
    };
    setTemplateFields(prev => [...prev, newField]);
  };

  const updateTemplateField = (index: number, updates: Partial<FieldConfig>) => {
    setTemplateFields(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const deleteTemplateField = (index: number) => {
    setTemplateFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleTemplateInputTypeChange = (templateIdx: number, inputType: string) => {
    updateTemplateField(templateIdx, { inputType });

    const needsValidator = ['email', 'phone', 'ipv4', 'cidr', 'mac', 'url', 'hostname', 'number', 'date'].includes(inputType);

    if (needsValidator && VALIDATOR_PRESETS[inputType]) {
      const tf = templateFields[templateIdx];
      const preset = VALIDATOR_PRESETS[inputType];
      const autoPresetRegexes = Object.values(VALIDATOR_PRESETS).map(p => p.regex);

      const manualValidators = (tf.validators || []).filter(v =>
        v.type !== 'regex' || !autoPresetRegexes.includes(v.regex || '')
      );

      updateTemplateField(templateIdx, {
        validators: [...manualValidators, { type: 'regex', ...preset }]
      });
    } else if (inputType === 'text') {
      const tf = templateFields[templateIdx];
      const autoPresetRegexes = Object.values(VALIDATOR_PRESETS).map(p => p.regex);
      const manualValidators = (tf.validators || []).filter(v =>
        v.type !== 'regex' || !autoPresetRegexes.includes(v.regex || '')
      );
      updateTemplateField(templateIdx, { validators: manualValidators });
    }
  };

  const handleTemplateTypeChange = (templateIdx: number, newType: string) => {
    const tf = templateFields[templateIdx];
    const autoPresetRegexes = Object.values(VALIDATOR_PRESETS).map(p => p.regex);

    if (newType !== 'text') {
      const manualValidators = (tf.validators || []).filter(v =>
        v.type !== 'regex' || !autoPresetRegexes.includes(v.regex || '')
      );
      updateTemplateField(templateIdx, {
        type: newType,
        inputType: undefined,
        validators: manualValidators
      });
    } else {
      updateTemplateField(templateIdx, { type: newType });
    }
  };

  // ═══ TEMPLATE VALIDATORS ═══
  const addTemplateValidator = (templateIdx: number, presetKey?: string) => {
    const tf = templateFields[templateIdx];

    if (presetKey && VALIDATOR_PRESETS[presetKey]) {
      const preset = VALIDATOR_PRESETS[presetKey];
      updateTemplateField(templateIdx, {
        validators: [...(tf.validators || []), { type: 'regex', ...preset }]
      });
    } else {
      updateTemplateField(templateIdx, {
        validators: [...(tf.validators || []), { type: 'regex', text: 'Invalid format', regex: '' }]
      });
    }
  };

  const updateTemplateValidator = (templateIdx: number, validatorIdx: number, updates: Partial<Validator>) => {
    const tf = templateFields[templateIdx];
    const updatedValidators = (tf.validators || []).map((v, i) =>
      i === validatorIdx ? { ...v, ...updates } : v
    );
    updateTemplateField(templateIdx, { validators: updatedValidators });
  };

  const deleteTemplateValidator = (templateIdx: number, validatorIdx: number) => {
    const tf = templateFields[templateIdx];
    const updatedValidators = (tf.validators || []).filter((_, i) => i !== validatorIdx);
    updateTemplateField(templateIdx, { validators: updatedValidators });
  };

  // ═══ TEMPLATE CONDITIONS ═══
  const addTemplateCondition = (templateIdx: number) => {
    const tf = templateFields[templateIdx];
    const otherFields = templateFields.filter((_, i) => i !== templateIdx);

    if (otherFields.length === 0) {
      alert('Add more fields first to create conditions');
      return;
    }

    updateTemplateField(templateIdx, {
      conditions: [
        ...(tf.conditions || []),
        { fieldName: otherFields[0].name, operator: 'equals', value: '' }
      ]
    });
  };

  const updateTemplateCondition = (templateIdx: number, condIdx: number, updates: Partial<Condition>) => {
    const tf = templateFields[templateIdx];
    const updatedConditions = (tf.conditions || []).map((c, i) =>
      i === condIdx ? { ...c, ...updates } : c
    );
    updateTemplateField(templateIdx, { conditions: updatedConditions });
  };

  const deleteTemplateCondition = (templateIdx: number, condIdx: number) => {
    const tf = templateFields[templateIdx];
    const updatedConditions = (tf.conditions || []).filter((_, i) => i !== condIdx);
    updateTemplateField(templateIdx, { conditions: updatedConditions });
  };

  const updateTemplateConditionLogic = (templateIdx: number, logic: 'and' | 'or') => {
    updateTemplateField(templateIdx, { conditionLogic: logic });
  };

  // ═══ VALIDATORS ═══
  const addValidatorPreset = (presetKey: string) => {
    const preset = VALIDATOR_PRESETS[presetKey];
    if (!preset) return;
    setValidators(prev => [...prev, { type: 'regex', ...preset }]);
  };

  const addValidator = (type: Validator['type']) => {
    const defaults: Record<string, Validator> = {
      regex: { type: 'regex', text: 'Invalid format', regex: '' },
      numeric: { type: 'numeric', text: 'Invalid number', minValue: 0, maxValue: 100 },
      text: { type: 'text', text: 'Invalid length', minLength: 1, maxLength: 100 },
    };
    setValidators(prev => [...prev, defaults[type]]);
  };

  const updateValidator = (index: number, updates: Partial<Validator>) => {
    setValidators(prev => prev.map((v, i) => i === index ? { ...v, ...updates } : v));
  };

  const deleteValidator = (index: number) => {
    setValidators(prev => prev.filter((_, i) => i !== index));
  };

  // ═══ CONDITIONS ═══
  const addCondition = () => {
    setConditions(prev => [...prev, {
      fieldName: allFields[0]?.name || '',
      operator: 'equals',
      value: '',
    }]);
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    setConditions(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const deleteCondition = (index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  // ═══ SAVE ═══
  const handleSave = () => {
    if (!config.title.trim()) { alert('Please enter a field title'); return; }

    const finalConfig: FieldConfig = { ...config };

    if (['dropdown', 'radiogroup', 'checkbox'].includes(config.type)) {
      finalConfig.choices = choicesText.split('\n').map(c => c.trim()).filter(Boolean);
      if (!finalConfig.choices.length) { alert('Please add at least one choice'); return; }
    } else {
      delete finalConfig.choices;
    }

    if (config.type === 'paneldynamic') {
      finalConfig.templateElements = templateFields;
    }

    finalConfig.validators = validators.filter(v =>
      v.type !== 'regex' || (v.regex && v.regex.trim())
    );

    finalConfig.conditions = conditions.filter(c => c.fieldName);
    finalConfig.conditionLogic = conditionLogic;

    onSave(finalConfig);
  };

  // ═══ HELPERS ═══
  const needsChoices = ['dropdown', 'radiogroup', 'checkbox'].includes(config.type);
  const showPlaceholder = config.type === 'text' || config.type === 'comment';
  const showDefaultValue = config.type === 'text' || config.type === 'comment';

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <h2>Field Configuration</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        {/* TABS */}
        <div className="modal-tabs">
          {(['basic', 'validators', 'conditions'] as Tab[]).map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'basic' && '⚙️ Basic'}
              {tab === 'validators' && `✓ Validators ${validators.length ? `(${validators.length})` : ''}`}
              {tab === 'conditions' && `⚡ Conditions ${conditions.length ? `(${conditions.length})` : ''}`}
            </button>
          ))}
        </div>

        <div className="modal-body">

          {/* ══════════════════════════════════════
              BASIC TAB
          ══════════════════════════════════════ */}
          {activeTab === 'basic' && (
            <>
              {/* Title & Name */}
              <div className="form-row">
                <div className="form-group">
                  <label>Field Title *</label>
                  <input
                    type="text"
                    value={config.title}
                    onChange={e => setConfig({ ...config, title: e.target.value })}
                    placeholder="e.g., Customer Name"
                  />
                </div>
                <div className="form-group">
                  <label>Field Name (internal) *</label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={e => setConfig({ ...config, name: e.target.value })}
                    placeholder="e.g., customerName"
                  />
                  <small>No spaces or special characters</small>
                </div>
              </div>

              {/* Field Type */}
              <div className="form-group">
                <label>Field Type *</label>
                <select
                  value={config.type}
                  onChange={e => setConfig({ ...config, type: e.target.value })}
                >
                  {fieldTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Text Input Type */}
              {config.type === 'text' && (
                <div className="form-group">
                  <label>Input Type</label>
                  <select
                    value={config.inputType || 'text'}
                    onChange={e => setConfig({ ...config, inputType: e.target.value })}
                  >
                    {textInputTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <small>Select specialized input type for validation</small>
                </div>
              )}

              {/* Description */}
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={config.description || ''}
                  onChange={e => setConfig({ ...config, description: e.target.value })}
                  placeholder="Help text shown below the field"
                />
              </div>

              {/* Placeholder & Default */}
              {showPlaceholder && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Placeholder</label>
                    <input
                      type="text"
                      value={config.placeholder || ''}
                      onChange={e => setConfig({ ...config, placeholder: e.target.value })}
                      placeholder="e.g., Enter value..."
                    />
                  </div>
                  {showDefaultValue && (
                    <div className="form-group">
                      <label>Default Value</label>
                      <input
                        type="text"
                        value={config.defaultValue || ''}
                        onChange={e => setConfig({ ...config, defaultValue: e.target.value })}
                        placeholder="Pre-filled value"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Choices */}
              {needsChoices && (
                <div className="form-group">
                  <label>Choices (one per line) *</label>
                  <textarea
                    value={choicesText}
                    onChange={e => setChoicesText(e.target.value)}
                    placeholder="Type each option on a new line"
                    rows={5}
                  />
                </div>
              )}

              {/* Paneldynamic Template */}
              {config.type === 'paneldynamic' && (
                <div className="template-section">
                  <div className="section-header">
                    <h3>🔁 Repeatable Group Fields</h3>
                    <button className="btn-add-small" onClick={addTemplateField}>+ Add Field</button>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Add Button Text</label>
                      <input
                        type="text"
                        value={config.addPanelText || 'Add'}
                        onChange={e => setConfig({ ...config, addPanelText: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Remove Button Text</label>
                      <input
                        type="text"
                        value={config.removePanelText || 'Remove'}
                        onChange={e => setConfig({ ...config, removePanelText: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Min Panels</label>
                      <input
                        type="number"
                        value={config.minPanelCount || 1}
                        min={1}
                        onChange={e => setConfig({ ...config, minPanelCount: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  {templateFields.length === 0 && (
                    <div className="empty-template">
                      <p>Add fields that will repeat in each panel</p>
                    </div>
                  )}

                  {templateFields.map((tf, idx) => (
                    <div key={tf.id} className="template-field-row">
                      {/* Main row */}
                      <div className="form-row">
                        <div className="form-group">
                          <label>Title</label>
                          <input
                            type="text"
                            value={tf.title}
                            onChange={e => updateTemplateField(idx, { title: e.target.value })}
                            placeholder="Field title"
                          />
                        </div>
                        <div className="form-group">
                          <label>Name</label>
                          <input
                            type="text"
                            value={tf.name}
                            onChange={e => updateTemplateField(idx, { name: e.target.value })}
                            placeholder="fieldName"
                          />
                        </div>
                        <div className="form-group">
                          <label>Type</label>
                          <select
                            value={tf.type}
                            onChange={e => handleTemplateTypeChange(idx, e.target.value)}
                          >
                            <option value="text">Text Input</option>
                            <option value="comment">Text Area</option>
                            <option value="dropdown">Dropdown</option>
                            <option value="radiogroup">Radio Buttons</option>
                            <option value="checkbox">Checkboxes</option>
                            <option value="boolean">Yes/No</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Default</label>
                          <input
                            type="text"
                            value={tf.defaultValue || ''}
                            onChange={e => updateTemplateField(idx, { defaultValue: e.target.value })}
                            placeholder="Default value"
                          />
                        </div>
                        <button
                          className="btn-delete-small"
                          onClick={() => deleteTemplateField(idx)}
                        >×</button>
                      </div>

                      {/* Input Type */}
                      {tf.type === 'text' && (
                        <div className="form-group">
                          <label>Input Type</label>
                          <select
                            value={tf.inputType || 'text'}
                            onChange={e => handleTemplateInputTypeChange(idx, e.target.value)}
                          >
                            {textInputTypes.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Choices (dropdown, radio, checkbox) */}
                      {(tf.type === 'dropdown' || tf.type === 'radiogroup' || tf.type === 'checkbox') && (
                        <div className="form-group">
                          <label>Choices (one per line)</label>
                          <textarea
                            value={templateChoicesText[idx] ?? tf.choices?.join('\n') ?? ''}
                            onChange={e => {
                              setTemplateChoicesText(prev => ({ ...prev, [idx]: e.target.value }));
                              updateTemplateField(idx, {
                                choices: e.target.value.split('\n').map(c => c.trim()).filter(Boolean)
                              });
                            }}
                            rows={3}
                            placeholder="Type each option on a new line"
                          />
                        </div>
                      )}

                      {/* Required */}
                      <div className="template-required-section">
                        <label className="template-checkbox-label">
                          <input
                            type="checkbox"
                            checked={tf.isRequired || false}
                            onChange={e => updateTemplateField(idx, { isRequired: e.target.checked })}
                          />
                          Required field
                        </label>
                      </div>

                      {/* Validators toggle */}
                      <div className="template-validators-section">
                        <button
                          className="btn-toggle-validators"
                          onClick={() => setExpandedTemplateField(expandedTemplateField === idx ? null : idx)}
                        >
                          {expandedTemplateField === idx ? '▼' : '▶'} Validators
                          {tf.validators?.length ? ` (${tf.validators.length})` : ''}
                        </button>

                        {expandedTemplateField === idx && (
                          <div className="template-validators-content">
                            <div className="validator-presets-compact">
                              <label>Quick add:</label>
                              <code onClick={() => addTemplateValidator(idx, 'ipv4')}>IPv4</code>
                              <code onClick={() => addTemplateValidator(idx, 'email')}>Email</code>
                              <code onClick={() => addTemplateValidator(idx, 'phone')}>Phone</code>
                              <code onClick={() => addTemplateValidator(idx, 'mac')}>MAC</code>
                              <code onClick={() => addTemplateValidator(idx, 'url')}>URL</code>
                              <button
                                className="btn-add-small"
                                onClick={() => addTemplateValidator(idx)}
                              >+ Custom Regex</button>
                            </div>

                            {(tf.validators || []).length === 0 && (
                              <p className="no-validators">No validators</p>
                            )}

                            {(tf.validators || []).map((v, vIdx) => (
                              <div key={vIdx} className="template-validator-item">
                                <div className="form-group">
                                  <label>Error Message</label>
                                  <input
                                    type="text"
                                    value={v.text}
                                    onChange={e => updateTemplateValidator(idx, vIdx, { text: e.target.value })}
                                    placeholder="Validation error message"
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Regex Pattern</label>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                      type="text"
                                      value={v.regex || ''}
                                      onChange={e => updateTemplateValidator(idx, vIdx, { regex: e.target.value })}
                                      placeholder="^pattern$"
                                      className="code-input"
                                      style={{ flex: 1 }}
                                    />
                                    <button
                                      className="btn-delete-small"
                                      onClick={() => deleteTemplateValidator(idx, vIdx)}
                                    >×</button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Conditions toggle */}
                      <div className="template-validators-section">
                        <button
                          className="btn-toggle-validators"
                          onClick={() => setExpandedTemplateConditions(expandedTemplateConditions === idx ? null : idx)}
                        >
                          {expandedTemplateConditions === idx ? '▼' : '▶'} Conditionals
                          {tf.conditions?.length ? ` (${tf.conditions.length})` : ''}
                        </button>

                        {expandedTemplateConditions === idx && (
                          <div className="template-validators-content">
                            <div className="conditions-info-compact">
                              <p>This field will be <strong>hidden</strong> until conditions are met.</p>
                            </div>

                            {(tf.conditions || []).length > 1 && (
                              <div className="logic-toggle-compact">
                                <span>Match:</span>
                                <button
                                  className={`logic-btn-small ${(tf.conditionLogic || 'and') === 'and' ? 'active' : ''}`}
                                  onClick={() => updateTemplateConditionLogic(idx, 'and')}
                                >AND</button>
                                <button
                                  className={`logic-btn-small ${(tf.conditionLogic || 'and') === 'or' ? 'active' : ''}`}
                                  onClick={() => updateTemplateConditionLogic(idx, 'or')}
                                >OR</button>
                              </div>
                            )}

                            {(tf.conditions || []).length === 0 && (
                              <p className="no-validators">No conditions - field is always visible</p>
                            )}

                            {(tf.conditions || []).map((c, cIdx) => {
                              const otherFields = templateFields.filter((_, i) => i !== idx);
                              return (
                                <div key={cIdx} className="template-condition-row">
                                  {cIdx > 0 && (
                                    <div className="condition-logic-label-small">
                                      {(tf.conditionLogic || 'and').toUpperCase()}
                                    </div>
                                  )}
                                  <div className="condition-inputs-compact">
                                    <select
                                      value={c.fieldName}
                                      onChange={e => updateTemplateCondition(idx, cIdx, { fieldName: e.target.value })}
                                    >
                                      <option value="">Select field...</option>
                                      {otherFields.map(f => (
                                        <option key={f.id} value={f.name}>{f.title}</option>
                                      ))}
                                    </select>

                                    <select
                                      value={c.operator}
                                      onChange={e => updateTemplateCondition(idx, cIdx, { operator: e.target.value as Condition['operator'] })}
                                    >
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
                                        onChange={e => updateTemplateCondition(idx, cIdx, { value: e.target.value })}
                                        placeholder="Value..."
                                        className="condition-value-input"
                                      />
                                    )}

                                    <button
                                      className="btn-delete-small"
                                      onClick={() => deleteTemplateCondition(idx, cIdx)}
                                    >×</button>
                                  </div>
                                </div>
                              );
                            })}

                            <button
                              className="btn-add-small"
                              onClick={() => addTemplateCondition(idx)}
                              style={{ marginTop: '8px', width: '100%' }}
                            >
                              + Add Condition
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Required checkbox */}
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.isRequired}
                    onChange={e => setConfig({ ...config, isRequired: e.target.checked })}
                  />
                  Required field
                </label>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════
              VALIDATORS TAB
          ══════════════════════════════════════ */}
          {activeTab === 'validators' && (
            <div className="validators-section">
              {validators.length === 0 && (
                <div className="empty-validators">
                  <p>Click a pattern below to add validation:</p>

                  <div className="validator-examples">
                    <strong>Network & Infrastructure:</strong>
                    <code onClick={() => addValidatorPreset('ipv4')}>IPv4 Address</code>
                    <code onClick={() => addValidatorPreset('cidr')}>CIDR Subnet</code>
                    <code onClick={() => addValidatorPreset('mac')}>MAC Address</code>
                    <code onClick={() => addValidatorPreset('hostname')}>Hostname/FQDN</code>
                  </div>

                  <div className="validator-examples">
                    <strong>Contact & Business:</strong>
                    <code onClick={() => addValidatorPreset('email')}>Email Address</code>
                    <code onClick={() => addValidatorPreset('phone')}>Phone Number</code>
                    <code onClick={() => addValidatorPreset('url')}>URL</code>
                    <code onClick={() => addValidatorPreset('abbrev3')}>3-Letter Code (ABC)</code>
                  </div>

                  <div className="validator-manual">
                    <p>Or create custom validator:</p>
                    <div className="validator-add-row">
                      <button className="btn-add-small" onClick={() => addValidator('regex')}>+ Custom Regex</button>
                      <button className="btn-add-small" onClick={() => addValidator('numeric')}>+ Numeric Range</button>
                      <button className="btn-add-small" onClick={() => addValidator('text')}>+ Text Length</button>
                    </div>
                  </div>
                </div>
              )}

              {validators.map((v, idx) => (
                <div key={idx} className="validator-item">
                  <div className="validator-header">
                    <span className="validator-type-label">
                      {v.type === 'regex' && '🔤 Regex'}
                      {v.type === 'numeric' && '🔢 Numeric Range'}
                      {v.type === 'text' && '📏 Text Length'}
                    </span>
                    <button className="btn-delete-small" onClick={() => deleteValidator(idx)}>×</button>
                  </div>

                  <div className="form-group">
                    <label>Error Message</label>
                    <input
                      type="text"
                      value={v.text}
                      onChange={e => updateValidator(idx, { text: e.target.value })}
                      placeholder="Shown when validation fails"
                    />
                  </div>

                  {v.type === 'regex' && (
                    <div className="form-group">
                      <label>Regex Pattern</label>
                      <input
                        type="text"
                        value={v.regex || ''}
                        onChange={e => updateValidator(idx, { regex: e.target.value })}
                        placeholder="e.g., ^[A-Z]{3}$"
                        className="code-input"
                      />
                    </div>
                  )}

                  {v.type === 'numeric' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Min Value</label>
                        <input type="number" value={v.minValue ?? 0}
                          onChange={e => updateValidator(idx, { minValue: parseFloat(e.target.value) })} />
                      </div>
                      <div className="form-group">
                        <label>Max Value</label>
                        <input type="number" value={v.maxValue ?? 100}
                          onChange={e => updateValidator(idx, { maxValue: parseFloat(e.target.value) })} />
                      </div>
                    </div>
                  )}

                  {v.type === 'text' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Min Length</label>
                        <input type="number" value={v.minLength ?? 1}
                          onChange={e => updateValidator(idx, { minLength: parseInt(e.target.value) })} />
                      </div>
                      <div className="form-group">
                        <label>Max Length</label>
                        <input type="number" value={v.maxLength ?? 100}
                          onChange={e => updateValidator(idx, { maxLength: parseInt(e.target.value) })} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ══════════════════════════════════════
              CONDITIONS TAB
          ══════════════════════════════════════ */}
          {activeTab === 'conditions' && (
            <div className="conditions-section">
              <div className="conditions-info">
                <p>This field will be <strong>hidden by default</strong> and shown only when conditions are met.</p>
              </div>

              {conditions.length > 1 && (
                <div className="logic-toggle">
                  <span>Match:</span>
                  <button
                    className={`logic-btn ${conditionLogic === 'and' ? 'active' : ''}`}
                    onClick={() => setConditionLogic('and')}
                  >ALL conditions (AND)</button>
                  <button
                    className={`logic-btn ${conditionLogic === 'or' ? 'active' : ''}`}
                    onClick={() => setConditionLogic('or')}
                  >ANY condition (OR)</button>
                </div>
              )}

              {conditions.length === 0 && (
                <div className="empty-conditions">
                  <p>No conditions - field is always visible.</p>
                  {allFields.length === 0 && (
                    <small>⚠️ Add other fields first to create conditions.</small>
                  )}
                </div>
              )}

              {conditions.map((c, idx) => (
                <div key={idx} className="condition-row">
                  {idx > 0 && (
                    <div className="condition-logic-label">
                      {conditionLogic.toUpperCase()}
                    </div>
                  )}
                  <div className="condition-inputs">
                    <select
                      value={c.fieldName}
                      onChange={e => updateCondition(idx, { fieldName: e.target.value })}
                    >
                      <option value="">Select field...</option>
                      {allFields.map(f => (
                        <option key={f.id} value={f.name}>{f.title} ({f.name})</option>
                      ))}
                    </select>

                    <select
                      value={c.operator}
                      onChange={e => updateCondition(idx, { operator: e.target.value as Condition['operator'] })}
                    >
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
                        onChange={e => updateCondition(idx, { value: e.target.value })}
                        placeholder="Value..."
                      />
                    )}

                    <button className="btn-delete-small" onClick={() => deleteCondition(idx)}>×</button>
                  </div>
                </div>
              ))}

              {allFields.length > 0 && (
                <button className="btn-add-condition" onClick={addCondition}>
                  + Add Condition
                </button>
              )}

              {conditions.length > 0 && (
                <div className="condition-preview">
                  <strong>SurveyJS expression:</strong>
                  <code>
                    {conditions.filter(c => c.fieldName).map(c => {
                      if (c.operator === 'empty') return `{${c.fieldName}} empty`;
                      if (c.operator === 'notEmpty') return `{${c.fieldName}} notempty`;
                      if (c.operator === 'equals') return `{${c.fieldName}} = '${c.value}'`;
                      if (c.operator === 'notEquals') return `{${c.fieldName}} != '${c.value}'`;
                      if (c.operator === 'contains') return `{${c.fieldName}} contains '${c.value}'`;
                      return '';
                    }).join(` ${conditionLogic} `)}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Field</button>
        </div>
      </div>
    </div>
  );
}