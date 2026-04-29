// frontend/src/components/public/SuccessPage.tsx
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import '../styles/pages/public/success.css';

export default function Success() {
  const navigate = useNavigate();
  const location = useLocation();
  const formTitle = (location.state as { formTitle?: string })?.formTitle;

  return (
    <div className="success-page">
      <div className="success-container">
        <div className="success-icon"><CheckCircle2 size={64} strokeWidth={1.5} /></div>
        <h1>Form Submitted Successfully!</h1>
        {formTitle && <p className="form-title-badge">{formTitle}</p>}
        <p>Your submission has been sent for review. You will be notified once it's processed.</p>
        
        <div className="success-actions">
          <button 
            className="btn-home"
            onClick={() => navigate('/user/submissions')}
          >
            View My Submissions
          </button>
          <button 
            className="btn-home"
            onClick={() => navigate('/user/forms')}
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}