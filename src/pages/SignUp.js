import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import '../styles/Auth.css';

function SignUp() {
  const [userType, setUserType] = useState('user'); // 'user' or 'staff'
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    // User fields
    companyName: '',
    phoneNo: '',
    address: '',
    // Staff fields
    department: '',
    position: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUserTypeChange = (type) => {
    setUserType(type);
    setError('');
  };

  const validateForm = () => {
    if (
      !formData.username ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.fullName
    ) {
      setError('Please fill in all required fields');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (userType === 'user') {
      if (!formData.companyName || !formData.phoneNo || !formData.address) {
        setError('Please fill in all user profile fields');
        return false;
      }
    } else {
      if (!formData.department || !formData.position) {
        setError('Please fill in all staff profile fields');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!validateForm()) {
        setLoading(false);
        return;
      }

      const accountData = {
        username: formData.username,
        password: formData.password,
      };

      let result;
      if (userType === 'user') {
        const userData = {
          fullName: formData.fullName,
          companyName: formData.companyName,
          phoneNo: formData.phoneNo,
          address: formData.address,
        };
        result = await authService.signupUser(accountData, userData);
      } else {
        const staffData = {
          fullName: formData.fullName,
          department: formData.department,
          position: formData.position,
        };
        result = await authService.signupStaff(accountData, staffData);
      }

      console.log('Signup successful:', result);
      // Redirect to signin page or dashboard
      navigate(userType === 'staff' ? '/dashboard' : '/user-dashboard');
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card signup-card">
        <h1>Sign Up</h1>

        {/* User Type Selection */}
        <div className="user-type-selector">
          <button
            type="button"
            className={`type-btn ${userType === 'user' ? 'active' : ''}`}
            onClick={() => handleUserTypeChange('user')}
          >
            User
          </button>
          <button
            type="button"
            className={`type-btn ${userType === 'staff' ? 'active' : ''}`}
            onClick={() => handleUserTypeChange('staff')}
          >
            Staff
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          {/* Account Fields */}
          <fieldset>
            <legend>Account Information</legend>
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password (min 6 characters)"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                required
              />
            </div>
          </fieldset>

          {/* Common Fields */}
          <fieldset>
            <legend>Profile Information</legend>
            <div className="form-group">
              <label htmlFor="fullName">Full Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* User-specific Fields */}
            {userType === 'user' && (
              <>
                <div className="form-group">
                  <label htmlFor="companyName">Company Name *</label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Enter company name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phoneNo">Phone Number *</label>
                  <input
                    type="tel"
                    id="phoneNo"
                    name="phoneNo"
                    value={formData.phoneNo}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="address">Address *</label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter address"
                    rows="3"
                    required
                  />
                </div>
              </>
            )}

            {/* Staff-specific Fields */}
            {userType === 'staff' && (
              <>
                <div className="form-group">
                  <label htmlFor="department">Department *</label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="Enter department"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="position">Position *</label>
                  <input
                    type="text"
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    placeholder="Enter position"
                    required
                  />
                </div>
              </>
            )}
          </fieldset>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/signin" className="link">
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
