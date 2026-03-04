// src/pages/admin/FormBuilder.tsx
// Only changed: removed all alert() calls → toast, kept all builder logic intact.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { extractErrorMessage } from '../../lib/apiClient';
import Navbar from '../../components/shared/Navbar';
import FieldEditor from '../../components/admin/FieldEditor';
import FormPreview from '../../components/admin/FormPreview';
import '../../styles/pages/admin/form-builder.css';
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

export interface BulkImportField {
  name: string;
  required: boolean;
}

export interface FieldConfig {
  id: string;
  name: string;
  title: string;
  description?: string;
  type: string;
  isRequired: boolean;
  inputType?: string;
  choices?: string[];
  defaultValue?: string;
  placeholder?: string;
  validators?: Validator[];
  conditions?: Condition[];
  conditionLogic?: 'and' | 'or';
  templateElements?: FieldConfig[];
  addPanelText?: string;
  removePanelText?: string;
  minPanelCount?: number;
  panelCount?: number;
  crmFieldLabels?: { name?: string; street?: string; postcode?: string; state?: string };
  // ── Bulk import ──────────────────────────────────────────────────────────
  allowBulkImport?: boolean;
  bulkImportFields?: BulkImportField[];
}

interface Page {
  id: string;
  name: string;
  title: string;
  fields: FieldConfig[];
}

const CRM_PANEL_MARKER = '__crm_panel__';

