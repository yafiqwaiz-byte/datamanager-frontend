import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { authService } from '../services/authService';
import AuthCircuitGrid from '../components/AuthCircuitGrid';
import '../styles/Auth.css';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export default function SignIn() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showRoleModal, setShowRoleModal]       = useState(false);
  const [pendingGoogleToken, setPendingGoogleToken] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRedirect = (role, newUser) => {
    if (newUser) { window.location.href = '/complete-profile'; return; }
    if (role === 'ADMIN') {
        window.location.href = '/admin-dashboard';
    } else if (role === 'STAFF') {
        window.location.href = '/staff-home';
    } else {
        window.location.href = '/user-home';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.username || !formData.password) {
        setError('Please fill in all fields');
        return;
      }
      const result = await authService.signin(formData.username, formData.password);
      handleRedirect(result.role, false);
    } catch (err) {
      setError(err.message || 'Signin failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (credentialResponse) => {
    setPendingGoogleToken(credentialResponse.credential);
    setShowRoleModal(true);
  };

  const handleRoleSelect = async (selectedRole) => {
    setShowRoleModal(false);
    setLoading(true);
    setError('');
    try {
      const result = await authService.signinWithGoogle(pendingGoogleToken, selectedRole);

      if (!result.newUser && result.role !== selectedRole) {
        setError(
          `This Google account is already registered as ${result.role}. ` +
          `Please use a different account to sign in as ${selectedRole}.`
        );
        return;
      }

      handleRedirect(result.role, result.newUser);
    } catch (err) {
      setError(err.message || 'Google signin failed. Please try again.');
    } finally {
      setLoading(false);
      setPendingGoogleToken(null);
    }
  };

  const handleGoogleError = () => setError('Google signin failed. Please try again.');

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="auth-container">

        {/* ── LEFT — illustrated panel ──────────────────────────────────── */}
        <div className="auth-panel">
          <AuthCircuitGrid />
          <div className="auth-panel-fade" />

          <div className="auth-panel-logo">
            <div className="auth-panel-logo-icon">⚡</div>
            <span className="auth-panel-logo-text">DataManager</span>
          </div>

          <div className="auth-panel-caption">
            <div className="auth-panel-eyebrow">
              <span className="auth-panel-eyebrow-dot" />
              SBU ASSET DEVELOPMENT
            </div>
            <h2 className="auth-panel-headline">
              Powering the Northern Region's data, end to end.
            </h2>
            <p className="auth-panel-sub">
              OCR intake, PO aging, and reporting for TNB's
              Northern Region stations — built for the team that
              keeps the grid running.
            </p>
            <div className="auth-panel-stats">
              <div>
                <div className="auth-panel-stat-value">32</div>
                <div className="auth-panel-stat-label">Stations tracked</div>
              </div>
              <div>
                <div className="auth-panel-stat-value">7</div>
                <div className="auth-panel-stat-label">Subzones</div>
              </div>
              <div>
                <div className="auth-panel-stat-value">24/7</div>
                <div className="auth-panel-stat-label">Live monitoring</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT — form panel ────────────────────────────────────────── */}
        <div className="auth-form-panel">
          <div className="auth-card">
            <div className="auth-card-top">
              <h1>Welcome back</h1>
              <p className="auth-subtitle">Sign in to continue to your dashboard</p>
            </div>

            <form onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}

              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="auth-forgot-row">
                <Link to="/forgot-password" className="link">
                  Forgot password?
                </Link>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Signing In…' : 'Sign In'}
              </button>
            </form>

            <div className="divider"><span>or</span></div>

            <div className="google-btn-wrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
              />
            </div>

            <div className="auth-footer">
              <p>
                Don't have an account?{' '}
                <Link to="/signup" className="link">Sign Up here</Link>
              </p>
            </div>
          </div>
        </div>

        {/* Role Selection Modal */}
        {showRoleModal && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h2>Select Your Role</h2>
              <p>Are you signing in as a User or Staff?</p>
              <div className="role-buttons">
                <button className="btn-role user-role" onClick={() => handleRoleSelect('USER')}>
                  👤 User
                </button>
                <button className="btn-role staff-role" onClick={() => handleRoleSelect('STAFF')}>
                  🏢 Staff
                </button>
              </div>
              <button
                className="btn-cancel"
                onClick={() => { setShowRoleModal(false); setPendingGoogleToken(null); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}