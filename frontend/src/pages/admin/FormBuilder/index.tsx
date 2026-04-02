// src/pages/admin/FormBuilder/index.tsx
// Form builder page — UI only.
// All state and logic handled by useFormPages and useFormFields hooks.

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { formAPI } from '../../../services/api'
import { useToast } from '../../../contexts/ToastContext'
import { extractErrorMessage } from '../../../lib/apiClient'
import FieldEditor from '../../../components/admin/FieldEditor'
import FormPreview from '../../../components/admin/FormPreview'
import { convertToSurveyJS } from './utils/surveyConverter'
import { elementToField } from './utils/visibleIfParser'
import { useFormPages } from './hooks/useFormPages'
import { useFormFields } from './hooks/useFormFields'
import type { FieldConfig, Page } from '../../../types/form-builder.types'
import '../../../styles/pages/admin/form-builder.css'
import '../../../styles/components/modal.css'

// SurveyJS JSON shape — only what we read back when loading an existing form
type StoredSurveyJson = {
  pages?: Array<{ name?: string; title?: string; elements?: unknown[] }>
  elements?: unknown[]
}

export default function FormBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isEditMode = !!id

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [editingField, setEditingField] = useState<FieldConfig | null>(null)
  const [showFieldEditor, setShowFieldEditor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEditMode)  // true only when editing

  const {
    pages, setPages, activePage, activePageId, setActivePageId,
    addPage, deletePage, updatePageTitle, resetPages,
  } = useFormPages()

  const { saveField, deleteField, moveField, buildNewField } = useFormFields(activePageId, setPages)

  const loadForm = useCallback(async () => {
    try {
      setLoading(true)
      const form = await formAPI.get(Number(id))
      setTitle(form.title)
      setDescription(form.description ?? '')

      const json = form.surveyjs_json as StoredSurveyJson
      const rawPages = json.pages ?? [{ name: 'page1', title: 'Page 1', elements: json.elements ?? [] }]

      const loadedPages: Page[] = rawPages.map((p, pageIndex) => ({
        id: `page_${pageIndex + 1}`,
        name: p.name ?? `page${pageIndex + 1}`,
        title: p.title ?? `Page ${pageIndex + 1}`,
        // elementToField is in the utils/any-allowed zone — cast is intentional
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fields: (p.elements ?? []).map((el, elIndex) => elementToField(el as any, `field_${pageIndex}_${elIndex}`))
          .filter((f): f is FieldConfig => f !== null),
      }))

      resetPages(loadedPages)
    } catch (err) {
      toast.error('Failed to load form', extractErrorMessage(err))
      navigate('/admin/forms')
    }
    finally{
      setLoading(false)
    }
  }, [id, toast, navigate, resetPages])

  useEffect(() => {
    if (isEditMode) loadForm()
  }, [isEditMode, loadForm])

  const handleAddField = () => {
    setEditingField(buildNewField(activePage.fields.length))
    setShowFieldEditor(true)
  }

  const handleSaveField = (updated: FieldConfig) => {
    saveField(updated)
    setShowFieldEditor(false)
    setEditingField(null)
  }

  const handleSave = async () => {
    if (!title.trim()) { toast.warning('Title required', 'Please enter a form title.'); return }
    const totalFields = pages.reduce((sum, page) => sum + page.fields.length, 0)
    if (!totalFields) { toast.warning('No fields', 'Add at least one field before saving.'); return }

    setSaving(true)
    try {
      const surveyjs_json = convertToSurveyJS(pages)
      if (isEditMode) await formAPI.update(Number(id), { title, description, surveyjs_json })
      else await formAPI.create({ title, description, surveyjs_json, is_active: true })
      toast.success(isEditMode ? 'Form updated' : 'Form created', `"${title}" has been saved.`)
      navigate('/admin/forms')
    } catch (err) {
      toast.error('Save failed', extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const allFields = pages.flatMap(p => p.fields)
  if (loading) return (

    <div className="page-container-admin">
      <div className="page-loading">
        <div className="spinner" />
        Loading form...
      </div>
    </div>
)

  return (
    <>
      
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
                  <button className="page-tab-delete" onClick={e => { e.stopPropagation(); deletePage(page.id) }}>×</button>
                )}
              </div>
            ))}
            <button className="btn-add-page" onClick={addPage}>+ Add Page</button>
          </div>

          <div className="builder-content">
            <div className="config-panel">
              <div className="section-header">
                <h2>Fields ({activePage.fields.length})</h2>
                <button className="btn-add" onClick={handleAddField}>+ Add Field</button>
              </div>

              {activePage.fields.length === 0 ? (
                <div className="empty-fields">
                  <p>No fields on this page</p>
                  <button onClick={handleAddField}>Add your first field</button>
                </div>
              ) : (
                <div className="fields-list">
                  {activePage.fields.map((field, index) => (
                    <div key={field.id} className="field-item">
                      <div className="field-info">
                        <div className="field-order">
                          <button onClick={() => moveField(activePage.fields, index, 'up')} disabled={index === 0}>▲</button>
                          <span>{index + 1}</span>
                          <button onClick={() => moveField(activePage.fields, index, 'down')} disabled={index === activePage.fields.length - 1}>▼</button>
                        </div>
                        <div className="field-details">
                          <strong>{field.title}</strong>
                          <div className="field-meta">
                            <span className="field-type-badge">{field.type === 'crmlookup' ? '🔍 CRM Lookup' : field.type}</span>
                            {field.isRequired && <span className="required-badge">Required</span>}
                            {field.conditions?.length ? <span className="condition-badge">⚡ Conditional</span> : null}
                            {field.validators?.length ? <span className="validator-badge">✓ Validated</span> : null}
                            {field.allowBulkImport && <span className="condition-badge">📥 Bulk Import</span>}
                          </div>
                        </div>
                      </div>
                      <div className="field-actions">
                        <button onClick={() => { setEditingField(field); setShowFieldEditor(true) }}>Edit</button>
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
          onSave={handleSaveField}
          onCancel={() => { setShowFieldEditor(false); setEditingField(null) }}
        />
      )}
    </>
  )
}
