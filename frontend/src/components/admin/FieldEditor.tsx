// frontend/src/components/admin/FieldEditor.tsx
import { useState, useEffect } from 'react';
import type { FieldConfig, BulkImportField } from '../../pages/admin/FormBuilder';
import '../../styles/components/field-editor.css';
import '../../styles/components/modal.css';

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

const VALIDATOR_PRESETS: Record<string, { regex: string; text: string }> = {
  ipv4: { regex: '^(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)$', text: 'Enter valid IPv4 (e.g., 192.168.1.1)' },
  cidr: { regex: '^(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)/(?:[0-9]|[12]\\d|3[0-2])$', text: 'Enter valid CIDR (e.g., 10.0.0.0/24)' },
  mac: { regex: '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$', text: 'Enter valid MAC (e.g., AA:BB:CC:DD:EE:FF)' },
  email: { regex: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$', text: 'Enter valid email address' },
  phone: { regex: '^\\+?[1-9]\\d{1,14}$', text: 'Enter phone with country code (e.g., +37061234567)' },
  number: { regex: '^-?\\d+(\\.\\d+)?$', text: 'Enter valid number (e.g., 42 or 3.14)' },
  date: { regex: '^\\d{4}-\\d{2}-\\d{2}$', text: 'Enter date in YYYY-MM-DD format' },
  abbrev3: { regex: '^[A-Z]{3}$', text: 'Enter exactly 3 capital letters (e.g., ABC)' },
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
  const [allowBulkImport, setAllowBulkImport] = useState<boolean>((field as any).allowBulkImport || false);
  const [bulkImportFields, setBulkImportFields] = useState<BulkImportField[]>((field as any).bulkImportFields || []);
  const [crmLabels, setCrmLabels] = useState({
    name: field.crmFieldLabels?.name || 'Company Name',
    street: field.crmFieldLabels?.street || 'Street Address',
    postcode: field.crmFieldLabels?.postcode || 'Postcode',
    state: field.crmFieldLabels?.state || 'City / State',
  });
  const isCrmLookup = config.type === 'crmlookup';

  useEffect(() => {
    const autoPresetRegexes = Object.values(VALIDATOR_PRESETS).map(p => p.regex);
    if (config.type === 'text' && config.inputType) {
      const inputType = config.inputType;
      const needsValidator = ['email', 'phone', 'ipv4', 'cidr', 'mac', 'number', 'date'].includes(inputType);
      if (needsValidator && VALIDATOR_PRESETS[inputType]) {
        const preset = VALIDATOR_PRESETS[inputType];
        const manualValidators = validators.filter(v => v.type !== 'regex' || !autoPresetRegexes.includes(v.regex || ''));
        setValidators([...manualValidators, { type: 'regex', ...preset }]);
      } else {
        setValidators(prev => prev.filter(v => v.type !== 'regex' || !autoPresetRegexes.includes(v.regex || '')));
      }
    } else if (config.type !== 'text') {
      setValidators(prev => prev.filter(v => v.type !== 'regex' || !autoPresetRegexes.includes(v.regex || '')));
    }
  }, [config.inputType, config.type]);

  const fieldTypes = [
    { value: 'text', label: '📝 Text Input' },
    { value: 'comment', label: '📄 Text Area' },
    { value: 'dropdown', label: '🔽 Dropdown' },
    { value: 'radiogroup', label: '◉ Radio Buttons' },
    { value: 'checkbox', label: '☑️ Checkboxes' },
    { value: 'boolean', label: '✓ Yes/No' },
    { value: 'paneldynamic', label: '🔁 Repeated Group' },
    { value: 'crmlookup', label: '🔍 CRM Lookup' },
  ];

  const textInputTypes = [
    { value: 'text', label: 'Plain Text' },
    { value: 'email', label: '📧 Email Address' },
    { value: 'phone', label: '📞 Phone Number' },
    { value: 'ipv4', label: '🌐 IPv4 Address' },
    { value: 'cidr', label: '🔗 CIDR Subnet' },
    { value: 'mac', label: '🔌 MAC Address' },
    { value: 'number', label: '🔢 Number' },
    { value: 'date', label: '📅 Date' },
  ];

  const addTemplateField = () => {
    setTemplateFields(prev => [...prev, { id: `template_${Date.now()}`, name: `field_${templateFields.length + 1}`, title: 'New Field', type: 'text', isRequired: false }]);
  };
  const updateTemplateField = (index: number, updates: Partial<FieldConfig>) => {
    setTemplateFields(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  };
  const deleteTemplateField = (index: number) => setTemplateFields(prev => prev.filter((_, i) => i !== index));

  const handleTemplateInputTypeChange = (templateIdx: number, inputType: string) => {
    updateTemplateField(templateIdx, { inputType });
    const needsValidator = ['email', 'phone', 'ipv4', 'cidr', 'mac', 'number', 'date'].includes(inputType);
    const autoPresetRegexes = Object.values(VALIDATOR_PRESETS).map(p => p.regex);
    const tf = templateFields[templateIdx];
    const manualValidators = (tf.validators || []).filter(v => v.type !== 'regex' || !autoPresetRegexes.includes(v.regex || ''));
    if (needsValidator && VALIDATOR_PRESETS[inputType]) {
      updateTemplateField(templateIdx, { validators: [...manualValidators, { type: 'regex', ...VALIDATOR_PRESETS[inputType] }] });
    } else if (inputType === 'text') {
      updateTemplateField(templateIdx, { validators: manualValidators });
    }
  };

  const handleTemplateTypeChange = (templateIdx: number, newType: string) => {
    const tf = templateFields[templateIdx];
    const autoPresetRegexes = Object.values(VALIDATOR_PRESETS).map(p => p.regex);
    const manualValidators = (tf.validators || []).filter(v => v.type !== 'regex' || !autoPresetRegexes.includes(v.regex || ''));
    updateTemplateField(templateIdx, newType !== 'text'
      ? { type: newType, inputType: undefined, validators: manualValidators }
      : { type: newType }
    );
  };

  const addTemplateValidator = (templateIdx: number, presetKey?: string) => {
    const tf = templateFields[templateIdx];
    const newV = presetKey && VALIDATOR_PRESETS[presetKey]
      ? { type: 'regex' as const, ...VALIDATOR_PRESETS[presetKey] }
      : { type: 'regex' as const, text: 'Invalid format', regex: '' };
    updateTemplateField(templateIdx, { validators: [...(tf.validators || []), newV] });
  };
  const updateTemplateValidator = (ti: number, vi: number, updates: Partial<Validator>) => {
    const tf = templateFields[ti];
    updateTemplateField(ti, { validators: (tf.validators || []).map((v, i) => i === vi ? { ...v, ...updates } : v) });
  };
  const deleteTemplateValidator = (ti: number, vi: number) => {
    updateTemplateField(ti, { validators: (templateFields[ti].validators || []).filter((_, i) => i !== vi) });
  };

  const addTemplateCondition = (templateIdx: number) => {
    const otherFields = templateFields.filter((_, i) => i !== templateIdx);
    if (!otherFields.length) { alert('Add more fields first to create conditions'); return; }
    const tf = templateFields[templateIdx];
    updateTemplateField(templateIdx, { conditions: [...(tf.conditions || []), { fieldName: otherFields[0].name, operator: 'equals', value: '' }] });
  };
  const updateTemplateCondition = (ti: number, ci: number, updates: Partial<Condition>) => {
    const tf = templateFields[ti];
    updateTemplateField(ti, { conditions: (tf.conditions || []).map((c, i) => i === ci ? { ...c, ...updates } : c) });
  };
  const deleteTemplateCondition = (ti: number, ci: number) => {
    updateTemplateField(ti, { conditions: (templateFields[ti].conditions || []).filter((_, i) => i !== ci) });
  };
  const updateTemplateConditionLogic = (ti: number, logic: 'and' | 'or') => updateTemplateField(ti, { conditionLogic: logic });

  const addValidatorPreset = (key: string) => {
    if (VALIDATOR_PRESETS[key]) setValidators(prev => [...prev, { type: 'regex', ...VALIDATOR_PRESETS[key] }]);
  };
  const addValidator = (type: Validator['type']) => {
    const defaults: Record<string, Validator> = {
      regex: { type: 'regex', text: 'Invalid format', regex: '' },
      numeric: { type: 'numeric', text: 'Invalid number', minValue: 0, maxValue: 100 },
      text: { type: 'text', text: 'Invalid length', minLength: 1, maxLength: 100 },
    };
    setValidators(prev => [...prev, defaults[type]]);
  };
  const updateValidator = (i: number, updates: Partial<Validator>) => setValidators(prev => prev.map((v, idx) => idx === i ? { ...v, ...updates } : v));
  const deleteValidator = (i: number) => setValidators(prev => prev.filter((_, idx) => idx !== i));

  const addCondition = () => setConditions(prev => [...prev, { fieldName: allFields[0]?.name || '', operator: 'equals', value: '' }]);
  const updateCondition = (i: number, updates: Partial<Condition>) => setConditions(prev => prev.map((c, idx) => idx === i ? { ...c, ...updates } : c));
  const deleteCondition = (i: number) => setConditions(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!config.title.trim()) { alert('Please enter a field title'); return; }
    const finalConfig: FieldConfig = { ...config };
    if (isCrmLookup) {
      finalConfig.crmFieldLabels = { ...crmLabels };
      delete finalConfig.choices;
      onSave(finalConfig);
      return;
    }
    if (['dropdown', 'radiogroup', 'checkbox'].includes(config.type)) {
      finalConfig.choices = choicesText.split('\n').map(c => c.trim()).filter(Boolean);
      if (!finalConfig.choices.length) { alert('Please add at least one choice'); return; }
    } else {
      delete finalConfig.choices;
    }
    if (config.type === 'paneldynamic') {
      finalConfig.templateElements = templateFields;
      (finalConfig as any).allowBulkImport = allowBulkImport;
      (finalConfig as any).bulkImportFields = allowBulkImport ? bulkImportFields : [];
    }
    finalConfig.validators = validators.filter(v => v.type !== 'regex' || (v.regex && v.regex.trim()));
    finalConfig.conditions = conditions.filter(c => c.fieldName);
    finalConfig.conditionLogic = conditionLogic;
    onSave(finalConfig);
  };

  const needsChoices = ['dropdown', 'radiogroup', 'checkbox'].includes(config.type);
  const showPlaceholder = config.type === 'text' || config.type === 'comment';
  const showDefaultValue = showPlaceholder;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <h2>Field Configuration</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <div className="modal-tabs">
          {(['basic', 'validators', 'conditions'] as Tab[]).map(tab => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'basic' && '⚙️ Basic'}
              {tab === 'validators' && `✓ Validators ${validators.length ? `(${validators.length})` : ''}`}
              {tab === 'conditions' && ` Conditions ${conditions.length ? `(${conditions.length})` : ''}`}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {/* Basic tab----------------------------------------------- */}
          {activeTab === 'basic' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Field Title *</label>
                  <input type="text" value={config.title} onChange={e => setConfig({ ...config, title: e.target.value })} placeholder="e.g., Customer Name" />
                </div>
                <div className="form-group">
                  <label>Field Name (internal) *</label>
                  <input type="text" value={config.name} onChange={e => setConfig({ ...config, name: e.target.value })} placeholder="e.g., customerName" />
                  <small>No spaces or special characters</small>
                </div>
              </div>

              <div className="form-group">
                <label>Field Type *</label>
                <select value={config.type} onChange={e => setConfig({ ...config, type: e.target.value })}>
                  {fieldTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {config.type === 'text' && (
                <div className="form-group">
                  <label>Input Type</label>
                  <select value={config.inputType || 'text'} onChange={e => setConfig({ ...config, inputType: e.target.value })}>
                    {textInputTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <small>Select specialized input type for validation</small>
                </div>
              )}

              <div className="form-group">
                <label>Description</label>
                <input type="text" value={config.description || ''} onChange={e => setConfig({ ...config, description: e.target.value })} placeholder="Help text shown below the field" />
              </div>

              {showPlaceholder && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Placeholder</label>
                    <input type="text" value={config.placeholder || ''} onChange={e => setConfig({ ...config, placeholder: e.target.value })} placeholder="e.g., Enter value..." />
                  </div>
                  {showDefaultValue && (
                    <div className="form-group">
                      <label>Default Value</label>
                      <input type="text" value={config.defaultValue || ''} onChange={e => setConfig({ ...config, defaultValue: e.target.value })} placeholder="Pre-filled value" />
                    </div>
                  )}
                </div>
              )}

              {needsChoices && (
                <div className="form-group">
                  <label>Choices (one per line) *</label>
                  <textarea value={choicesText} onChange={e => setChoicesText(e.target.value)} placeholder="Type each option on a new line" rows={5} />
                </div>
              )}

              {config.type === 'paneldynamic' && (
                <div className="template-section">
                  <div className="section-header">
                    <h3>🔁 Repeatable Group Fields</h3>
                    <button className="btn-add-small" onClick={addTemplateField}>+ Add Field</button>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Add Button Text</label>
                      <input type="text" value={config.addPanelText || 'Add'} onChange={e => setConfig({ ...config, addPanelText: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Remove Button Text</label>
                      <input type="text" value={config.removePanelText || 'Remove'} onChange={e => setConfig({ ...config, removePanelText: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Min Panels</label>
                      <input type="number" value={config.minPanelCount || 1} min={1} onChange={e => setConfig({ ...config, minPanelCount: parseInt(e.target.value) })} />
                    </div>
                  </div>

                  {templateFields.length === 0 && <div className="empty-template"><p>Add fields that will repeat in each panel</p></div>}

                  {templateFields.map((tf, idx) => (
                    <div key={tf.id} className="template-field-row">
                      <div className="header-section">
                        <button className="btn-delete-small" onClick={() => deleteTemplateField(idx)}>×</button>
                      </div>

                      <div className="form-row three-cols">
                        <div className="form-group">
                          <label>Title</label>
                          <input type="text" value={tf.title} onChange={e => updateTemplateField(idx, { title: e.target.value })} placeholder="Field title" />
                        </div>
                        <div className="form-group">
                          <label>Name</label>
                          <input type="text" value={tf.name} onChange={e => updateTemplateField(idx, { name: e.target.value })} placeholder="fieldName" />
                        </div>
                        <div className="form-group">
                          <label>Type</label>
                          <select value={tf.type} onChange={e => handleTemplateTypeChange(idx, e.target.value)}>
                            <option value="text">Text Input</option>
                            <option value="comment">Text Area</option>
                            <option value="dropdown">Dropdown</option>
                            <option value="radiogroup">Radio Buttons</option>
                            <option value="checkbox">Checkboxes</option>
                            <option value="boolean">Yes/No</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Default</label>
                          <input type="text" value={tf.defaultValue || ''} onChange={e => updateTemplateField(idx, { defaultValue: e.target.value })} placeholder="Default value" />
                        </div>
                        <div className="form-group">
                          <label>Placeholder</label>
                          <input type="text" value={tf.placeholder || ''} onChange={e => updateTemplateField(idx, { placeholder: e.target.value })} placeholder="e.g. Enter value..." />
                        </div>
                      </div>

                      {tf.type === 'text' && (
                        <div className="form-group">
                          <label>Input Type</label>
                          <select value={tf.inputType || 'text'} onChange={e => handleTemplateInputTypeChange(idx, e.target.value)}>
                            {textInputTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                      )}

                      {['dropdown', 'radiogroup', 'checkbox'].includes(tf.type) && (
                        <div className="form-group">
                          <label>Choices (one per line)</label>
                          <textarea
                            value={templateChoicesText[idx] ?? tf.choices?.join('\n') ?? ''}
                            onChange={e => {
                              setTemplateChoicesText(prev => ({ ...prev, [idx]: e.target.value }));
                              updateTemplateField(idx, { choices: e.target.value.split('\n').map(c => c.trim()).filter(Boolean) });
                            }}
                            rows={3}
                            placeholder="Type each option on a new line"
                          />
                        </div>
                      )}

                      <div className="template-required-section">
                        <label className="template-checkbox-label">
                          <input type="checkbox" checked={tf.isRequired || false} onChange={e => updateTemplateField(idx, { isRequired: e.target.checked })} />
                          Required field
                        </label>
                      </div>

                      <div className="template-validators-section">
                        <button className="btn-toggle-validators" onClick={() => setExpandedTemplateField(expandedTemplateField === idx ? null : idx)}>
                          {expandedTemplateField === idx ? '▼' : '▶'} Validators{tf.validators?.length ? ` (${tf.validators.length})` : ''}
                        </button>
                        {expandedTemplateField === idx && (
                          <div className="template-validators-content">
                            <div className="validator-presets-compact">
                              <label>Quick add:</label>
                              {['ipv4', 'email', 'phone', 'mac'].map(key => (
                                <code key={key} onClick={() => addTemplateValidator(idx, key)}>{key.toUpperCase()}</code>
                              ))}
                              <button className="btn-add-small" onClick={() => addTemplateValidator(idx)}>+ Custom Regex</button>
                            </div>
                            {!(tf.validators || []).length && <p className="no-validators">No validators</p>}
                            {(tf.validators || []).map((v, vIdx) => (
                              <div key={vIdx} className="template-validator-item">
                                <div className="form-group">
                                  <label>Error Message</label>
                                  <input type="text" value={v.text} onChange={e => updateTemplateValidator(idx, vIdx, { text: e.target.value })} />
                                </div>
                                <div className="form-group">
                                  <label>Regex Pattern</label>
                                  <div className="validator-regex-row">
                                    <input type="text" value={v.regex || ''} onChange={e => updateTemplateValidator(idx, vIdx, { regex: e.target.value })} className="code-input" />
                                    <button className="btn-delete-small" onClick={() => deleteTemplateValidator(idx, vIdx)}>×</button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="template-validators-section">
                        <button className="btn-toggle-validators" onClick={() => setExpandedTemplateConditions(expandedTemplateConditions === idx ? null : idx)}>
                          {expandedTemplateConditions === idx ? '▼' : '▶'} Conditionals{tf.conditions?.length ? ` (${tf.conditions.length})` : ''}
                        </button>
                        {expandedTemplateConditions === idx && (
                          <div className="template-validators-content">
                            <div className="conditions-info-compact"><p>This field will be <strong>hidden</strong> until conditions are met.</p></div>
                            {(tf.conditions || []).length > 1 && (
                              <div className="logic-toggle-compact">
                                <span>Match:</span>
                                {(['and', 'or'] as const).map(l => (
                                  <button key={l} className={`logic-btn-small ${(tf.conditionLogic || 'and') === l ? 'active' : ''}`} onClick={() => updateTemplateConditionLogic(idx, l)}>{l.toUpperCase()}</button>
                                ))}
                              </div>
                            )}
                            {!(tf.conditions || []).length && <p className="no-validators">No conditions - field is always visible</p>}
                            {(tf.conditions || []).map((c, cIdx) => {
                              const otherFields = templateFields.filter((_, i) => i !== idx);
                              return (
                                <div key={cIdx} className="template-condition-row">
                                  {cIdx > 0 && <div className="condition-logic-label-small">{(tf.conditionLogic || 'and').toUpperCase()}</div>}
                                  <div className="condition-inputs-compact">
                                    <select value={c.fieldName} onChange={e => updateTemplateCondition(idx, cIdx, { fieldName: e.target.value })}>
                                      <option value="">Select field...</option>
                                      {otherFields.map(f => <option key={f.id} value={f.name}>{f.title}</option>)}
                                    </select>
                                    <select value={c.operator} onChange={e => updateTemplateCondition(idx, cIdx, { operator: e.target.value as Condition['operator'] })}>
                                      <option value="equals">equals</option>
                                      <option value="notEquals">not equals</option>
                                      <option value="contains">contains</option>
                                      <option value="notEmpty">is not empty</option>
                                      <option value="empty">is empty</option>
                                    </select>
                                    {!['empty', 'notEmpty'].includes(c.operator) && (
                                      <input type="text" value={c.value} onChange={e => updateTemplateCondition(idx, cIdx, { value: e.target.value })} placeholder="Value..." className="condition-value-input" />
                                    )}
                                    <button className="btn-delete-small" onClick={() => deleteTemplateCondition(idx, cIdx)}>×</button>
                                  </div>
                                </div>
                              );
                            })}
                            <button className="btn-add-small" onClick={() => addTemplateCondition(idx)} style={{ marginTop: '8px', width: '100%' }}>+ Add Condition</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* ── Bulk Import Config ── */}
                  <div className="bulk-import-config">
                    <div className="bulk-import-toggle-row">
                      <label>
                        <input
                          type="checkbox"
                          checked={allowBulkImport}
                          onChange={e => {
                            setAllowBulkImport(e.target.checked);
                            if (e.target.checked && !bulkImportFields.length) {
                              // Auto-initialise: all fields off, none required
                              setBulkImportFields(templateFields.map(tf => ({ name: tf.name, required: false })));
                            }
                          }}
                        />
                        📥 Enable bulk CSV import for this group
                      </label>
                    </div>

                    {allowBulkImport && (
                      <>
                        {templateFields.length === 0 ? (
                          <div className="bulk-empty">Add fields above first, then configure bulk import.</div>
                        ) : (
                          <table className="bulk-fields-table">
                            <thead>
                              <tr>
                                <th>Field</th>
                                <th>Type</th>
                                <th style={{ textAlign: 'center' }}>Include in CSV</th>
                                <th style={{ textAlign: 'center' }}>Required</th>
                              </tr>
                            </thead>
                            <tbody>
                              {templateFields.map(tf => {
                                const bulkEntry = bulkImportFields.find(b => b.name === tf.name);
                                const isIncluded = !!bulkEntry;
                                const isRequired = bulkEntry?.required ?? false;

                                const toggleInclude = (checked: boolean) => {
                                  if (checked) {
                                    setBulkImportFields(prev => [...prev, { name: tf.name, required: false }]);
                                  } else {
                                    setBulkImportFields(prev => prev.filter(b => b.name !== tf.name));
                                  }
                                };

                                const toggleRequired = (checked: boolean) => {
                                  setBulkImportFields(prev => prev.map(b =>
                                    b.name === tf.name ? { ...b, required: checked } : b
                                  ));
                                };

                                return (
                                  <tr key={tf.id}>
                                    <td>
                                      <strong>{tf.title}</strong>
                                      <code style={{ marginLeft: '6px' }}>{tf.name}</code>
                                    </td>
                                    <td>{tf.type}{tf.inputType ? ` / ${tf.inputType}` : ''}</td>
                                    <td style={{ textAlign: 'center' }}>
                                      <input
                                        type="checkbox"
                                        checked={isIncluded}
                                        onChange={e => toggleInclude(e.target.checked)}
                                      />
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <input
                                        type="checkbox"
                                        checked={isRequired}
                                        disabled={!isIncluded}
                                        onChange={e => toggleRequired(e.target.checked)}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                        <small style={{ color: 'var(--color-text-muted)', marginTop: 'var(--sp-2)', display: 'block' }}>
                          "Required" means that column must be filled in the CSV. Unchecked fields stay out of the CSV and are filled manually.
                        </small>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── CRM Lookup ── */}
              {isCrmLookup && (
                <div className="crm-section">
                  <h3>🔍 CRM Lookup – Auto-fill Fields</h3>
                  <p>When a user enters a valid CRM ID, the fields below will be auto-populated and made read-only.</p>

                  <div className="form-group">
                    <label>Description / Help text</label>
                    <input type="text" value={config.description || ''} onChange={e => setConfig({ ...config, description: e.target.value })} placeholder="e.g., Enter the client CRM ID to auto-fill details" />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>CRM ID Placeholder</label>
                      <input type="text" value={config.placeholder || ''} onChange={e => setConfig({ ...config, placeholder: e.target.value })} placeholder="e.g., CRM001" />
                    </div>
                  </div>

                  <p className="crm-labels-title">Auto-fill field labels:</p>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Name label</label>
                      <input type="text" value={crmLabels.name} onChange={e => setCrmLabels(prev => ({ ...prev, name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Street label</label>
                      <input type="text" value={crmLabels.street} onChange={e => setCrmLabels(prev => ({ ...prev, street: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Postcode label</label>
                      <input type="text" value={crmLabels.postcode} onChange={e => setCrmLabels(prev => ({ ...prev, postcode: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>City / State label</label>
                      <input type="text" value={crmLabels.state} onChange={e => setCrmLabels(prev => ({ ...prev, state: e.target.value }))} />
                    </div>
                  </div>

                  <div className="crm-field-names">
                    <strong>Generated field names (auto):</strong>
                    <ul>
                      <li><code>{config.name || 'crm_id'}</code> – CRM ID input</li>
                      <li><code>{config.name || 'crm_id'}_name</code> – {crmLabels.name}</li>
                      <li><code>{config.name || 'crm_id'}_street</code> – {crmLabels.street}</li>
                      <li><code>{config.name || 'crm_id'}_postcode</code> – {crmLabels.postcode}</li>
                      <li><code>{config.name || 'crm_id'}_state</code> – {crmLabels.state}</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="form-group checkbox-group">
                <label>
                  <input type="checkbox" checked={config.isRequired} onChange={e => setConfig({ ...config, isRequired: e.target.checked })} />
                  Required field
                </label>
              </div>
            </>
          )}

          {/* Validation tab -------------------------------------------- */}
          {activeTab === 'validators' && (
            <div className="validators-section">
              {validators.length === 0 && (
                <div className="empty-validators">
                  <p>Click a pattern below to add validation:</p>
                  <div className="validator-examples">
                    <strong>Network & Infrastructure:</strong>
                    {['ipv4', 'cidr', 'mac'].map(k => (
                      <code key={k} onClick={() => addValidatorPreset(k)}>{k.charAt(0).toUpperCase() + k.slice(1)}</code>
                    ))}
                  </div>
                  <div className="validator-examples">
                    <strong>Contact & Business:</strong>
                    <code onClick={() => addValidatorPreset('email')}>Email Address</code>
                    <code onClick={() => addValidatorPreset('phone')}>Phone Number</code>
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
                    <input type="text" value={v.text} onChange={e => updateValidator(idx, { text: e.target.value })} placeholder="Shown when validation fails" />
                  </div>
                  {v.type === 'regex' && (
                    <div className="form-group">
                      <label>Regex Pattern</label>
                      <div className="validator-regex-row">
                        <input type="text" value={v.regex || ''} onChange={e => updateValidator(idx, { regex: e.target.value })} placeholder="e.g., ^[A-Z]{3}$" className="code-input" />
                      </div>
                    </div>
                  )}
                  {v.type === 'numeric' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Min Value</label>
                        <input type="number" value={v.minValue ?? 0} onChange={e => updateValidator(idx, { minValue: parseFloat(e.target.value) })} />
                      </div>
                      <div className="form-group">
                        <label>Max Value</label>
                        <input type="number" value={v.maxValue ?? 100} onChange={e => updateValidator(idx, { maxValue: parseFloat(e.target.value) })} />
                      </div>
                    </div>
                  )}
                  {v.type === 'text' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Min Length</label>
                        <input type="number" value={v.minLength ?? 1} onChange={e => updateValidator(idx, { minLength: parseInt(e.target.value) })} />
                      </div>
                      <div className="form-group">
                        <label>Max Length</label>
                        <input type="number" value={v.maxLength ?? 100} onChange={e => updateValidator(idx, { maxLength: parseInt(e.target.value) })} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Condition tab -------------------------------------------------------- */}
          {activeTab === 'conditions' && (
            <div className="conditions-section">
              <div className="conditions-info">
                <p>This field will be <strong>hidden by default</strong> and shown only when conditions are met.</p>
              </div>
              {conditions.length > 1 && (
                <div className="logic-toggle">
                  <span>Match:</span>
                  <button className={`logic-btn ${conditionLogic === 'and' ? 'active' : ''}`} onClick={() => setConditionLogic('and')}>ALL conditions (AND)</button>
                  <button className={`logic-btn ${conditionLogic === 'or' ? 'active' : ''}`} onClick={() => setConditionLogic('or')}>ANY condition (OR)</button>
                </div>
              )}
              {conditions.length === 0 && (
                <div className="empty-conditions">
                  <p>No conditions - field is always visible.</p>
                  {allFields.length === 0 && <small>⚠️ Add other fields first to create conditions.</small>}
                </div>
              )}
              {conditions.map((c, idx) => (
                <div key={idx} className="condition-row">
                  {idx > 0 && <div className="condition-logic-label">{conditionLogic.toUpperCase()}</div>}
                  <div className="condition-inputs">
                    <select value={c.fieldName} onChange={e => updateCondition(idx, { fieldName: e.target.value })}>
                      <option value="">Select field...</option>
                      {allFields.map(f => <option key={f.id} value={f.name}>{f.title} ({f.name})</option>)}
                    </select>
                    <select value={c.operator} onChange={e => updateCondition(idx, { operator: e.target.value as Condition['operator'] })}>
                      <option value="equals">equals</option>
                      <option value="notEquals">not equals</option>
                      <option value="contains">contains</option>
                      <option value="notEmpty">is not empty</option>
                      <option value="empty">is empty</option>
                    </select>
                    {!['empty', 'notEmpty'].includes(c.operator) && (
                      <input type="text" value={c.value} onChange={e => updateCondition(idx, { value: e.target.value })} placeholder="Value..." />
                    )}
                    <button className="btn-delete-small" onClick={() => deleteCondition(idx)}>×</button>
                  </div>
                </div>
              ))}
              {allFields.length > 0 && <button className="btn-add-condition" onClick={addCondition}>+ Add Condition</button>}
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