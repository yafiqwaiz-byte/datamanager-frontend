import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import '../styles/Auth.css';

export default function SignUp() {
  const [userType, setUserType] = useState('user'); // 'user' or 'staff'
  const [signupStatus,setSignupStatus] = useState(null);
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
    securityQuestion: '',
    securityAnswer: '',
    inviteCode:'',
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

    if (!formData.securityQuestion || !formData.securityAnswer){
      setError('Please set a security question and answer');
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

    if(!formData.inviteCode){
      setError('PLease enter your staff invite code');
      return false;
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
        securityQuestion: formData.securityQuestion,
        securityAnswer: formData.securityAnswer,
      };

      let result;
      if (userType === 'user') {
        const userData = {
          fullName: formData.fullName,
          companyName: formData.companyName,
          phoneNo: formData.phoneNo,
          address: formData.address,
        };
        const result =  await authService.signupUser(accountData,userData);
        console.log('User signup successfull',result);
        navigate('/user-home');   
      } else {
        const staffData = {
          fullName: formData.fullName,
          department: formData.department,
          position: formData.position,
          inviteCode: formData.inviteCode,
        };
       await authService.signupStaff(accountData,staffData);
       setSignupStatus('pending');
      }
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  if 
  (signupStatus === 'pending'){
    return(
       <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h2>Registration Submitted!</h2>
          <p style={{ color: '#6b7280', marginBottom: 8 }}>
            Your staff account has been created successfully.
          </p>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>
            Please wait for <strong>admin approval</strong> before signing in.
            You will receive an <strong>email notification</strong> once approved.
          </p>
          <button
            onClick={() => navigate('/signin')}
            className="btn btn-primary"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

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

            <div className="form-group">
            <label htmlFor="securityQuestion">Security Question *</label>
            <select
                id="securityQuestion"
                name="securityQuestion"
                value={formData.securityQuestion}
                onChange={handleChange}
                required
            >
                <option value="">-- Select a security question --</option>
                <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                <option value="What city were you born in?">What city were you born in?</option>
                <option value="What is your childhood nickname?">What is your childhood nickname?</option>
                <option value="What was the name of your primary school?">What was the name of your primary school?</option>
            </select>
            </div>

            <div className="form-group">
            <label htmlFor="securityAnswer">Security Answer *</label>
            <input
                type="text"
                id="securityAnswer"
                name="securityAnswer"
                value={formData.securityAnswer}
                onChange={handleChange}
                placeholder="Enter your answer"
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
                 <div className="form-group">
                  <label htmlFor="inviteCode">Staff Invite Code *</label>
                  <input
                    type="text"
                    id="inviteCode"
                    name="inviteCode"
                    value={formData.inviteCode}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      inviteCode: e.target.value.toUpperCase()
                    }))}
                    placeholder="Enter invite code (e.g. STAFF-ABC12345)"
                    required
                  />
                  <small style={{ color: '#6b7280', fontSize: 12 }}>
                    Contact your admin to get an invite code
                  </small>
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

