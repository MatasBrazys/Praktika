import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formAPI,  } from '../../services/api'; //type FormDefinition
import FieldEditor from '../../components/admin/FieldEditor';
import FormPreview from '../../components/admin/FormPreview';
import '../../styles/pages/FormBuilderPage.css';
import Navbar from '../../components/shared/Navbar';

interface FieldConfig {
  id: string;
  name: string;
  title: string;
  type: string;
  isRequired: boolean;
  inputType?: string;
  choices?: string[];
}

export default function FormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [editingField, setEditingField] = useState<FieldConfig | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      loadForm();
    }
  }, [id]);

  const loadForm = async () => {
    try {
      const form = await formAPI.get(Number(id));
      setTitle(form.title);
      setDescription(form.description || '');

      // Convert SurveyJS JSON to our field format
      const loadedFields = form.surveyjs_json.elements.map((el: any, idx: number) => ({
        id: `field_${idx}`,
        name: el.name,
        title: el.title,
        type: el.type,
        isRequired: el.isRequired || false,
        inputType: el.inputType,
        choices: el.choices,
      }));
      setFields(loadedFields);
    } catch (err) {
      alert('Failed to load form');
      navigate('/admin/forms');
    }
  };

  const addField = () => {
    const newField: FieldConfig = {
      id: `field_${Date.now()}`,
      name: `field_${fields.length + 1}`,
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
    setFields(prev => {
      const existing = prev.find(f => f.id === updatedField.id);
      if (existing) {
        return prev.map(f => f.id === updatedField.id ? updatedField : f);
      } else {
        return [...prev, updatedField];
      }
    });
    setShowFieldEditor(false);
    setEditingField(null);
  };

  const deleteField = (fieldId: string) => {
    if (!confirm('Delete this field?')) return;
    setFields(prev => prev.filter(f => f.id !== fieldId));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setFields(newFields);
  };

  const convertToSurveyJS = () => {
    return {

      elements: fields.map(field => {
        const element: any = {
          name: field.name,
          title: field.title,
          type: field.type,
          isRequired: field.isRequired,
        };

        if (field.inputType) element.inputType = field.inputType;
        if (field.choices) element.choices = field.choices;

        return element;
      })
    };
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a form title');
      return;
    }

    if (fields.length === 0) {
      alert('Please add at least one field');
      return;
    }

    setSaving(true);
    try {
      const surveyjs_json = convertToSurveyJS();
      const formData = {
        title,
        description,
        surveyjs_json,
        is_active: true,
      };

      if (isEditMode) {
        await formAPI.update(Number(id), formData);
      } else {
        await formAPI.create(formData);
      }

      navigate('/admin/forms');
    } catch (err) {
      alert('Failed to save form');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="page-container">
        <div className="builder-wrapper">
          <div className="builder-header">
            <h1>{isEditMode ? 'Edit Form' : 'Create New Form'}</h1>
            <div className="header-actions">
              <button className="btn-secondary" onClick={() => navigate('/admin/forms')}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Form'}
              </button>
            </div>
          </div>

          <div className="builder-content">
            {/* Left Panel: Form Configuration */}
            <div className="config-panel">
              <div className="form-details">
                <h2>Form Details</h2>
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter form title"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
              </div>

              <div className="fields-section">
                <div className="section-header">
                  <h2>Fields ({fields.length})</h2>
                  <button className="btn-add" onClick={addField}>
                    + Add Field
                  </button>
                </div>

                {fields.length === 0 ? (
                  <div className="empty-fields">
                    <p>No fields added yet</p>
                    <button onClick={addField}>Add your first field</button>
                  </div>
                ) : (
                  <div className="fields-list">
                    {fields.map((field, index) => (
                      <div key={field.id} className="field-item">
                        <div className="field-info">
                          <div className="field-order">
                            <button
                              onClick={() => moveField(index, 'up')}
                              disabled={index === 0}
                            >
                              ▲
                            </button>
                            <span>{index + 1}</span>
                            <button
                              onClick={() => moveField(index, 'down')}
                              disabled={index === fields.length - 1}
                            >
                              ▼
                            </button>
                          </div>
                          <div className="field-details">
                            <strong>{field.title}</strong>
                            <div className="field-meta">
                              <span>Type: {field.type}</span>
                              {field.isRequired && <span className="required-badge">Required</span>}
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
            </div>

            {/* Right Panel: Live Preview */}
            <div className="preview-panel">
              <h2>Live Preview</h2>
              <FormPreview surveyJson={convertToSurveyJS()} />
            </div>
          </div>
        </div>

        {/* Field Editor Modal */}
        {showFieldEditor && editingField && (
          <FieldEditor
            field={editingField}
            onSave={saveField}
            onCancel={() => {
              setShowFieldEditor(false);
              setEditingField(null);
            }}
          />
        )}
      </div>
    </>
  );
}