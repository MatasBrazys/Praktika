// src/pages/user/Profile/index.tsx

import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import ProfileTab from './tabs/ProfileTab'
import StatsTab   from './tabs/StatsTab'
import './profile.css'

type Tab = 'profile' | 'stats'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'profile', label: 'Profile',    icon: '👤' },
  { id: 'stats',   label: 'Statistics', icon: '📊' },
]

export default function ProfilePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  if (!user) return null

  const initials = user.username.slice(0, 2).toUpperCase()

  return (
    <div className="profile-page">
      <div className="profile-container">

        {/* ── Sidebar ── */}
        <aside className="profile-sidebar">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">{initials}</div>
            <div>
              <p className="profile-username">{user.username}</p>
              <p className="profile-role">{user.role}</p>
            </div>
          </div>

          <nav className="profile-nav">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`profile-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Content ── */}
        <main className="profile-content">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'stats'   && <StatsTab />}
        </main>

      </div>
    </div>
  )
}