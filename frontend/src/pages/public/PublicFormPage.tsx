// frontend/src/components/public/PublicForm.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import "survey-core/survey-core.min.css";
import { formAPI } from '../../services/api';
import '../../styles/pages/PublicFormPage.css';

export default function PublicFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadForm();
  }, [id]);

  const loadForm = async () => {
    try {
      setLoading(true);
      const formData = await formAPI.get(Number(id));
      
      if (!formData.is_active) {
        setError('This form is not currently active');
        return;
      }
      
      setForm(formData);
    } catch (err) {
      setError('Form not found');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (survey: any) => {
  try {
    await formAPI.submitForm(form.id, form.title, survey.data); // ← naudoja API_URL
    navigate(`/user/forms/${id}/success`);
  } catch (err) {
    alert('Failed to submit form. Please try again.');
  }
};

  if (loading) {
    return (
      <div className="public-page">
        <div className="loading-spinner">Loading form...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-page">
        <div className="error-box">
          <h2>❌ {error}</h2>
          <p>Please contact support if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  const survey = new Model(form.surveyjs_json);
  survey.onComplete.add(handleComplete);

  return (
    <div className="public-page">
      <div className="public-form-container">
        <div className="form-header">
          <h1>{form.title}</h1>
          {form.description && <p className="form-description">{form.description}</p>}
        </div>
        
        <div className="survey-wrapper">
          <Survey model={survey} />
        </div>
      </div>
    </div>
  );
}