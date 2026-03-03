import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/shared/Navbar';
import '../styles/pages/home.css';

export default function Home() {
  const { isAdmin } = useAuth();

  return (
    <>
      <Navbar />
      <div className="home-page">
        <div className="home-container">
          <div className="welcome-section">
            <h1>IT Services Registration System</h1>
            <p className="subtitle">Internal form management for client service requests</p>
          </div>

          <div className="quick-actions">
            <div className="action-card">
              <div className="card-icon">📝</div>
              <h3>Fill Forms</h3>
              <p>Register clients to IT service plans</p>
              <Link to="/user/forms" className="btn-action">
                Go to Forms →
              </Link>
            </div>

            <div className={`action-card ${!isAdmin ? 'admin-only' : ''}`}>
              <div className="card-icon">⚙️</div>
              <h3>Manage Forms</h3>
              <p>Create and configure service request forms</p>
              <Link to="/admin/forms" className="btn-action">
                Admin Panel →
              </Link>
            </div>
          </div>

          <div className="info-section">
            <h2 className="info-section-title">System Overview</h2>
            <div className="info-grid">
              <div className="info-item">
                <strong>Purpose:</strong>
                <span>Streamline IT service client registration process</span>
              </div>
              <div className="info-item">
                <strong>Users:</strong>
                <span>Managers register clients, Admins configure forms</span>
              </div>
              <div className="info-item">
                <strong>Workflow:</strong>
                <span>Fill form → Auto-notify IT team → Process request</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}