import Navbar from '../components/shared/Navbar';
import '../styles/pages/home.css';

export default function Home() {
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
              <a href="/user/forms" className="btn-action">
                Go to Forms →
              </a>
            </div>

            <div className="action-card admin-only">
              <div className="card-icon">⚙️</div>
              <h3>Manage Forms</h3>
              <p>Create and configure service request forms</p>
              <a href="/admin/forms" className="btn-action">
                Admin Panel →
              </a>
            </div>
          </div>

          <div className="info-section">
            <h2>System Overview</h2>
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