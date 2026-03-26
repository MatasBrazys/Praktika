// src/pages/Home.tsx

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/shared/Navbar'
import '../styles/pages/home.css'

const FEATURES = [
  {
    label: 'Smart Forms',
    desc:  'Dynamic fields, conditional logic, repeatable groups and real-time validation — built for complex IT service requests.',
  },
  {
    label: 'API Lookup',
    desc:  'Auto-fill form fields from Netbox, CRM or any internal API. No manual copy-paste, no data errors.',
  },
  {
    label: 'Pipeline Ready',
    desc:  'Every submission feeds directly into IT provisioning workflows. Structured data, every time.',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  if (!user) return null

  return (
    <>
      <Navbar />
      <div className="home-page">

        {/* ── Hero ── */}
        <section className="home-hero">
          <div className="home-hero__geo" aria-hidden />
          <div className="home-hero__inner">
            <span className="home-hero__eyebrow">IT Services Portal</span>
            <h1 className="home-hero__title">
              Client onboarding,<br />done right.
            </h1>
            <p className="home-hero__sub">
              Structured forms that connect directly to your infrastructure pipelines.
            </p>
            <div className="home-hero__actions">
              {isAdmin ? (
                <>
                  <button className="home-btn home-btn--primary" onClick={() => navigate('/admin/forms')}>
                    Manage Forms
                  </button>
                  <button className="home-btn home-btn--ghost" onClick={() => navigate('/user/forms')}>
                    Fill a Form
                  </button>
                </>
              ) : (
                <button className="home-btn home-btn--primary" onClick={() => navigate('/user/forms')}>
                  Browse Forms
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="home-features">
          <div className="home-features__inner">
            {FEATURES.map((f, i) => (
              <div key={i} className="home-feature">
                <div className="home-feature__num">{String(i + 1).padStart(2, '0')}</div>
                <div className="home-feature__body">
                  <h3>{f.label}</h3>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </>
  )
}