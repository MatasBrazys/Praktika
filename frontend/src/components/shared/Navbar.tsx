import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../../styles/components/navbar.css';

interface NavbarProps {
  userRole?: 'admin' | 'user';
}

function NavDropdown({ label, active, children }: {
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timerRef.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      className="nav-dropdown"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button className={active ? 'active' : ''}>
        {label} ▾
      </button>
      {open && (
        <div className="dropdown-menu">
          <div className="dropdown-menu-inner">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar({ userRole = 'admin' }: NavbarProps) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="navbar">
      <div className="navbar-container">

        <div className="navbar-brand">
          <a href="/">
            <img
              src="https://www.datagroup.de/hubfs/dg-logo-standard-cmyk.svg"
              alt="DataGroup Logo"
              className="brand-logo"
            />
          </a>
        </div>

        <div className="navbar-menu">
          <a href="/" className={location.pathname === '/' ? 'active' : ''}>
            Home
          </a>

          {userRole === 'admin' && (
            <NavDropdown label="Admin" active={isActive('/admin')}>
              <a href="/admin/forms">Manage Forms</a>
              <a href="/admin/form-builder">Create Form</a>
            </NavDropdown>
          )}

          {/* My Submissions hidden until page is implemented */}
          <NavDropdown label="Forms" active={isActive('/user')}>
            <a href="/user/forms">Fill Forms</a>
            {/* TODO: <a href="/user/submissions">My Submissions</a> */}
          </NavDropdown>
        </div>

        <div className="navbar-user">
          <div className="user-chip">
            <div className="user-avatar">A</div>
            <span className="user-name">Admin</span>
          </div>
        </div>

      </div>
    </nav>
  );
}