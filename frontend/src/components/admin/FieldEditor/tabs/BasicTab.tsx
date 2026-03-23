// src/components/admin/FieldEditor/tabs/BasicTab.tsx
// Basic tab — field type, title, name, description, choices, paneldynamic and CRM config.

import type { FieldConfig, BulkImportField, Validator, Condition, DynamicChoicesSource } from '../../../../types/form-builder.types';
import TemplateFieldRow from '../sections/TemplateFieldRow';
import BulkImportConfig from '../sections/BulkImportConfig';
import CrmLookupConfig from '../sections/CrmLookupConfig';
import { FIELD_TYPES, TEXT_INPUT_TYPES } from '../fieldTypes';
import DynamicChoicesConfig from '../sections/DynamicChoicesConfig';
interface CrmLabels { name: string; street: string; postcode: string; state: string; }

interface Props {
  config: FieldConfig;
  choicesText: string;
  templateFields: FieldConfig[];
  templateChoicesText: Record<number, string>;
  allowBulkImport: boolean;
  bulkImportFields: BulkImportField[];
  crmLabels: CrmLabels;
  expandedTemplateField: number | null;
  expandedTemplateConditions: number | null;
  allFields: FieldConfig[]
  onConfigChange: (updates: Partial<FieldConfig>) => void;
  onChoicesChange: (text: string) => void;
  onCrmLabelsChange: (updates: Partial<CrmLabels>) => void;
  // template field handlers
  onAddTemplateField: () => void;
  onUpdateTemplateField: (idx: number, updates: Partial<FieldConfig>) => void;
  onDeleteTemplateField: (idx: number) => void;
  onTemplateChoicesChange: (idx: number, text: string) => void;
  onTemplateTypeChange: (idx: number, type: string) => void;
  onTemplateInputTypeChange: (idx: number, inputType: string) => void;
  onToggleTemplateValidators: (idx: number) => void;
  onToggleTemplateConditions: (idx: number) => void;
  onAddTemplateValidator: (idx: number, presetKey?: string) => void;
  onUpdateTemplateValidator: (ti: number, vi: number, updates: Partial<Validator>) => void;
  onDeleteTemplateValidator: (ti: number, vi: number) => void;
  onAddTemplateCondition: (idx: number) => void;
  onUpdateTemplateCondition: (ti: number, ci: number, updates: Partial<Condition>) => void;
  onDeleteTemplateCondition: (ti: number, ci: number) => void;
  onTemplateConditionLogicChange: (idx: number, logic: 'and' | 'or') => void;
  // bulk import handlers
  onBulkImportToggle: (enabled: boolean) => void;
  onBulkFieldToggle: (fieldName: string, included: boolean) => void;
  onBulkRequiredToggle: (fieldName: string, required: boolean) => void;
  onDynamicChoicesChange: (source: DynamicChoicesSource | undefined) => void

}

