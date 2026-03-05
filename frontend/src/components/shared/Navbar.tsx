// src/components/shared/Navbar.tsx

import { useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/components/navbar.css';

function NavDropdown({ label, active, children }: {
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div
      className="nav-dropdown"
      onMouseEnter={() => { if (timer.current) clearTimeout(timer.current); setOpen(true); }}
      onMouseLeave={() => { timer.current = setTimeout(() => setOpen(false), 150); }}
    >
      <button className={active ? 'active' : ''} type="button">
        {label} ▾
      </button>
      {open && (
        <div className="dropdown-menu">
          <div className="dropdown-menu-inner">{children}</div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, isAdmin, isAuthenticated, logout } = useAuth();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? '?';

  return (
    <nav className="navbar">
      <div className="navbar-container">

        <div className="navbar-brand">
          <Link to="/">
            <img
              src="https://www.datagroup.de/hubfs/dg-logo-standard-cmyk.svg"
              alt="DataGroup"
              className="brand-logo"
            />
          </Link>
        </div>

        <div className="navbar-menu">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Home
          </Link>

          {isAdmin && (
            <NavDropdown label="Admin" active={isActive('/admin')}>
              <Link to="/admin/forms">Manage Forms</Link>
              <Link to="/admin/form-builder">Create Form</Link>
            </NavDropdown>
          )}

          {isAuthenticated && (
            <NavDropdown label="Forms" active={isActive('/user')}>
              <Link to="/user/forms">Fill Forms</Link>
            </NavDropdown>
          )}
        </div>

        <div className="navbar-user">
          {isAuthenticated ? (
            <>
              <div className="user-chip">
                <div className="user-avatar">{initials}</div>
                <span className="user-name">{user?.username}</span>
              </div>
              <button type="button" className="btn-signout" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-signin-nav">Sign in</Link>
          )}
        </div>

      </div>
    </nav>
  );
}