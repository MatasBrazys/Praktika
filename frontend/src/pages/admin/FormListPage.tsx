import { useState, useEffect } from 'react';
import { formAPI, type FormDefinition } from '../../services/api';
import '../../styles/pages/FormListPage.css';
import Navbar from '../../components/shared/Navbar';
export default function FormList() {
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      const data = await formAPI.list();
      setForms(data);
      setError('');
    } catch (err) {
      setError('Failed to load forms');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this form?')) return;
    
    try {
      await formAPI.delete(id);
      setForms(forms.filter(f => f.id !== id));
    } catch (err) {
      alert('Failed to delete form');
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      await formAPI.toggleActive(id);
      loadForms();
    } catch (err) {
      alert('Failed to toggle form status');
    }
  };

  if (loading) return <div className="page-loading">Loading forms...</div>;
  if (error) return <div className="page-error">{error}</div>;

  return (
    <>
    <Navbar />
    <div className="page-container">
      <div className="form-list-wrapper">
        <div className="page-header">
          <div>
            <h1>Form Management</h1>
            <p className="subtitle">Create and manage your forms</p>
          </div>
          <button className="btn-create" onClick={() => window.location.href = '/admin/form-builder'}>
            + Create New Form
          </button>
        </div>

        {forms.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h2>No forms yet</h2>
            <p>Create your first form to get started</p>
            <button className="btn-create" onClick={() => window.location.href = '/admin/form-builder'}>
              Create Form
            </button>
          </div>
        ) : (
          <div className="forms-grid">
            {forms.map(form => (
              <div key={form.id} className={`form-card ${!form.is_active ? 'inactive' : ''}`}>
                <div className="card-header">
                  <h3>{form.title}</h3>
                  <span className={`status ${form.is_active ? 'active' : 'inactive'}`}>
                    {form.is_active ? '● Active' : '○ Inactive'}
                  </span>
                </div>
                
                <p className="card-description">{form.description || 'No description provided'}</p>
                
                <div className="card-meta">
                  <span>📝 {form.surveyjs_json?.elements?.length || 0} fields</span>
                  <span>📅 {new Date(form.created_at!).toLocaleDateString()}</span>
                </div>

                <div className="card-actions">
                <button 
                    className="btn-edit"
                    onClick={() => window.location.href = `/admin/form-builder/${form.id}`}
                >
                    Edit
                </button>
                <button 
                    className="btn-view"
                    onClick={() => window.location.href = `/admin/forms/${form.id}/submissions`}
                >
                    📊 Submissions
                </button>
                <button 
                    className={`btn-toggle ${form.is_active ? '' : 'activate'}`}
                    onClick={() => handleToggleActive(form.id!)}
                >
                    {form.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button 
                    className="btn-delete"
                    onClick={() => handleDelete(form.id!)}
                >
                    Delete
                </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
    
  );
}