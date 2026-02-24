import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../../styles/components/navbar.css';

interface NavbarProps {
  userRole?: 'admin' | 'user'; // Will be used later for auth
}

export default function Navbar({ userRole = 'admin' }: NavbarProps) {
  const location = useLocation();
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-brand">
          <a href="/">
            <img 
              src="https://www.datagroup.de/hubfs/dg-logo-standard-cmyk.svg" 
              alt="DataGroup Logo"
              className="brand-logo"
            />
          </a>
        </div>

        {/* Navigation */}
        <div className="navbar-menu">
          {/* Home */}
          <a href="/" className={isActive('/') && location.pathname === '/' ? 'active' : ''}>
            🏠 Home
          </a>

          {/* Admin Section - Only visible to admins */}
          {userRole === 'admin' && (
            <div 
              className="nav-dropdown"
              onMouseEnter={() => setShowAdminMenu(true)}
              onMouseLeave={() => setShowAdminMenu(false)}
            >
              <button className={isActive('/admin') ? 'active' : ''}>
                ⚙️ Admin
              </button>
              {showAdminMenu && (
                <div className="dropdown-menu">
                  <a href="/admin/forms">📋 Manage Forms</a>
                  <a href="/admin/form-builder">➕ Create Form</a>
                </div>
              )}
            </div>
          )}

          {/* User Section - Available to all */}
          <div 
            className="nav-dropdown"
            onMouseEnter={() => setShowUserMenu(true)}
            onMouseLeave={() => setShowUserMenu(false)}
          >
            <button className={isActive('/user') ? 'active' : ''}>
              👤 Forms
            </button>
            {showUserMenu && (
              <div className="dropdown-menu">
                <a href="/user/forms">📝 Fill Forms</a>
                <a href="/user/submissions">📊 My Submissions</a>
              </div>
            )}
          </div>
        </div>

        {/* User Info (placeholder for future) */}
        <div className="navbar-user">
          <span className="user-name">Admin</span>
        </div>
      </div>
    </nav>
  );
}