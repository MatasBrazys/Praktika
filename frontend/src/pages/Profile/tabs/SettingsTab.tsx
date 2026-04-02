// src/pages/user/Profile/tabs/SettingsTab.tsx

import { useState, useEffect } from 'react'

type Theme   = 'light' | 'dark'
type Density = 'comfortable' | 'compact'

export default function SettingsTab() {
  const [theme,   setTheme]   = useState<Theme>(() =>
    (localStorage.getItem('pref_theme') as Theme) ?? 'light'
  )
  const [density, setDensity] = useState<Density>(() =>
    (localStorage.getItem('pref_density') as Density) ?? 'comfortable'
  )

  useEffect(() => {
    localStorage.setItem('pref_theme', theme)
    document.body.classList.toggle('theme-dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    localStorage.setItem('pref_density', density)
    document.body.dataset.density = density
  }, [density])

  return (
    <div className="profile-section">
      <div className="profile-section-header">
        <h2>Settings</h2>
        <p>Preferences are saved locally in your browser.</p>
      </div>

      <div className="settings-group">
        <label className="settings-label">Theme</label>
        <div className="settings-options">
          {(['light', 'dark'] as Theme[]).map(t => (
            <button
              key={t}
              className={`settings-option-btn ${theme === t ? 'active' : ''}`}
              onClick={() => setTheme(t)}
            >
              {t === 'light' ? '☀️ Light' : '🌙 Dark'}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-group">
        <label className="settings-label">Form Density</label>
        <div className="settings-options">
          {(['comfortable', 'compact'] as Density[]).map(d => (
            <button
              key={d}
              className={`settings-option-btn ${density === d ? 'active' : ''}`}
              onClick={() => setDensity(d)}
            >
              {d === 'comfortable' ? '📐 Comfortable' : '📦 Compact'}
            </button>
          ))}
        </div>
        <small>Affects form field spacing.</small>
      </div>
    </div>
  )
}