export default function BasicTab({
  config, choicesText, templateFields, templateChoicesText,
  allowBulkImport, bulkImportFields, crmLabels,
  expandedTemplateField, expandedTemplateConditions, allFields,
  onConfigChange, onChoicesChange, onCrmLabelsChange,
  onAddTemplateField, onUpdateTemplateField, onDeleteTemplateField,
  onTemplateChoicesChange, onTemplateTypeChange, onTemplateInputTypeChange,
  onToggleTemplateValidators, onToggleTemplateConditions,
  onAddTemplateValidator, onUpdateTemplateValidator, onDeleteTemplateValidator,
  onAddTemplateCondition, onUpdateTemplateCondition, onDeleteTemplateCondition,
  onTemplateConditionLogicChange,
  onBulkImportToggle, onBulkFieldToggle, onBulkRequiredToggle, onDynamicChoicesChange,
}: Props) {
  const isCrmLookup = config.type === 'crmlookup';
  const needsChoices = ['dropdown', 'radiogroup', 'checkbox'].includes(config.type);
  const showPlaceholder = config.type === 'text' || config.type === 'comment';

  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label>Field Title *</label>
          <input type="text" value={config.title} onChange={e => onConfigChange({ title: e.target.value })} placeholder="e.g., Customer Name" />
        </div>
        <div className="form-group">
          <label>Field Name (internal) *</label>
          <input type="text" value={config.name} onChange={e => onConfigChange({ name: e.target.value })} placeholder="e.g., customerName" />
          <small>No spaces or special characters</small>
        </div>
      </div>

      <div className="form-group">
        <label>Field Type *</label>
        <select value={config.type} onChange={e => onConfigChange({ type: e.target.value })}>
          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {config.type === 'text' && (
        <div className="form-group">
          <label>Input Type</label>
          <select value={config.inputType || 'text'} onChange={e => onConfigChange({ inputType: e.target.value })}>
            {TEXT_INPUT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <small>Select specialized input type for validation</small>
        </div>
      )}

      <div className="form-group">
        <label>Description</label>
        <input type="text" value={config.description || ''} onChange={e => onConfigChange({ description: e.target.value })} placeholder="Help text shown below the field" />
      </div>

      {showPlaceholder && (
        <div className="form-row">
          <div className="form-group">
            <label>Placeholder</label>
            <input type="text" value={config.placeholder || ''} onChange={e => onConfigChange({ placeholder: e.target.value })} placeholder="e.g., Enter value..." />
          </div>
          {showPlaceholder && (
            <div className="form-group">
              <label>Default Value</label>
              <input type="text" value={config.defaultValue || ''} onChange={e => onConfigChange({ defaultValue: e.target.value })} placeholder="Pre-filled value" />
            </div>
          )}
        </div>
      )}

      {needsChoices && (
        <>
          <DynamicChoicesConfig
            source={config.dynamicChoicesSource}
            allFields={allFields}
            onChange={onDynamicChoicesChange}
          />
          {!config.dynamicChoicesSource?.fieldName && (
            <div className='form-group'>
              <label>Choices (one per line) *</label>
              <textarea value={choicesText} onChange={e=>onChoicesChange(e.target.value)} placeholder='Type each option on a new line' rows={5}/>
            </div>
          )}
        </>
      )}

      {/* Paneldynamic template fields */}
      {config.type === 'paneldynamic' && (
        <div className="template-section">
          <div className="section-header">
            <h3>🔁 Repeatable Group Fields</h3>
            <button className="btn-add-small" onClick={onAddTemplateField}>+ Add Field</button>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Add Button Text</label>
              <input type="text" value={config.addPanelText || 'Add'} onChange={e => onConfigChange({ addPanelText: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Remove Button Text</label>
              <input type="text" value={config.removePanelText || 'Remove'} onChange={e => onConfigChange({ removePanelText: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Min Panels</label>
              <input type="number" value={config.minPanelCount || 1} min={1} onChange={e => onConfigChange({ minPanelCount: parseInt(e.target.value) })} />
            </div>
          </div>

          {templateFields.length === 0 && (
            <div className="empty-template"><p>Add fields that will repeat in each panel</p></div>
          )}

          {templateFields.map((tf, idx) => (
            <TemplateFieldRow
              key={tf.id}
              tf={tf}
              idx={idx}
              allTemplateFields={templateFields}
              choicesText={templateChoicesText[idx] ?? tf.choices?.join('\n') ?? ''}
              expandedValidators={expandedTemplateField}
              expandedConditions={expandedTemplateConditions}
              onUpdate={onUpdateTemplateField}
              onDelete={onDeleteTemplateField}
              onChoicesChange={onTemplateChoicesChange}
              onTypeChange={onTemplateTypeChange}
              onInputTypeChange={onTemplateInputTypeChange}
              onToggleValidators={onToggleTemplateValidators}
              onToggleConditions={onToggleTemplateConditions}
              onAddValidator={onAddTemplateValidator}
              onUpdateValidator={onUpdateTemplateValidator}
              onDeleteValidator={onDeleteTemplateValidator}
              onAddCondition={onAddTemplateCondition}
              onUpdateCondition={onUpdateTemplateCondition}
              onDeleteCondition={onDeleteTemplateCondition}
              onConditionLogicChange={onTemplateConditionLogicChange}
            />
          ))}

          <BulkImportConfig
            templateFields={templateFields}
            allowBulkImport={allowBulkImport}
            bulkImportFields={bulkImportFields}
            onToggle={onBulkImportToggle}
            onFieldToggle={onBulkFieldToggle}
            onRequiredToggle={onBulkRequiredToggle}
          />
        </div>
      )}

      {/* CRM Lookup config */}
      {isCrmLookup && (
        <CrmLookupConfig
          config={config}
          crmLabels={crmLabels}
          onConfigChange={onConfigChange}
          onLabelsChange={onCrmLabelsChange}
        />
      )}

      <div className="form-group checkbox-group">
        <label>
          <input type="checkbox" checked={config.isRequired} onChange={e => onConfigChange({ isRequired: e.target.checked })} />
          Required field
        </label>
      </div>
    </>
  );
}