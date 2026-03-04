// src/pages/admin/FormBuilder/index.tsx
// Form builder page — handles creating and editing forms with a live preview.
// State management and SurveyJS conversion are delegated to hooks and utils.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formAPI } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { extractErrorMessage } from '../../../lib/apiClient';
import Navbar from '../../../components/shared/Navbar';
import FieldEditor from '../../../components/admin/FieldEditor';
import FormPreview from '../../../components/admin/FormPreview';
import { convertToSurveyJS} from './utils/surveyConverter';
import { elementToField } from './utils/visibleIfParser';
import type { FieldConfig, Page } from '../../../types/form-builder.types';
import '../../../styles/pages/admin/form-builder.css';
import '../../../styles/components/modal.css';

export default function FormBuilder() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { toast } = useToast();
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
      const rawPages = json.pages ?? [{ name: 'page1', title: 'Page 1', elements: json.elements || [] }];

      const loadedPages: Page[] = rawPages.map((p: any, pageIndex: number) => ({
        id:     `page_${pageIndex + 1}`,
        name:   p.name  || `page${pageIndex + 1}`,
        title:  p.title || `Page ${pageIndex + 1}`,
        fields: (p.elements || [])
          .map((el: any, elIndex: number) => elementToField(el, `field_${pageIndex}_${elIndex}`))
          .filter(Boolean) as FieldConfig[],
      }));

      setPages(loadedPages);
      setActivePageId(loadedPages[0].id);
    } catch (err) {
      toast.error('Failed to load form', extractErrorMessage(err));
      navigate('/admin/forms');
    }
  };

  // ── Page management ─────────────────────────────────────────────────────────

  const addPage = () => {
    const newId = `page_${Date.now()}`;
    setPages(prev => [...prev, { id: newId, name: `page${pages.length + 1}`, title: `Page ${pages.length + 1}`, fields: [] }]);
    setActivePageId(newId);
  };

  const deletePage = (pageId: string) => {
    if (pages.length === 1) { toast.warning('Cannot delete', 'At least one page is required.'); return; }
    if (!confirm('Delete this page and all its fields?')) return;
    const remaining = pages.filter(p => p.id !== pageId);
    setPages(remaining);
    if (activePageId === pageId) setActivePageId(remaining[0].id);
  };

  const updatePageTitle = (pageId: string, newTitle: string) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, title: newTitle } : p));
  };

  // ── Field management ────────────────────────────────────────────────────────

  const addField = () => {
    setEditingField({
      id: `field_${Date.now()}`,
      name: `field_${activePage.fields.length + 1}`,
      title: 'New Field',
      type: 'text',
      isRequired: false,
    });
    setShowFieldEditor(true);
  };

  // Adds the field if it's new, or replaces it if it already exists
  const saveField = (updated: FieldConfig) => {
    setPages(prev => prev.map(page => {
      if (page.id !== activePageId) return page;

      const fieldExists = page.fields.some(f => f.id === updated.id);
      const updatedFields = fieldExists
        ? page.fields.map(f => f.id === updated.id ? updated : f)
        : [...page.fields, updated];

      return { ...page, fields: updatedFields };
    }));
    setShowFieldEditor(false);
    setEditingField(null);
  };

  const deleteField = (fieldId: string) => {
    if (!confirm('Delete this field?')) return;
    setPages(prev => prev.map(page =>
      page.id === activePageId
        ? { ...page, fields: page.fields.filter(f => f.id !== fieldId) }
        : page
    ));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const fields = [...activePage.fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    [fields[index], fields[targetIndex]] = [fields[targetIndex], fields[index]];
    setPages(prev => prev.map(page => page.id === activePageId ? { ...page, fields } : page));
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!title.trim()) { toast.warning('Title required', 'Please enter a form title.'); return; }
    const totalFields = pages.reduce((sum, page) => sum + page.fields.length, 0);
    if (!totalFields) { toast.warning('No fields', 'Add at least one field before saving.'); return; }

    setSaving(true);
    try {
      const surveyjs_json = convertToSurveyJS(pages);
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
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Form'}</button>
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
                            {field.isRequired         && <span className="required-badge">Required</span>}
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
              <FormPreview
                surveyJson={convertToSurveyJS(pages)}
                activePageIndex={pages.findIndex(p => p.id === activePageId)}
              />
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