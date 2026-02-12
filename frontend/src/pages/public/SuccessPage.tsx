// frontend/src/components/public/SuccessPage.tsx
import { useNavigate } from 'react-router-dom';
import '../../styles/pages/SuccessPage.css';

export default function SuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="success-page">
      <div className="success-container">
        <div className="success-icon">✅</div>
        <h1>Form Submitted Successfully!</h1>
        <p>Thank you for your submission. We have received your information.</p>
        
        <div className="success-actions">
          <button 
            className="btn-home"
            onClick={() => navigate('/')}
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}