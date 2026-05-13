import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { authService } from '../services/authService';
import '../styles/Auth.css';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export default function SignIn() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [pendingGoogleToken, setPendingGoogleToken] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRedirect = (role, newUser) => {
    if (newUser) {
      window.location.href = '/complete-profile';
      return;
    }
    if (role === 'STAFF') {
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
        setLoading(false);
        return;
      }

      const result = await authService.signin(formData.username, formData.password);
      console.log('Signin successful:', result);
      handleRedirect(result.role, false);
    } catch (err) {
      setError(err.message || 'Signin failed. Please try again.');
      console.error('Signin error:', err);
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
      console.log('Google signin successful:', result);

      // Check if existing account has a different role than selected
      if (!result.newUser && result.role !== selectedRole) {
        setError(
          `This Google account is already registered as ${result.role}. ` +
          `Please use a different Google account to sign in as ${selectedRole}.`
        );
        return;
      }

      handleRedirect(result.role, result.newUser);
    } catch (err) {
      setError(err.message || 'Google signin failed. Please try again.');
      console.error('Google signin error:', err);
    } finally {
      setLoading(false);
      setPendingGoogleToken(null);
    }
  };

  const handleGoogleError = () => {
    setError('Google signin failed. Please try again.');
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="auth-container">
        <div className="auth-card">
          <h1>Sign In</h1>
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

             <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
                <Link to="/forgot-password" className="link" style={{ fontSize: 13 }}>
                    Forgot password?
                </Link>
             </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="divider">
            <span>or</span>
          </div>

          <div className="google-btn-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              width="100%"
              text="signin_with"
              shape="rectangular"
              theme="outline"
            />
          </div>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/signup" className="link">
                Sign Up here
              </Link>
            </p>
          </div>
        </div>

        {/* Role Selection Modal */}
        {showRoleModal && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h2>Select Your Role</h2>
              <p>Are you signing in as a User or Staff?</p>
              <div className="role-buttons">
                <button
                  className="btn btn-role user-role"
                  onClick={() => handleRoleSelect('USER')}
                >
                  👤 User
                </button>
                <button
                  className="btn btn-role staff-role"
                  onClick={() => handleRoleSelect('STAFF')}
                >
                  🏢 Staff
                </button>
              </div>
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowRoleModal(false);
                  setPendingGoogleToken(null);
                }}
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

