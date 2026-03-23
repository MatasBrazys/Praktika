// src/components/admin/FieldEditor/index.tsx
// Shell component — owns top-level state, delegates template/bulk to hooks.

import { useState, useEffect, useCallback } from 'react'
import type { FieldConfig, Validator, Condition, DynamicChoicesSource } from '../../../types/form-builder.types'
import { VALIDATOR_PRESETS, AUTO_PRESET_REGEXES } from './validatorPresets'
import { useToast } from '../../../contexts/ToastContext'
import { useTemplateFields } from './hooks/useTemplateFields'
import { useBulkImportConfig } from './hooks/useBulkImportConfig'
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
  const [config,         setConfig]         = useState<FieldConfig>(field)
  const [choicesText,    setChoicesText]    = useState(field.choices?.join('\n') ?? '')
  const [activeTab,      setActiveTab]      = useState<Tab>('basic')
  const [validators,     setValidators]     = useState<Validator[]>((field.validators ?? []).map(withId))
  const [conditions,     setConditions]     = useState<Condition[]>((field.conditions ?? []).map(withId))
  const [conditionLogic, setConditionLogic] = useState<'and' | 'or'>(field.conditionLogic ?? 'and')
  const [crmLabels,      setCrmLabels]      = useState({
    name:     field.crmFieldLabels?.name     ?? 'Company Name',
    street:   field.crmFieldLabels?.street   ?? 'Street Address',
    postcode: field.crmFieldLabels?.postcode ?? 'Postcode',
    state:    field.crmFieldLabels?.state    ?? 'City / State',
  })

  // ── Template fields (paneldynamic sub-fields) ─────────────────────────────

  const template = useTemplateFields(field.templateElements ?? [])

  // ── Bulk import config ────────────────────────────────────────────────────

  const bulk = useBulkImportConfig(
    field.allowBulkImport ?? false,
    field.bulkImportFields ?? [],
    () => template.templateFields,
  )

  // ── Auto-preset validator for inputType ───────────────────────────────────

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
      if (config.dynamicChoicesSource?.fieldName) {
        // Dynamic choices — runtime will populate, skip static validation
        finalConfig.dynamicChoicesSource = config.dynamicChoicesSource
        delete finalConfig.choices
      } else {
        finalConfig.choices = choicesText.split('\n').map(c => c.trim()).filter(Boolean)
        if (!finalConfig.choices.length) { toast.warning('Choices required', 'Please add at least one choice.'); return }
        delete finalConfig.dynamicChoicesSource
      }
    } else {
      delete finalConfig.choices
      delete finalConfig.dynamicChoicesSource
    }

    if (config.type === 'paneldynamic') {
      finalConfig.templateElements  = template.templateFields
      finalConfig.allowBulkImport   = bulk.allowBulkImport
      finalConfig.bulkImportFields  = bulk.allowBulkImport ? bulk.bulkImportFields : []
    }

    finalConfig.validators     = validators.filter(v => v.type !== 'regex' || (v.regex && v.regex.trim()))
    finalConfig.conditions     = conditions.filter(c => c.fieldName)
    finalConfig.conditionLogic = conditionLogic

    onSave(finalConfig)
  }
  const handleDynamicChoicesChange = (source: DynamicChoicesSource | undefined) => {
    setConfig(prev => ({...prev, dynamicChoicesSource: source}))
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
              templateFields={template.templateFields}
              templateChoicesText={template.templateChoicesText}
              allowBulkImport={bulk.allowBulkImport}
              bulkImportFields={bulk.bulkImportFields}
              crmLabels={crmLabels}
              expandedTemplateField={template.expandedTemplateField}
              expandedTemplateConditions={template.expandedTemplateConditions}
              allFields={allFields}
              onConfigChange={updates => setConfig(prev => ({ ...prev, ...updates }))}
              onChoicesChange={setChoicesText}
              onCrmLabelsChange={updates => setCrmLabels(prev => ({ ...prev, ...updates }))}
              onAddTemplateField={template.addTemplateField}
              onUpdateTemplateField={template.updateTemplateField}
              onDeleteTemplateField={template.deleteTemplateField}
              onTemplateChoicesChange={template.handleTemplateChoicesChange}
              onTemplateTypeChange={template.handleTemplateTypeChange}
              onTemplateInputTypeChange={template.handleTemplateInputTypeChange}
              onToggleTemplateValidators={idx => template.setExpandedTemplateField(prev => prev === idx ? null : idx)}
              onToggleTemplateConditions={idx => template.setExpandedTemplateConditions(prev => prev === idx ? null : idx)}
              onAddTemplateValidator={template.addTemplateValidator}
              onUpdateTemplateValidator={template.updateTemplateValidator}
              onDeleteTemplateValidator={template.deleteTemplateValidator}
              onAddTemplateCondition={template.addTemplateCondition}
              onUpdateTemplateCondition={template.updateTemplateCondition}
              onDeleteTemplateCondition={template.deleteTemplateCondition}
              onTemplateConditionLogicChange={(idx, logic) => template.updateTemplateField(idx, { conditionLogic: logic })}
              onBulkImportToggle={bulk.handleBulkImportToggle}
              onBulkFieldToggle={bulk.handleBulkFieldToggle}
              onBulkRequiredToggle={bulk.handleBulkRequiredToggle}
              onDynamicChoicesChange={handleDynamicChoicesChange}
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