// src/pages/LoginPage.tsx

import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { extractErrorMessage } from '../lib/apiClient';
import '../styles/pages/login.css';

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  // If user was redirected here from a protected route, go back after login
  const from = (location.state as { from?: Location })?.from?.pathname || '/';

  // Show session expired hint if redirected by apiClient interceptor
  const sessionExpired = new URLSearchParams(location.search).get('reason') === 'session_expired';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.warning('Missing fields', 'Please enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      await login({ username: username.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      toast.error('Login failed', extractErrorMessage(err, 'Incorrect username or password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-brand">
          <img
            src="https://www.datagroup.de/hubfs/dg-logo-standard-cmyk.svg"
            alt="DataGroup"
            className="login-logo"
          />
        </div>

        <div className="login-header">
          <h1>Sign in</h1>
          <p>IT Services Portal</p>
        </div>

        {sessionExpired && (
          <div className="login-banner login-banner--warning">
            Your session expired. Please sign in again.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. admin"
              autoComplete="username"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

      </div>
    </div>
  );
}