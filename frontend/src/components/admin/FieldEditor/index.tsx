// src/components/admin/FieldEditor/index.tsx
// Shell component — owns all state, delegates rendering to tabs and sections.

import { useState, useEffect, useCallback } from 'react'
import type { FieldConfig, BulkImportField, Validator, Condition } from '../../../types/form-builder.types'
import { VALIDATOR_PRESETS, AUTO_PRESET_REGEXES } from './validatorPresets'
import { useToast } from '../../../contexts/ToastContext'
import BasicTab      from './tabs/BasicTab'
import ValidatorsTab from './tabs/ValidatorsTab'
import ConditionsTab from './tabs/ConditionsTab'
import '../../../styles/components/field-editor.css'
import '../../../styles/components/modal.css'

interface Props {
  field:     FieldConfig
  allFields: FieldConfig[]
  onSave:    (field: FieldConfig) => void
  onCancel:  () => void
}

type Tab = 'basic' | 'validators' | 'conditions'

const PRESET_INPUT_TYPES = ['email', 'phone', 'ipv4', 'cidr', 'mac', 'number', 'date']

const withId = <T extends object>(item: T): T & { _id: string } =>
  ('_id' in item ? item : { ...item, _id: crypto.randomUUID() }) as T & { _id: string }

export default function FieldEditor({ field, allFields, onSave, onCancel }: Props) {
  const { toast } = useToast()
  const [config,                     setConfig]                     = useState<FieldConfig>(field)
  const [choicesText,                setChoicesText]                = useState(field.choices?.join('\n') ?? '')
  const [templateChoicesText,        setTemplateChoicesText]        = useState<Record<number, string>>({})
  const [activeTab,                  setActiveTab]                  = useState<Tab>('basic')
  const [validators,                 setValidators]                 = useState<Validator[]>((field.validators ?? []).map(withId))
  const [conditions,                 setConditions]                 = useState<Condition[]>((field.conditions ?? []).map(withId))
  const [conditionLogic,             setConditionLogic]             = useState<'and' | 'or'>(field.conditionLogic ?? 'and')
  const [templateFields,             setTemplateFields]             = useState<FieldConfig[]>(field.templateElements ?? [])
  const [expandedTemplateField,      setExpandedTemplateField]      = useState<number | null>(null)
  const [expandedTemplateConditions, setExpandedTemplateConditions] = useState<number | null>(null)
  const [allowBulkImport,            setAllowBulkImport]            = useState<boolean>(field.allowBulkImport ?? false)
  const [bulkImportFields,           setBulkImportFields]           = useState<BulkImportField[]>(field.bulkImportFields ?? [])
  const [crmLabels, setCrmLabels] = useState({
    name:     field.crmFieldLabels?.name     ?? 'Company Name',
    street:   field.crmFieldLabels?.street   ?? 'Street Address',
    postcode: field.crmFieldLabels?.postcode ?? 'Postcode',
    state:    field.crmFieldLabels?.state    ?? 'City / State',
  })

  // Auto-applies a regex preset validator when a specialized inputType is selected.
  // Uses functional setState so validators don't need to be in deps.
  const applyPresetValidator = useCallback((inputType: string, fieldType: string) => {
    setValidators(prev => {
      const manual = prev.filter(v => v.type !== 'regex' || !AUTO_PRESET_REGEXES.includes(v.regex ?? ''))

      if (fieldType !== 'text') return manual

      const needsPreset = PRESET_INPUT_TYPES.includes(inputType)
      if (needsPreset && VALIDATOR_PRESETS[inputType]) {
        return [...manual, { _id: crypto.randomUUID(), type: 'regex' as const, ...VALIDATOR_PRESETS[inputType] }]
      }
      return manual
    })
  }, [])

  useEffect(() => {
    applyPresetValidator(config.inputType ?? '', config.type)
  }, [config.inputType, config.type, applyPresetValidator])

  // ── Template field handlers ───────────────────────────────────────────────

  const addTemplateField = () => {
    setTemplateFields(prev => [
      ...prev,
      { id: `template_${Date.now()}`, name: `field_${prev.length + 1}`, title: 'New Field', type: 'text', isRequired: false },
    ])
  }

  const updateTemplateField = (idx: number, updates: Partial<FieldConfig>) =>
    setTemplateFields(prev => prev.map((f, i) => i === idx ? { ...f, ...updates } : f))

  const deleteTemplateField = (idx: number) =>
    setTemplateFields(prev => prev.filter((_f, i) => i !== idx))

  const handleTemplateChoicesChange = (idx: number, text: string) => {
    setTemplateChoicesText(prev => ({ ...prev, [idx]: text }))
    updateTemplateField(idx, { choices: text.split('\n').map(c => c.trim()).filter(Boolean) })
  }

  const handleTemplateTypeChange = (idx: number, newType: string) => {
    const tf     = templateFields[idx]
    const manual = (tf.validators ?? []).filter((v: Validator) =>
      v.type !== 'regex' || !AUTO_PRESET_REGEXES.includes(v.regex ?? '')
    )
    updateTemplateField(idx, newType !== 'text'
      ? { type: newType, inputType: undefined, validators: manual }
      : { type: newType },
    )
  }

  const handleTemplateInputTypeChange = (idx: number, inputType: string) => {
    const tf     = templateFields[idx]
    const manual = (tf.validators ?? []).filter((v: Validator) =>
      v.type !== 'regex' || !AUTO_PRESET_REGEXES.includes(v.regex ?? '')
    )
    const needsPreset = PRESET_INPUT_TYPES.includes(inputType)
    const newValidators = needsPreset && VALIDATOR_PRESETS[inputType]
      ? [...manual, { _id: crypto.randomUUID(), type: 'regex' as const, ...VALIDATOR_PRESETS[inputType] }]
      : manual
    updateTemplateField(idx, { inputType, validators: newValidators })
  }

  // ── Template validator handlers ───────────────────────────────────────────

  const addTemplateValidator = (idx: number, presetKey?: string) => {
    const newV: Validator = presetKey && VALIDATOR_PRESETS[presetKey]
      ? { _id: crypto.randomUUID(), type: 'regex' as const, ...VALIDATOR_PRESETS[presetKey] }
      : { _id: crypto.randomUUID(), type: 'regex', text: 'Invalid format', regex: '' }
    updateTemplateField(idx, { validators: [...(templateFields[idx].validators ?? []), newV] })
  }

  const updateTemplateValidator = (ti: number, vi: number, updates: Partial<Validator>) =>
    updateTemplateField(ti, {
      validators: (templateFields[ti].validators ?? []).map((v: Validator, i: number) =>
        i === vi ? { ...v, ...updates } : v
      ),
    })

  const deleteTemplateValidator = (ti: number, vi: number) =>
    updateTemplateField(ti, {
      validators: (templateFields[ti].validators ?? []).filter((_v: Validator, i: number) => i !== vi),
    })

  // ── Template condition handlers ───────────────────────────────────────────

  const addTemplateCondition = (idx: number) => {
    const otherFields = templateFields.filter((_f, i) => i !== idx)
    if (!otherFields.length) { toast.warning('Cannot add condition', 'Add more fields to this group first.'); return }
    updateTemplateField(idx, {
      conditions: [...(templateFields[idx].conditions ?? []), { _id: crypto.randomUUID(), fieldName: otherFields[0].name, operator: 'equals', value: '' }],
    })
  }

  const updateTemplateCondition = (ti: number, ci: number, updates: Partial<Condition>) =>
    updateTemplateField(ti, {
      conditions: (templateFields[ti].conditions ?? []).map((c: Condition, i: number) =>
        i === ci ? { ...c, ...updates } : c
      ),
    })

  const deleteTemplateCondition = (ti: number, ci: number) =>
    updateTemplateField(ti, {
      conditions: (templateFields[ti].conditions ?? []).filter((_c: Condition, i: number) => i !== ci),
    })

  // ── Top-level validator handlers ──────────────────────────────────────────

  const addValidatorPreset = (key: string) => {
    if (VALIDATOR_PRESETS[key]) setValidators(prev => [...prev, { _id: crypto.randomUUID(), type: 'regex' as const, ...VALIDATOR_PRESETS[key] }])
  }

  const addValidator = (type: Validator['type']) => {
    const defaults: Record<string, Validator> = {
      regex:   { _id: crypto.randomUUID(), type: 'regex',   text: 'Invalid format',  regex: '' },
      numeric: { _id: crypto.randomUUID(), type: 'numeric', text: 'Invalid number',  minValue: 0,  maxValue: 100 },
      text:    { _id: crypto.randomUUID(), type: 'text',    text: 'Invalid length',  minLength: 1, maxLength: 100 },
    }
    setValidators(prev => [...prev, defaults[type]])
  }

  const updateValidator = (i: number, updates: Partial<Validator>) =>
    setValidators(prev => prev.map((v, idx) => idx === i ? { ...v, ...updates } : v))

  const deleteValidator = (i: number) =>
    setValidators(prev => prev.filter((_v, idx) => idx !== i))

  // ── Top-level condition handlers ──────────────────────────────────────────

  const addCondition = () =>
    setConditions(prev => [...prev, { _id: crypto.randomUUID(), fieldName: allFields[0]?.name ?? '', operator: 'equals', value: '' }])

  const updateCondition = (i: number, updates: Partial<Condition>) =>
    setConditions(prev => prev.map((c, idx) => idx === i ? { ...c, ...updates } : c))

  const deleteCondition = (i: number) =>
    setConditions(prev => prev.filter((_c, idx) => idx !== i))

  // ── Bulk import handlers ──────────────────────────────────────────────────

  const handleBulkImportToggle = (enabled: boolean) => {
    setAllowBulkImport(enabled)
    if (enabled && !bulkImportFields.length) {
      setBulkImportFields(templateFields.map(tf => ({ name: tf.name, required: false })))
    }
  }

  const handleBulkFieldToggle = (fieldName: string, included: boolean) =>
    setBulkImportFields(prev =>
      included ? [...prev, { name: fieldName, required: false }] : prev.filter(b => b.name !== fieldName)
    )

  const handleBulkRequiredToggle = (fieldName: string, required: boolean) =>
    setBulkImportFields(prev => prev.map(b => b.name === fieldName ? { ...b, required } : b))

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!config.title.trim()) { toast.warning('Title required', 'Please enter a field title.'); return }

    const finalConfig: FieldConfig = { ...config }

    if (config.type === 'crmlookup') {
      finalConfig.crmFieldLabels = { ...crmLabels }
      delete finalConfig.choices
      onSave(finalConfig)
      return
    }

    if (['dropdown', 'radiogroup', 'checkbox'].includes(config.type)) {
      finalConfig.choices = choicesText.split('\n').map(c => c.trim()).filter(Boolean)
      if (!finalConfig.choices.length) { toast.warning('Choices required', 'Please add at least one choice.'); return }
    } else {
      delete finalConfig.choices
    }

    if (config.type === 'paneldynamic') {
      finalConfig.templateElements  = templateFields
      finalConfig.allowBulkImport   = allowBulkImport
      finalConfig.bulkImportFields  = allowBulkImport ? bulkImportFields : []
    }

    finalConfig.validators     = validators.filter(v => v.type !== 'regex' || (v.regex && v.regex.trim()))
    finalConfig.conditions     = conditions.filter(c => c.fieldName)
    finalConfig.conditionLogic = conditionLogic

    onSave(finalConfig)
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
              {tab === 'basic'      && '⚙️ Basic'}
              {tab === 'validators' && `✓ Validators${validators.length ? ` (${validators.length})` : ''}`}
              {tab === 'conditions' && `⚡ Conditions${conditions.length ? ` (${conditions.length})` : ''}`}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {activeTab === 'basic' && (
            <BasicTab
              config={config}
              choicesText={choicesText}
              templateFields={templateFields}
              templateChoicesText={templateChoicesText}
              allowBulkImport={allowBulkImport}
              bulkImportFields={bulkImportFields}
              crmLabels={crmLabels}
              expandedTemplateField={expandedTemplateField}
              expandedTemplateConditions={expandedTemplateConditions}
              onConfigChange={updates => setConfig(prev => ({ ...prev, ...updates }))}
              onChoicesChange={setChoicesText}
              onCrmLabelsChange={updates => setCrmLabels(prev => ({ ...prev, ...updates }))}
              onAddTemplateField={addTemplateField}
              onUpdateTemplateField={updateTemplateField}
              onDeleteTemplateField={deleteTemplateField}
              onTemplateChoicesChange={handleTemplateChoicesChange}
              onTemplateTypeChange={handleTemplateTypeChange}
              onTemplateInputTypeChange={handleTemplateInputTypeChange}
              onToggleTemplateValidators={idx => setExpandedTemplateField(prev => prev === idx ? null : idx)}
              onToggleTemplateConditions={idx => setExpandedTemplateConditions(prev => prev === idx ? null : idx)}
              onAddTemplateValidator={addTemplateValidator}
              onUpdateTemplateValidator={updateTemplateValidator}
              onDeleteTemplateValidator={deleteTemplateValidator}
              onAddTemplateCondition={addTemplateCondition}
              onUpdateTemplateCondition={updateTemplateCondition}
              onDeleteTemplateCondition={deleteTemplateCondition}
              onTemplateConditionLogicChange={(idx, logic) => updateTemplateField(idx, { conditionLogic: logic })}
              onBulkImportToggle={handleBulkImportToggle}
              onBulkFieldToggle={handleBulkFieldToggle}
              onBulkRequiredToggle={handleBulkRequiredToggle}
            />
          )}

          {activeTab === 'validators' && (
            <ValidatorsTab
              validators={validators}
              onAdd={addValidator}
              onAddPreset={addValidatorPreset}
              onUpdate={updateValidator}
              onDelete={deleteValidator}
            />
          )}

          {activeTab === 'conditions' && (
            <ConditionsTab
              conditions={conditions}
              conditionLogic={conditionLogic}
              allFields={allFields}
              onAdd={addCondition}
              onUpdate={updateCondition}
              onDelete={deleteCondition}
              onLogicChange={setConditionLogic}
            />
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary"   onClick={handleSave}>Save Field</button>
        </div>
      </div>
    </div>
  )
}