import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { geocodingService } from '../services/geocodingService';
import '../styles/Auth.css';

export default function CompleteProfile() {
  const [role, setRole] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // USER fields
  const [companyName, setCompanyName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');

  // Address suggestions state (USER only)
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  // STAFF fields
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    const storedFullName = localStorage.getItem('fullName') || '';
    if (!storedRole || !localStorage.getItem('username')) {
      navigate('/signin');
      return;
    }
    setRole(storedRole);
    setFullName(storedFullName);
  }, [navigate]);

  // Debounced address lookup — fires 300ms after the user stops typing
  const handleAddressChange = (value) => {
    setCompanyAddress(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await geocodingService.autocomplete(value);
      setAddressSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);
  };

  const handleSelectSuggestion = (suggestion) => {
    setCompanyAddress(suggestion.description);
    setShowSuggestions(false);
    setAddressSuggestions([]);
    // Place details (lat/lng) aren't needed for the profile form itself,
    // but if you later want to store coordinates, call:
    // const details = await geocodingService.getPlaceDetails(suggestion.placeId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (role === 'STAFF') {
        result = await authService.completeStaffProfile({ department, position, inviteCode });
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
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-top">
            <h1>Complete Your Profile</h1>
            <p className="auth-subtitle">
              Welcome{fullName ? `, ${fullName}` : ''}! Please fill in your details to continue.
            </p>
          </div>

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

                <div className="form-group" style={{ position: 'relative' }}>
                  <label htmlFor="companyAddress">Company Address</label>
                  <input
                    type="text"
                    id="companyAddress"
                    value={companyAddress}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Enter your company address"
                    autoComplete="off"
                    required
                  />

                  {showSuggestions && (
                    <ul
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 10,
                        background: '#fff',
                        border: '1px solid var(--auth-border)',
                        borderRadius: 8,
                        marginTop: 4,
                        maxHeight: 220,
                        overflowY: 'auto',
                        listStyle: 'none',
                        padding: 4,
                        boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
                      }}
                    >
                      {addressSuggestions.map((s) => (
                        <li
                          key={s.placeId}
                          onMouseDown={() => handleSelectSuggestion(s)}
                          style={{
                            padding: '8px 10px',
                            fontSize: 13.5,
                            cursor: 'pointer',
                            borderRadius: 6,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f2f7')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          {s.description}
                        </li>
                      ))}
                    </ul>
                  )}
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

                <div className="form-group">
                  <label htmlFor="inviteCode">Staff Invite Code</label>
                  <input
                    type="text"
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter the invite code sent to your email"
                    required
                  />
                  <small>
                    Don't have a code? Contact your admin to request one.
                  </small>
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Complete Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}