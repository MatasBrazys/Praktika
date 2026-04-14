// src/pages/user/Profile/tabs/ProfileTab.tsx

import { useAuth } from '../../../contexts/AuthContext'

export default function ProfileTab() {
  const { user } = useAuth()

  return (
    <div className="profile-section">
      <div className="profile-section-header">
        <h2>Profile Information</h2>
        <p>Your account details from the organization directory.</p>
      </div>

      <div className="profile-field">
        <label>Username</label>
        <input type="text" value={user?.username ?? ''} disabled />
      </div>

      <div className="profile-field">
        <label>Email</label>
        <input type="text" value={user?.email ?? ''} disabled />
      </div>

      <div className="profile-field">
        <label>Role</label>
        <input type="text" value={user?.role ?? ''} disabled />
      </div>

      <small style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
        To update your details, contact your IT administrator.
      </small>
    </div>
  )
}