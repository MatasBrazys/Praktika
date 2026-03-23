// src/components/admin/FieldEditor/hooks/useTemplateFields.ts
// Manages template fields (paneldynamic sub-fields) and their validators/conditions.

import { useState } from 'react'
import type { FieldConfig, Validator, Condition } from '../../../../types/form-builder.types'
import { VALIDATOR_PRESETS, AUTO_PRESET_REGEXES } from '../validatorPresets'
import { useToast } from '../../../../contexts/ToastContext'

const PRESET_INPUT_TYPES = ['email', 'phone', 'ipv4', 'cidr', 'mac', 'number', 'date']

export function useTemplateFields(initialFields: FieldConfig[]) {
  const { toast } = useToast()

  const [templateFields, setTemplateFields] = useState<FieldConfig[]>(initialFields)
  const [expandedTemplateField, setExpandedTemplateField] = useState<number | null>(null)
  const [expandedTemplateConditions, setExpandedTemplateConditions] = useState<number | null>(null)
  const [templateChoicesText, setTemplateChoicesText] = useState<Record<number, string>>({})

  // ── Field CRUD ────────────────────────────────────────────────────────────

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

  // ── Choices ───────────────────────────────────────────────────────────────

  const handleTemplateChoicesChange = (idx: number, text: string) => {
    setTemplateChoicesText(prev => ({ ...prev, [idx]: text }))
    updateTemplateField(idx, { choices: text.split('\n').map(c => c.trim()).filter(Boolean) })
  }

  // ── Type changes (with auto-preset) ───────────────────────────────────────

  const handleTemplateTypeChange = (idx: number, newType: string) => {
    const tf = templateFields[idx]
    const manual = (tf.validators ?? []).filter((v: Validator) =>
      v.type !== 'regex' || !AUTO_PRESET_REGEXES.includes(v.regex ?? '')
    )
    updateTemplateField(idx, newType !== 'text'
      ? { type: newType, inputType: undefined, validators: manual }
      : { type: newType },
    )
  }

  const handleTemplateInputTypeChange = (idx: number, inputType: string) => {
    const tf = templateFields[idx]
    const manual = (tf.validators ?? []).filter((v: Validator) =>
      v.type !== 'regex' || !AUTO_PRESET_REGEXES.includes(v.regex ?? '')
    )
    const needsPreset = PRESET_INPUT_TYPES.includes(inputType)
    const newValidators = needsPreset && VALIDATOR_PRESETS[inputType]
      ? [...manual, { _id: crypto.randomUUID(), type: 'regex' as const, ...VALIDATOR_PRESETS[inputType] }]
      : manual
    updateTemplateField(idx, { inputType, validators: newValidators })
  }

  // ── Validators ────────────────────────────────────────────────────────────

  const addTemplateValidator = (idx: number, presetKey?: string) => {
    const newV: Validator = presetKey && VALIDATOR_PRESETS[presetKey]
      ? { _id: crypto.randomUUID(), type: 'regex' as const, ...VALIDATOR_PRESETS[presetKey] }
      : { _id: crypto.randomUUID(), type: 'regex', text: 'Invalid format', regex: '' }
    updateTemplateField(idx, { validators: [...(templateFields[idx].validators ?? []), newV] })
  }

  const addTemplateCrossfieldValidator = (idx: number) => {
    const newV: Validator = {
      _id: crypto.randomUUID(),
      type: 'crossfield',
      text: 'Values are not compatible',  // generic bet geresnis
      compareField: '',
      operation: '',
    }
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

  // ── Conditions ────────────────────────────────────────────────────────────

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

  return {
    templateFields,
    setTemplateFields,
    templateChoicesText,
    expandedTemplateField,
    expandedTemplateConditions,
    setExpandedTemplateField,
    setExpandedTemplateConditions,
    addTemplateField,
    updateTemplateField,
    deleteTemplateField,
    handleTemplateChoicesChange,
    handleTemplateTypeChange,
    handleTemplateInputTypeChange,
    addTemplateValidator,
    addTemplateCrossfieldValidator,
    updateTemplateValidator,
    deleteTemplateValidator,
    addTemplateCondition,
    updateTemplateCondition,
    deleteTemplateCondition,
  }
}