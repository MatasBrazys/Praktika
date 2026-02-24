import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import "survey-core/survey-core.min.css";
import { formAPI, crmAPI } from '../../services/api';
import '../../styles/pages/public/form.css';

function attachCRMLookup(surveyModel: Model) {
  // Block submission if CRM ID is filled but lookup hasn't resolved
  surveyModel.onValidateQuestion.add((sender, options) => {
    const allQuestions = sender.getAllQuestions();
    const nameQ = allQuestions.find((q: any) => q.name === `${options.name}_name`);
    if (!nameQ) return; // not a CRM field

    const crmIdValue = (options.value || '').trim();
    const nameValue  = (nameQ.value || '').trim();

    if (crmIdValue && !nameValue) {
      options.error = 'Please enter a valid CRM ID — client not found.';
    }
  });

  surveyModel.onValueChanged.add(async (sender, options) => {
    const allQuestions = sender.getAllQuestions();

    // If a companion _name field exists, this is a CRM lookup field
    const nameQ = allQuestions.find((q: any) => q.name === `${options.name}_name`);
    if (!nameQ) return;

    const prefix = options.name;
    const crmId = (options.value || '').trim().toUpperCase();

    // Clear all 4 companion fields
    ['name', 'street', 'postcode', 'state'].forEach(suffix => {
      const q = allQuestions.find((q: any) => q.name === `${prefix}_${suffix}`);
      if (q) q.value = '';
    });

    if (!crmId) {
      nameQ.description = '';
      return;
    }

    nameQ.description = '⏳ Looking up CRM ID…';

    try {
      const result = await crmAPI.lookup(crmId);

      if (!result.found) {
        nameQ.description = `❌ CRM ID "${crmId}" not found`;
        return;
      }

      (['name', 'street', 'postcode', 'state'] as const).forEach(suffix => {
        const q = allQuestions.find((q: any) => q.name === `${prefix}_${suffix}`);
        if (q) q.value = result[suffix];
      });

      nameQ.description = '✅ Client found';
    } catch {
      nameQ.description = '⚠️ CRM lookup failed';
    }
  });
}

export default function Form() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState<any>(null);
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
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

      // ← CRITICAL: Model created ONCE here, not in render
      const model = new Model(formData.surveyjs_json);
      attachCRMLookup(model);
      model.onComplete.add(async (s) => {
        try {
          if (!formData.id) {
            alert('Form ID is missing.');
            return;
          }
          await formAPI.submitForm(formData.id, formData.title, s.data);
          navigate(`/user/forms/${id}/success`);
        } catch {
          alert('Failed to submit form. Please try again.');
        }
      });

      setForm(formData);
      setSurveyModel(model);
    } catch {
      setError('Form not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="public-page">
      <div className="loading-spinner">Loading form...</div>
    </div>
  );

  if (error) return (
    <div className="public-page">
      <div className="error-box">
        <h2>❌ {error}</h2>
        <p>Please contact support if you believe this is an error.</p>
      </div>
    </div>
  );

  if (!surveyModel) return null;

  return (
    <div className="public-page">
      <div className="public-form-container">
        <div className="form-header">
          <h1>{form.title}</h1>
          {form.description && <p className="form-description">{form.description}</p>}
        </div>
        <div className="survey-wrapper">
          <Survey model={surveyModel} />
        </div>
      </div>
    </div>
  );
}