export default function FormBuilder() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { toast }  = useToast();
  const isEditMode = !!id;

  const [title,           setTitle]           = useState('');
  const [description,     setDescription]     = useState('');
  const [pages,           setPages]           = useState<Page[]>([{ id: 'page_1', name: 'page1', title: 'Page 1', fields: [] }]);
  const [activePageId,    setActivePageId]    = useState('page_1');
  const [editingField,    setEditingField]    = useState<FieldConfig | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [saving,          setSaving]          = useState(false);

  const activePage = pages.find(p => p.id === activePageId) || pages[0];
  const allFields  = pages.flatMap(p => p.fields);

  useEffect(() => { if (isEditMode) loadForm(); }, [id]);

  const loadForm = async () => {
    try {
      const form = await formAPI.get(Number(id));
      setTitle(form.title);
      setDescription(form.description || '');

      const json     = form.surveyjs_json as any;
      const rawPages = json.pages ? json.pages : [{ name: 'page1', title: 'Page 1', elements: json.elements || [] }];

      const loadedPages: Page[] = rawPages.map((p: any, pi: number) => ({
        id:     `page_${pi + 1}`,
        name:   p.name  || `page${pi + 1}`,
        title:  p.title || `Page ${pi + 1}`,
        fields: (p.elements || []).map((el: any, ei: number) => elementToField(el, `field_${pi}_${ei}`)).filter(Boolean) as FieldConfig[],
      }));

      setPages(loadedPages);
      setActivePageId(loadedPages[0].id);
    } catch (err) {
      toast.error('Failed to load form', extractErrorMessage(err));
      navigate('/admin/forms');
    }
  };

  const elementToField = (el: any, fallbackId: string): FieldConfig | null => {
    try {
      if (el.type === 'panel' && el[CRM_PANEL_MARKER]) {
        const idEl = el.elements?.[0];
        if (!idEl) return null;
        return {
          id: fallbackId, name: idEl.name, title: idEl.title || idEl.name,
          description: idEl.description, type: 'crmlookup',
          isRequired: idEl.isRequired || false, placeholder: idEl.placeholder,
          crmFieldLabels: {
            name:     el.elements?.[1]?.title,
            street:   el.elements?.[2]?.title,
            postcode: el.elements?.[3]?.title,
            state:    el.elements?.[4]?.title,
          },
        };
      }
      const field: FieldConfig = {
        id: fallbackId, name: el.name || fallbackId, title: el.title || el.name || 'Untitled',
        description: el.description, type: el.type || 'text', isRequired: el.isRequired || false,
        inputType: el.inputType, choices: el.choices, defaultValue: el.defaultValue,
        placeholder: el.placeholder, validators: el.validators || [],
        addPanelText: el.addPanelText, removePanelText: el.removePanelText,
        minPanelCount: el.minPanelCount, panelCount: el.panelCount,
      };
      if (el.visibleIf) {
        try { field.conditions = parseVisibleIf(el.visibleIf); field.conditionLogic = el.visibleIf.toLowerCase().includes(' or ') ? 'or' : 'and'; }
        catch { field.conditions = []; }
      }
      if (el.type === 'paneldynamic' && el.templateElements) {
        field.templateElements = el.templateElements.map((te: any, i: number) => elementToField(te, `template_${fallbackId}_${i}`)).filter(Boolean) as FieldConfig[];
        // ── Restore bulk import config from JSON ──
        field.allowBulkImport  = el.allowBulkImport  || false;
        field.bulkImportFields = el.bulkImportFields || [];
      }
      return field;
    } catch { return null; }
  };

  const parseVisibleIf = (expr: string): Condition[] => {
    return expr.split(/ and | or /i).map(part => {
      const em = part.match(/\{(?:panel\.)?(\w+)\}\s+empty/);
      const nm = part.match(/\{(?:panel\.)?(\w+)\}\s+notempty/);
      const eq = part.match(/\{(?:panel\.)?(\w+)\}\s*=\s*'([^']+)'/);
      const ne = part.match(/\{(?:panel\.)?(\w+)\}\s*!=\s*'([^']+)'/);
      const co = part.match(/\{(?:panel\.)?(\w+)\}\s+contains\s+(?:\['([^']+)'\]|'([^']+)')/);
      if (em) return { fieldName: em[1], operator: 'empty'     as const, value: '' };
      if (nm) return { fieldName: nm[1], operator: 'notEmpty'  as const, value: '' };
      if (eq) return { fieldName: eq[1], operator: 'equals'    as const, value: eq[2] };
      if (ne) return { fieldName: ne[1], operator: 'notEquals' as const, value: ne[2] };
      if (co) return { fieldName: co[1], operator: 'contains'  as const, value: co[2] || co[3] };
      return { fieldName: '', operator: 'equals' as const, value: '' };
    }).filter(c => c.fieldName);
  };

  // ── Page management ────────────────────────────────────────────────────────

  const addPage = () => {
    const newId = `page_${Date.now()}`;
    setPages(prev => [...prev, { id: newId, name: `page${pages.length + 1}`, title: `Page ${pages.length + 1}`, fields: [] }]);
    setActivePageId(newId);
  };

  const deletePage = (pageId: string) => {
    if (pages.length === 1) { toast.warning('Cannot delete', 'At least one page is required.'); return; }
    if (!confirm('Delete this page and all its fields?')) return;
    const newPages = pages.filter(p => p.id !== pageId);
    setPages(newPages);
    if (activePageId === pageId) setActivePageId(newPages[0].id);
  };

  const updatePageTitle = (pageId: string, newTitle: string) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, title: newTitle } : p));
  };

  // ── Field management ───────────────────────────────────────────────────────

  const addField = () => {
    setEditingField({ id: `field_${Date.now()}`, name: `field_${activePage.fields.length + 1}`, title: 'New Field', type: 'text', isRequired: false });
    setShowFieldEditor(true);
  };

  const saveField = (updated: FieldConfig) => {
    setPages(prev => prev.map(p => {
      if (p.id !== activePageId) return p;
      const exists = p.fields.find(f => f.id === updated.id);
      return { ...p, fields: exists ? p.fields.map(f => f.id === updated.id ? updated : f) : [...p.fields, updated] };
    }));
    setShowFieldEditor(false);
    setEditingField(null);
  };

  const deleteField = (fieldId: string) => {
    if (!confirm('Delete this field?')) return;
    setPages(prev => prev.map(p =>
      p.id === activePageId ? { ...p, fields: p.fields.filter(f => f.id !== fieldId) } : p
    ));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const fields = [...activePage.fields];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= fields.length) return;
    [fields[index], fields[target]] = [fields[target], fields[index]];
    setPages(prev => prev.map(p => p.id === activePageId ? { ...p, fields } : p));
  };

  // ── SurveyJS conversion ────────────────────────────────────────────────────

  const fieldToElement = (field: FieldConfig, isTemplate = false): any => {
    if (field.type === 'crmlookup') {
      const prefix = field.name;
      const labels = field.crmFieldLabels || {};
      return {
        type: 'panel', name: `panel_${prefix}`, [CRM_PANEL_MARKER]: true,
        elements: [
          { type: 'text', name: prefix, title: field.title, description: field.description || 'Enter CRM ID to auto-fill client details', isRequired: field.isRequired, placeholder: field.placeholder || 'e.g. CRM001' },
          { type: 'text', name: `${prefix}_name`,     title: labels.name     || 'Company Name',   readOnly: true, visibleIf: `{${prefix}} notempty` },
          { type: 'text', name: `${prefix}_street`,   title: labels.street   || 'Street Address', readOnly: true, visibleIf: `{${prefix}} notempty` },
          { type: 'text', name: `${prefix}_postcode`, title: labels.postcode || 'Postcode',        readOnly: true, visibleIf: `{${prefix}} notempty` },
          { type: 'text', name: `${prefix}_state`,    title: labels.state    || 'City / State',   readOnly: true, visibleIf: `{${prefix}} notempty` },
        ],
      };
    }

    const el: any = { name: field.name, title: field.title, type: field.type, isRequired: field.isRequired };
    if (field.description)                        el.description  = field.description;
    if (field.placeholder)                        el.placeholder  = field.placeholder;
    if (field.defaultValue)                       el.defaultValue = field.defaultValue;
    if (field.inputType && field.type === 'text') el.inputType    = field.inputType;
    if (field.choices)                            el.choices      = field.choices;
    if (field.validators?.length)                 el.validators   = field.validators;

    if (field.conditions?.length) {
      const logic = field.conditionLogic || 'and';
      el.visibleIf = field.conditions.map(c => {
        const ref = isTemplate ? `{panel.${c.fieldName}}` : `{${c.fieldName}}`;
        if (c.operator === 'empty')     return `${ref} empty`;
        if (c.operator === 'notEmpty')  return `${ref} notempty`;
        if (c.operator === 'contains')  return `${ref} contains ['${c.value}']`;
        if (c.operator === 'equals')    return `${ref} = '${c.value}'`;
        if (c.operator === 'notEquals') return `${ref} != '${c.value}'`;
        return '';
      }).filter(Boolean).join(` ${logic} `);
    }

    if (field.type === 'paneldynamic') {
      el.panelCount      = field.panelCount || 1;
      el.minPanelCount   = field.minPanelCount || 1;
      el.addPanelText    = field.addPanelText || 'Add';
      el.removePanelText = field.removePanelText || 'Remove';
      if (field.panelCount) el.templateTitle = 'Panel {panelIndex}';
      el.templateElements = (field.templateElements || []).map(tf => fieldToElement(tf, true));
      // ── Persist bulk import config into SurveyJS JSON ──
      if (field.allowBulkImport) {
        el.allowBulkImport  = true;
        el.bulkImportFields = field.bulkImportFields || [];
      }
    }
    return el;
  };

  const convertToSurveyJS = () => {
    if (pages.length === 1) return { elements: pages[0].fields.map(f => fieldToElement(f)) };
    return { pages: pages.map(p => ({ name: p.name, title: p.title, elements: p.fields.map(f => fieldToElement(f)) })) };
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!title.trim()) { toast.warning('Title required', 'Please enter a form title.'); return; }
    const totalFields = pages.reduce((sum, p) => sum + p.fields.length, 0);
    if (!totalFields) { toast.warning('No fields', 'Add at least one field before saving.'); return; }

    setSaving(true);
    try {
      const surveyjs_json = convertToSurveyJS();
      if (isEditMode) await formAPI.update(Number(id), { title, description, surveyjs_json });
      else            await formAPI.create({ title, description, surveyjs_json, is_active: true });
      toast.success(isEditMode ? 'Form updated' : 'Form created', `"${title}" has been saved.`);
      navigate('/admin/forms');
    } catch (err) {
      toast.error('Save failed', extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="page-container-admin">
        <div className="builder-wrapper">

          <div className="builder-header">
            <div className="builder-header-left">
              <h1>{isEditMode ? 'Edit Form' : 'Create New Form'}</h1>
              <div className="form-meta-inputs">
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Form title *" className="meta-input title-input" />
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" className="meta-input" />
              </div>
            </div>
            <div className="header-actions">
              <button className="btn-secondary" onClick={() => navigate('/admin/forms')}>Cancel</button>
              <button className="btn-primary"   onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Form'}</button>
            </div>
          </div>

          <div className="page-tabs">
            {pages.map(page => (
              <div key={page.id} className={`page-tab ${page.id === activePageId ? 'active' : ''}`} onClick={() => setActivePageId(page.id)}>
                {page.id === activePageId ? (
                  <input className="page-tab-input" value={page.title} onChange={e => updatePageTitle(page.id, e.target.value)} onClick={e => e.stopPropagation()} />
                ) : (
                  <span>{page.title}</span>
                )}
                {pages.length > 1 && (
                  <button className="page-tab-delete" onClick={e => { e.stopPropagation(); deletePage(page.id); }}>×</button>
                )}
              </div>
            ))}
            <button className="btn-add-page" onClick={addPage}>+ Add Page</button>
          </div>

          <div className="builder-content">
            <div className="config-panel">
              <div className="section-header">
                <h2>Fields ({activePage.fields.length})</h2>
                <button className="btn-add" onClick={addField}>+ Add Field</button>
              </div>

              {activePage.fields.length === 0 ? (
                <div className="empty-fields">
                  <p>No fields on this page</p>
                  <button onClick={addField}>Add your first field</button>
                </div>
              ) : (
                <div className="fields-list">
                  {activePage.fields.map((field, index) => (
                    <div key={field.id} className="field-item">
                      <div className="field-info">
                        <div className="field-order">
                          <button onClick={() => moveField(index, 'up')}   disabled={index === 0}>▲</button>
                          <span>{index + 1}</span>
                          <button onClick={() => moveField(index, 'down')} disabled={index === activePage.fields.length - 1}>▼</button>
                        </div>
                        <div className="field-details">
                          <strong>{field.title}</strong>
                          <div className="field-meta">
                            <span className="field-type-badge">{field.type === 'crmlookup' ? '🔍 CRM Lookup' : field.type}</span>
                            {field.isRequired          && <span className="required-badge">Required</span>}
                            {field.conditions?.length  ? <span className="condition-badge">⚡ Conditional</span> : null}
                            {field.validators?.length  ? <span className="validator-badge">✓ Validated</span>   : null}
                            {field.allowBulkImport     && <span className="condition-badge">📥 Bulk Import</span>}
                          </div>
                        </div>
                      </div>
                      <div className="field-actions">
                        <button onClick={() => { setEditingField(field); setShowFieldEditor(true); }}>Edit</button>
                        <button onClick={() => deleteField(field.id)} className="delete">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="preview-panel">
              <h2>Live Preview — {activePage.title}</h2>
              <FormPreview surveyJson={convertToSurveyJS()} activePageIndex={pages.findIndex(p => p.id === activePageId)} />
            </div>
          </div>

        </div>
      </div>

      {showFieldEditor && editingField && (
        <FieldEditor
          field={editingField}
          allFields={allFields.filter(f => f.id !== editingField.id)}
          onSave={saveField}
          onCancel={() => { setShowFieldEditor(false); setEditingField(null); }}
        />
      )}
    </>
  );
}