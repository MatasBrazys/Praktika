// frontend/src/components/admin/FormBuilder.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formAPI } from '../../services/api';
import Navbar from '../../components/shared/Navbar';
import FieldEditor from '../../components/admin/FieldEditor';
import FormPreview from '../../components/admin/FormPreview';
import '../../styles/pages/FormBuilderPage.css';

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
}

interface Page {
  id: string;
  name: string;
  title: string;
  fields: FieldConfig[];
}

export default function FormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pages, setPages] = useState<Page[]>([
    { id: 'page_1', name: 'page1', title: 'Page 1', fields: [] }
  ]);
  const [activePageId, setActivePageId] = useState('page_1');
  const [editingField, setEditingField] = useState<FieldConfig | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [saving, setSaving] = useState(false);

  const activePage = pages.find(p => p.id === activePageId) || pages[0];
  const allFields = pages.flatMap(p => p.fields);

  useEffect(() => {
    if (isEditMode) loadForm();
  }, [id]);

  const loadForm = async () => {
    try {
      const form = await formAPI.get(Number(id));
      setTitle(form.title);
      setDescription(form.description || '');

      const json = form.surveyjs_json;
      const rawPages = json.pages
        ? json.pages
        : [{ name: 'page1', title: 'Page 1', elements: json.elements || [] }];

      const loadedPages: Page[] = rawPages.map((p: any, pi: number) => ({
        id: `page_${pi + 1}`,
        name: p.name || `page${pi + 1}`,
        title: p.title || `Page ${pi + 1}`,
        fields: (p.elements || [])
          .map((el: any, ei: number) => elementToField(el, `field_${pi}_${ei}`))
          .filter(Boolean) as FieldConfig[], // ← null laukai filtruojami
      }));

      setPages(loadedPages);
      setActivePageId(loadedPages[0].id);
    } catch (err) {
      console.error('loadForm failed:', err);
      alert('Failed to load form');
      navigate('/admin/forms');
    }
  };

  const elementToField = (el: any, fallbackId: string): FieldConfig | null => {
    try {
      const field: FieldConfig = {
        id: fallbackId,
        name: el.name || fallbackId,
        title: el.title || el.name || 'Untitled',
        description: el.description,
        type: el.type || 'text',
        isRequired: el.isRequired || false,
        inputType: el.inputType,
        choices: el.choices,
        defaultValue: el.defaultValue,
        placeholder: el.placeholder,
        validators: el.validators || [],
        addPanelText: el.addPanelText,
        removePanelText: el.removePanelText,
        minPanelCount: el.minPanelCount,
        panelCount: el.panelCount,
      };

      // Parse visibleIf → conditions
      if (el.visibleIf) {
        try {
          field.conditions = parseVisibleIf(el.visibleIf);
          field.conditionLogic = el.visibleIf.toLowerCase().includes(' or ') ? 'or' : 'and';
        } catch {
          console.warn('Failed to parse visibleIf:', el.visibleIf);
          field.conditions = [];
        }
      }

      // paneldynamic templateElements
      if (el.type === 'paneldynamic' && el.templateElements) {
        try {
          field.templateElements = el.templateElements
            .map((te: any, i: number) => elementToField(te, `template_${fallbackId}_${i}`))
            .filter(Boolean) as FieldConfig[];
        } catch {
          console.warn('Failed to parse templateElements');
          field.templateElements = [];
        }
      }

      return field;
    } catch (err) {
      console.error('elementToField failed for:', el, err);
      return null; // ← grąžina null, ne throw
    }
  };

  const parseVisibleIf = (expr: string): Condition[] => {
    const parts = expr.split(/ and | or /i);
    return parts.map(part => {

      const emptyMatch = part.match(/\{(?:panel\.)?(\w+)\}\s+empty/);
      const notEmptyMatch = part.match(/\{(?:panel\.)?(\w+)\}\s+notempty/);
      const eqMatch = part.match(/\{(?:panel\.)?(\w+)\}\s*=\s*'([^']+)'/);
      const neqMatch = part.match(/\{(?:panel\.)?(\w+)\}\s*!=\s*'([^']+)'/);
      const containsMatch = part.match(/\{(?:panel\.)?(\w+)\}\s+contains\s+(?:\['([^']+)'\]|'([^']+)')/);

      if (emptyMatch) return { fieldName: emptyMatch[1], operator: 'empty' as const, value: '' };
      if (notEmptyMatch) return { fieldName: notEmptyMatch[1], operator: 'notEmpty' as const, value: '' };
      if (eqMatch) return { fieldName: eqMatch[1], operator: 'equals' as const, value: eqMatch[2] };
      if (neqMatch) return { fieldName: neqMatch[1], operator: 'notEquals' as const, value: neqMatch[2] };

      if (containsMatch) {
        return {
          fieldName: containsMatch[1],
          operator: 'contains' as const,
          value: containsMatch[2] || containsMatch[3]
        };
      }

      return { fieldName: '', operator: 'equals' as const, value: '' };
    }).filter(c => c.fieldName);
  };

  // ─── PAGE MANAGEMENT ──────────────────────────────
  const addPage = () => {
    const newId = `page_${Date.now()}`;
    const newPage: Page = {
      id: newId,
      name: `page${pages.length + 1}`,
      title: `Page ${pages.length + 1}`,
      fields: [],
    };
    setPages(prev => [...prev, newPage]);
    setActivePageId(newId);
  };

  const deletePage = (pageId: string) => {
    if (pages.length === 1) { alert('Cannot delete the only page'); return; }
    if (!confirm('Delete this page and all its fields?')) return;
    const newPages = pages.filter(p => p.id !== pageId);
    setPages(newPages);
    if (activePageId === pageId) setActivePageId(newPages[0].id);
  };

  const updatePageTitle = (pageId: string, newTitle: string) => {
    setPages(prev => prev.map(p =>
      p.id === pageId ? { ...p, title: newTitle } : p
    ));
  };

  // ─── FIELD MANAGEMENT ─────────────────────────────
  const addField = () => {
    const newField: FieldConfig = {
      id: `field_${Date.now()}`,
      name: `field_${activePage.fields.length + 1}`,
      title: 'New Field',
      type: 'text',
      isRequired: false,
    };
    setEditingField(newField);
    setShowFieldEditor(true);
  };

  const editField = (field: FieldConfig) => {
    setEditingField(field);
    setShowFieldEditor(true);
  };

  const saveField = (updatedField: FieldConfig) => {
    setPages(prev => prev.map(p => {
      if (p.id !== activePageId) return p;
      const exists = p.fields.find(f => f.id === updatedField.id);
      return {
        ...p,
        fields: exists
          ? p.fields.map(f => f.id === updatedField.id ? updatedField : f)
          : [...p.fields, updatedField],
      };
    }));
    setShowFieldEditor(false);
    setEditingField(null);
  };

  const deleteField = (fieldId: string) => {
    if (!confirm('Delete this field?')) return;
    setPages(prev => prev.map(p =>
      p.id === activePageId
        ? { ...p, fields: p.fields.filter(f => f.id !== fieldId) }
        : p
    ));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const fields = [...activePage.fields];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= fields.length) return;
    [fields[index], fields[target]] = [fields[target], fields[index]];
    setPages(prev => prev.map(p =>
      p.id === activePageId ? { ...p, fields } : p
    ));
  };

  // ─── CONVERT TO SURVEYJS ──────────────────────────
  const fieldToElement = (field: FieldConfig, isTemplateField = false): any => {
    const el: any = {
      name: field.name,
      title: field.title,
      type: field.type,
      isRequired: field.isRequired,
    };

    if (field.description) el.description = field.description;
    if (field.placeholder) el.placeholder = field.placeholder;
    if (field.defaultValue) el.defaultValue = field.defaultValue;
    if (field.inputType && field.type === 'text') el.inputType = field.inputType;
    if (field.choices) el.choices = field.choices;
    if (field.validators?.length) el.validators = field.validators;

    // visibleIf iš conditions
    if (field.conditions?.length) {
      const logic = field.conditionLogic || 'and';
      el.visibleIf = field.conditions.map(c => {
        // ← FIX: Template fields naudoja {panel.fieldName}
        const fieldRef = isTemplateField ? `{panel.${c.fieldName}}` : `{${c.fieldName}}`;

        if (c.operator === 'empty') return `${fieldRef} empty`;
        if (c.operator === 'notEmpty') return `${fieldRef} notempty`;

        // ← CRITICAL: Checkbox contains reikia array check
        if (c.operator === 'contains') return `${fieldRef} contains ['${c.value}']`;

        if (c.operator === 'equals') return `${fieldRef} = '${c.value}'`;
        if (c.operator === 'notEquals') return `${fieldRef} != '${c.value}'`;
        return '';
      }).filter(Boolean).join(` ${logic} `);
    }

    // paneldynamic
    if (field.type === 'paneldynamic') {
      el.panelCount = field.panelCount || 1;
      el.minPanelCount = field.minPanelCount || 1;
      el.addPanelText = field.addPanelText || 'Add';
      el.removePanelText = field.removePanelText || 'Remove';
      if (field.panelCount) el.templateTitle = `Panel {panelIndex}`;
      // ← FIX: Pass isTemplateField = true
      el.templateElements = (field.templateElements || []).map(tf => fieldToElement(tf, true));
    }

    return el;
  };

  const convertToSurveyJS = () => {
    if (pages.length === 1) {
      return { elements: pages[0].fields.map(field => fieldToElement(field)) };
    }
    return {
      pages: pages.map(p => ({
        name: p.name,
        title: p.title,
        elements: p.fields.map(field => fieldToElement(field)),
      })),
    };
  };

  // ─── SAVE ─────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) { alert('Please enter a form title'); return; }
    const totalFields = pages.reduce((sum, p) => sum + p.fields.length, 0);
    if (totalFields === 0) { alert('Please add at least one field'); return; }

    setSaving(true);
    try {
      const surveyjs_json = convertToSurveyJS();
      const formData = { title, description, surveyjs_json, is_active: true };
      if (isEditMode) await formAPI.update(Number(id), formData);
      else await formAPI.create(formData);
      navigate('/admin/forms');
    } catch {
      alert('Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="builder-wrapper">

          {/* Header */}
          <div className="builder-header">
            <div className="builder-header-left">
              <h1>{isEditMode ? 'Edit Form' : 'Create New Form'}</h1>
              <div className="form-meta-inputs">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Form title *"
                  className="meta-input title-input"
                />
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="meta-input"
                />
              </div>
            </div>
            <div className="header-actions">
              <button className="btn-secondary" onClick={() => navigate('/admin/forms')}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Form'}
              </button>
            </div>
          </div>

          {/* Page Tabs */}
          <div className="page-tabs">
            {pages.map((page) => (
              <div
                key={page.id}
                className={`page-tab ${page.id === activePageId ? 'active' : ''}`}
                onClick={() => setActivePageId(page.id)}
              >
                {page.id === activePageId ? (
                  <input
                    className="page-tab-input"
                    value={page.title}
                    onChange={e => updatePageTitle(page.id, e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span>{page.title}</span>
                )}
                {pages.length > 1 && (
                  <button
                    className="page-tab-delete"
                    onClick={e => { e.stopPropagation(); deletePage(page.id); }}
                  >×</button>
                )}
              </div>
            ))}
            <button className="btn-add-page" onClick={addPage}>+ Add Page</button>
          </div>

          {/* Builder Content */}
          <div className="builder-content">

            {/* Left: Fields */}
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
                          <button onClick={() => moveField(index, 'up')} disabled={index === 0}>▲</button>
                          <span>{index + 1}</span>
                          <button onClick={() => moveField(index, 'down')} disabled={index === activePage.fields.length - 1}>▼</button>
                        </div>
                        <div className="field-details">
                          <strong>{field.title}</strong>
                          <div className="field-meta">
                            <span className="field-type-badge">{field.type}</span>
                            {field.isRequired && <span className="required-badge">Required</span>}
                            {field.conditions?.length ? <span className="condition-badge">⚡ Conditional</span> : null}
                            {field.validators?.length ? <span className="validator-badge">✓ Validated</span> : null}
                          </div>
                        </div>
                      </div>
                      <div className="field-actions">
                        <button onClick={() => editField(field)}>Edit</button>
                        <button onClick={() => deleteField(field.id)} className="delete">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Preview */}
            <div className="preview-panel">
              <h2>Live Preview - {activePage.title}</h2>
              <FormPreview
                surveyJson={convertToSurveyJS()}
                activePageIndex={pages.findIndex(p => p.id === activePageId)}
              />
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
      </div>

    </>

  );
}