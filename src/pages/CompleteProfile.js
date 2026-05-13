import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import '../styles/Auth.css';

export default function CompleteProfile() {
  const [role, setRole] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // User fields
  const [companyName, setCompanyName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');

  // Staff fields
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    const storedFullName = localStorage.getItem('fullName') || '';
    if (!storedRole || !localStorage.getItem('authToken')) {
      navigate('/signin');
      return;
    }
    setRole(storedRole);
    setFullName(storedFullName);
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (role === 'STAFF') {
        result = await authService.completeStaffProfile({ department, position });
      } else {
        result = await authService.completeUserProfile({ companyName, phoneNo, companyAddress });
      }

      // Update localStorage with full user data
      localStorage.setItem('user', JSON.stringify(result.user || {}));
      localStorage.removeItem('fullName');

      // Redirect to home
      if (role === 'STAFF') {
        window.location.href = '/staff-home';
      } else {
        window.location.href = '/user-home';
      }
    } catch (err) {
      setError(err.message || 'Failed to complete profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Complete Your Profile</h1>
        <p className="auth-subtitle">
          Welcome{fullName ? `, ${fullName}` : ''}! Please fill in your details to continue.
        </p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          {role === 'USER' && (
            <>
              <div className="form-group">
                <label htmlFor="companyName">Company Name</label>
                <input
                  type="text"
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter your company name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phoneNo">Phone Number</label>
                <input
                  type="text"
                  id="phoneNo"
                  value={phoneNo}
                  onChange={(e) => setPhoneNo(e.target.value)}
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="companyAddress">Company Address</label>
                <input
                  type="text"
                  id="companyAddress"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="Enter your company address"
                  required
                />
              </div>
            </>
          )}

          {role === 'STAFF' && (
            <>
              <div className="form-group">
                <label htmlFor="department">Department</label>
                <input
                  type="text"
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Enter your department"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="position">Position</label>
                <input
                  type="text"
                  id="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Enter your position"
                  required
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}

