import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {authService} from '../services/authService';
import '../styles/Dashboard.css';

const API = 'http://localhost:8080/api';

// ── Labeled Images field ──────────────────────────────────────────
// Uploads each image immediately when selected (one request per label),
// and reports back a JSON string of { label: path } to the parent form.
function LabeledImagesField({ field, value, onChange }) {
    // `value` is the JSON string currently stored in the parent's answers state.
    // Keep local state in sync with it so edits to an already-filled form still work.
    const [uploads, setUploads] = useState(() => {
        try {
            return value ? JSON.parse(value) : {};
        } catch {
            return {};
        }
    });
    const [uploading, setUploading] = useState({});
    const [errors, setErrors] = useState({});

    const handleUpload = async (label, file) => {
        setUploading(prev => ({ ...prev, [label]: true }));
        setErrors(prev => ({ ...prev, [label]: null }));
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await authService.fetchWithAuth(
                `${API}/files/forms/image/upload`,
                { method: 'POST', body: fd }
            );
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            const updated = { ...uploads, [label]: data.path };
            setUploads(updated);
            onChange(JSON.stringify(updated));
        } catch (e) {
            setErrors(prev => ({ ...prev, [label]: e.message || 'Upload failed' }));
        } finally {
            setUploading(prev => ({ ...prev, [label]: false }));
        }
    };

    const labels = field.imageLabels || [];

    if (labels.length === 0) {
        return (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>
                No image labels configured for this field.
            </p>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {labels.map((label, i) => (
                <div key={i}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '8px 12px',
                        border: `1px solid ${uploads[label] ? '#16a34a' : '#e5e7eb'}`,
                        borderRadius: 8,
                        background: uploads[label] ? '#f0fdf4' : '#fff'
                    }}>
                        {/* Number badge */}
                        <span style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: '#0f172a', color: '#f59e0b',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 11,
                            fontWeight: 700, flexShrink: 0
                        }}>
                            {i + 1}
                        </span>
                        {/* Label */}
                        <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
                        {/* Status */}
                        {uploads[label] && (
                            <span style={{ fontSize: 11, color: '#16a34a' }}>
                                ✅ Uploaded
                            </span>
                        )}
                        {/* Upload button */}
                        <label style={{
                            padding: '5px 12px', borderRadius: 6,
                            background: uploads[label] ? '#16a34a' : '#0f172a',
                            color: '#fff', fontSize: 12,
                            cursor: uploading[label] ? 'not-allowed' : 'pointer',
                            fontWeight: 500, flexShrink: 0
                        }}>
                            {uploading[label] ? '⏳...' : uploads[label] ? '🔄 Change' : '📷 Upload'}
                            <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                disabled={uploading[label]}
                                onChange={(e) => {
                                    if (e.target.files[0]) {
                                        handleUpload(label, e.target.files[0]);
                                    }
                                }}
                            />
                        </label>
                    </div>
                    {errors[label] && (
                        <p style={{ fontSize: 11, color: '#dc2626', margin: '4px 0 0 36px' }}>
                            {errors[label]}
                        </p>
                    )}
                </div>
            ))}
            {/* Progress summary */}
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                {Object.keys(uploads).length}/{labels.length} photos uploaded
            </div>
        </div>
    );
}

// ── Location field ────────────────────────────────────────────────
// Primary: address text input with Google Places autocomplete suggestions
//          (proxied through backend so the API key never reaches the browser).
// Secondary: "Use my current location" GPS button as a fallback.
// Both populate { lat, lng, formattedAddress } JSON stored as the answer.
function LocationField({ value, onChange }) {
    const [inputText, setInputText]       = useState('');
    const [suggestions, setSuggestions]   = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [fetchingSugg, setFetchingSugg] = useState(false);
    const [loadingGps, setLoadingGps]     = useState(false);
    const [loadingPlace, setLoadingPlace] = useState(false);
    const [error, setError]               = useState(null);
    const debounceRef                     = React.useRef(null);
    const wrapperRef                      = React.useRef(null);

    let current = null;
    try { current = value ? JSON.parse(value) : null; } catch { current = null; }

    // Pre-fill the text input when an existing value is loaded
    React.useEffect(() => {
        if (current?.formattedAddress && !inputText) {
            setInputText(current.formattedAddress);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced autocomplete fetch — waits 350ms after the user stops typing
    const handleInputChange = (e) => {
        const text = e.target.value;
        setInputText(text);
        setError(null);

        // Clear confirmed location when user edits input manually
        if (current) onChange('');

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!text.trim() || text.trim().length < 3) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setFetchingSugg(true);
            try {
                const res = await authService.fetchWithAuth(
                    `${API}/geocode/autocomplete?input=${encodeURIComponent(text)}`
                );
                if (!res.ok) throw new Error('Autocomplete failed');
                const data = await res.json();
                setSuggestions(data);
                setShowDropdown(data.length > 0);
            } catch {
                setSuggestions([]);
                setShowDropdown(false);
            } finally {
                setFetchingSugg(false);
            }
        }, 350);
    };

    // User picks a suggestion → fetch its lat/lng from backend
    const handleSelectSuggestion = async (suggestion) => {
        setShowDropdown(false);
        setInputText(suggestion.description);
        setLoadingPlace(true);
        setError(null);
        try {
            const res = await authService.fetchWithAuth(
                `${API}/geocode/place-details?placeId=${encodeURIComponent(suggestion.placeId)}`
            );
            if (!res.ok) throw new Error('Failed to fetch place details');
            const data = await res.json();
            onChange(JSON.stringify(data));
            setInputText(data.formattedAddress);
        } catch {
            setError('Could not confirm that location. Please try again.');
        } finally {
            setLoadingPlace(false);
        }
    };

    // GPS fallback
    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setError('Your browser does not support location detection.');
            return;
        }
        setLoadingGps(true);
        setError(null);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                try {
                    const res = await authService.fetchWithAuth(
                        `${API}/geocode/reverse`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ lat, lng }),
                        }
                    );
                    if (!res.ok) throw new Error('Reverse geocode failed');
                    const data = await res.json();
                    onChange(JSON.stringify(data));
                    setInputText(data.formattedAddress);
                } catch {
                    const fallback = { lat, lng, formattedAddress: `${lat}, ${lng}` };
                    onChange(JSON.stringify(fallback));
                    setInputText(`${lat}, ${lng}`);
                    setError('Got your coordinates but could not resolve an address.');
                } finally {
                    setLoadingGps(false);
                }
            },
            (geoError) => {
                setLoadingGps(false);
                if (geoError.code === geoError.PERMISSION_DENIED) {
                    setError('Location permission denied. Please allow access and try again.');
                } else {
                    setError('Could not detect your location. Please try again.');
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const isConfirmed = !!current;

    return (
        <div ref={wrapperRef} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Address text input with autocomplete */}
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Type your address or place name..."
                    style={{
                        width: '100%',
                        padding: '10px 38px 10px 12px',
                        borderRadius: 8,
                        border: `1px solid ${isConfirmed ? '#16a34a' : '#ccc'}`,
                        fontSize: 14,
                        boxSizing: 'border-box',
                        outline: 'none',
                        background: isConfirmed ? '#f0fdf4' : '#fff',
                    }}
                />
                {/* Confirmed checkmark / loading spinner */}
                <span style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)', fontSize: 16,
                }}>
                    {loadingPlace || fetchingSugg ? '⏳' : isConfirmed ? '✅' : ''}
                </span>

                {/* Autocomplete dropdown */}
                {showDropdown && suggestions.length > 0 && (
                    <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: '#fff', border: '1px solid #e5e7eb',
                        borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 1000, maxHeight: 220, overflowY: 'auto',
                        marginTop: 4,
                    }}>
                        {suggestions.map((s, i) => (
                            <div
                                key={s.placeId}
                                onMouseDown={() => handleSelectSuggestion(s)}
                                style={{
                                    padding: '10px 14px',
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    borderBottom: i < suggestions.length - 1
                                        ? '1px solid #f3f4f6' : 'none',
                                    display: 'flex', alignItems: 'flex-start', gap: 8,
                                    background: '#fff',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                            >
                                <span style={{ flexShrink: 0, marginTop: 1 }}>📍</span>
                                <span style={{ color: '#1a1a2e', lineHeight: 1.4 }}>
                                    {s.description}
                                </span>
                            </div>
                        ))}
                        <div style={{
                            padding: '5px 14px', fontSize: 10,
                            color: '#9ca3af', textAlign: 'right',
                            borderTop: '1px solid #f3f4f6',
                        }}>
                            Powered by Google
                        </div>
                    </div>
                )}
            </div>

            {/* GPS button — secondary option */}
            <button
                type="button"
                onClick={handleGetLocation}
                disabled={loadingGps}
                style={{
                    alignSelf: 'flex-start',
                    padding: '7px 14px',
                    borderRadius: 7,
                    border: '1px solid #d1d5db',
                    background: loadingGps ? '#f3f4f6' : '#f9fafb',
                    color: '#374151',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: loadingGps ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                }}
            >
                {loadingGps ? '⏳ Detecting...' : '📍 Use my current location'}
            </button>

            {error && (
                <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{error}</p>
            )}
        </div>
    );
}

export default function FormRenderer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const username = localStorage.getItem('username') || 'User';
    setUserName(user.fullName || username);

    
    if (!localStorage.getItem('username')) {
      navigate('/signin');
      return;
    }

   authService.fetchWithAuth(`http://localhost:8080/api/forms/templates/${id}`)
      .then(res => res.json())
      .then(data => {
        setTemplate(data);
        const initial = {};
        data.fields.forEach(f => initial[f.fieldId] = '');
        setAnswers(initial);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load form. Please try again.');
        setLoading(false);
      });
  }, [id,navigate]);

  const handleChange = (fieldId, value) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async () => { // ── Required field validation ──────────────────────────────
    const missing = template.fields
        .filter(f => {
            if (!f.isRequired) return false;
            const val = answers[f.fieldId];

            if (f.fieldType === 'labeled_images') {
                // Required means every defined label must have an uploaded image
                const labels = f.imageLabels || [];
                if (labels.length === 0) return false;
                let parsed = {};
                try { parsed = val ? JSON.parse(val) : {}; } catch { parsed = {}; }
                return labels.some(label => !parsed[label]);
            }

            if (Array.isArray(val)) return val.length === 0;
            return !val;
        })
        .map(f => f.fieldLabel);

    if (missing.length > 0) {
        alert(`Please fill in required fields: ${missing.join(', ')}`);
        return;
    }

    // ── Build FormData ─────────────────────────────────────────
    
    const formData = new FormData();
    formData.append('templateId', template.templateId);
    formData.append('inputMethod', 'form');

    template.fields.forEach(field => {
        const value = answers[field.fieldId];
        if ((field.fieldType === 'attachimage' || field.fieldType === 'attachfile') && value) {
            // These upload at submit time as raw files
            if (Array.isArray(value)) {
                value.forEach(file => formData.append(`file_${field.fieldId}`, file));
            } else if (value instanceof File) {
                formData.append(`file_${field.fieldId}`, value);
            }
        } else if (field.fieldType === 'labeled_images' || field.fieldType === 'location') {
            // Already resolved client-side (labeled_images: uploaded JSON map;
            // location: { lat, lng, formattedAddress } JSON) — send as-is.
            formData.append(`answer_${field.fieldId}`, value || '{}');
        } else {
            formData.append(`answer_${field.fieldId}`, value || '');
        }
    });

    // ── Submit ─────────────────────────────────────────────────
    try{
        setSubmitting(true);
        const res = await authService.fetchWithAuth('http://localhost:8080/api/forms/submit', {
            method: 'POST',
            headers: {},   // let browser set multipart boundary for FormData
            body: formData,
        });
    if(!res.ok){
      const errData = await res.json().catch(() =>({}));
      throw new Error(errData.message || "Submission failed.Please try again.");
    }
     alert('Form submitted successfully!');
        navigate('/user/data');
  }catch (e) {
    console.error('Submission error:',e);
    alert(e.message);
    setSubmitting(false);
  }
  };

  
    const renderField = (field) => {
    const baseStyle = {
      width: '100%',
      padding: '10px',
      borderRadius: '8px',
      border: '1px solid #ccc',
      fontSize: '14px'
    };

    switch (field.fieldType) {
      case 'number':
        return <input type="number" style={baseStyle} placeholder={field.placeholder}
                 onChange={e => handleChange(field.fieldId, e.target.value)} />;

      case 'textarea':
        return <textarea rows={4} style={baseStyle} placeholder={field.placeholder}
                 onChange={e => handleChange(field.fieldId, e.target.value)} />;

      case 'dropdown':
        return (
          <select style={baseStyle} onChange={e => handleChange(field.fieldId, e.target.value)}>
            <option value="">-- Select --</option>
            {field.placeholder && field.placeholder.split(',').map(opt => (
              <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
            ))}
          </select>
        );

      case 'email':
        return <input type="email" style={baseStyle} placeholder={field.placeholder || 'example@email.com'}
                 onChange={e => handleChange(field.fieldId, e.target.value)} />;

      case 'phone':
        return <input type="tel" style={baseStyle} placeholder={field.placeholder || '01X-XXXXXXX'}
                 pattern="[0-9]{3}-[0-9]{8}"
                 onChange={e => handleChange(field.fieldId, e.target.value)} />;

      case 'radio':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {field.placeholder && field.placeholder.split(',').map(opt => (
              <label key={opt.trim()} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name={field.fieldId}
                  value={opt.trim()}
                  onChange={e => handleChange(field.fieldId, e.target.value)}
                />
                {opt.trim()}
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {field.placeholder && field.placeholder.split(',').map(opt => (
              <label key={opt.trim()} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  value={opt.trim()}
                  onChange={e => {
                    const current = answers[field.fieldId] ? answers[field.fieldId].split(',') : [];
                    const updated = e.target.checked
                      ? [...current, opt.trim()]
                      : current.filter(v => v !== opt.trim());
                    handleChange(field.fieldId, updated.join(','));
                  }}
                />
                {opt.trim()}
              </label>
            ))}
          </div>
        );

      case 'yesno':
        return (
          <div style={{ display: 'flex', gap: '12px' }}>
            {['Yes', 'No'].map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name={field.fieldId}
                  value={opt}
                  onChange={e => handleChange(field.fieldId, e.target.value)}
                />
                {opt}
              </label>
            ))}
          </div>
        );

      case 'rating':
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map(star => (
              <span
                key={star}
                onClick={() => handleChange(field.fieldId, star.toString())}
                style={{
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: answers[field.fieldId] >= star ? '#efa320' : '#d1d5db'
                }}
              >
                ★
              </span>
            ))}
          </div>
        );

      case 'datetime':
        return <input type="datetime-local" style={baseStyle}
                 onChange={e => handleChange(field.fieldId, e.target.value)} />;

      case 'attachimage':
        return (
          <div>
            <input
              type="file"
              multiple
              accept="image/*"
              style={{ ...baseStyle, padding: '6px' }}
              onChange={e => {
                const files = Array.from(e.target.files);
                if (files.length > 0) handleChange(field.fieldId, files);
              }}
            />
            {answers[field.fieldId] && Array.isArray(answers[field.fieldId]) && (
              <div style={{ display:'flex', flexWrap: 'wrap', gap:8, marginTop:10}}>
                {answers[field.fieldId].map((file,i) =>(
                 <div key={i} style={{ textAlign:'center'}}>
                  <img 
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${i+1}`}
                      style={{ width:85, height:85,objectFit:'cover', borderRadius:7,border:'1px solid #ccc'}} 
                      />
                      <p style={{ fontSize:11, color: '#666', marginTop:4, maxWidth:75, wordBreak:'break-all'}}>
                        {file.name}
                      </p>
                 </div>     
                ))}
          </div>
            )}
          </div>  
        );

      case 'attachfile':
        return (
          <div>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xlsx,.csv"
              style={{ ...baseStyle, padding: '6px' }}
              onChange={e => {
                const file = e.target.files[0];
                if (file) handleChange(field.fieldId, file);
              }}
            />
            {answers[field.fieldId] && typeof answers[field.fieldId] === 'object' && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
                📎 {answers[field.fieldId].name}
              </p>
            )}
          </div>
        );

      case 'location':
        return (
          <LocationField
            value={answers[field.fieldId]}
            onChange={value => handleChange(field.fieldId, value)}
          />
        );

      case 'labeled_images':
        return (
          <LabeledImagesField
            field={field}
            value={answers[field.fieldId]}
            onChange={value => handleChange(field.fieldId, value)}
          />
        );

      default:
        return <input type="text" style={baseStyle} placeholder={field.placeholder}
                 onChange={e => handleChange(field.fieldId, e.target.value)} />;
    }
  };

  return (
    <div className="dashboard-container user-theme">

      {/* Background decoration */}
      <div className="bg-decoration">
        <div className="bg-circle circle-1"></div>
        <div className="bg-circle circle-2"></div>
        <div className="bg-circle circle-3"></div>
      </div>

      {/* Navbar */}
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <span className="brand-icon">⚡</span>
          <span className="brand-name">DataManager</span>
        </div>
        <div className="nav-info">
          <span className="nav-role user-badge">USER</span>
          <span className="nav-username">{userName}</span>
          <button className="signout-btn" onClick={() => navigate('/user/form')}>← Back</button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        {loading && <p>Loading form...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {!loading && !error && template && (
          <>
            {/* Form Header */}
            <section className="welcome-section">
              <div className="welcome-text">
                <h1 className="welcome-heading">{template.templateName}</h1>
                <p className="welcome-subtitle">{template.description}</p>
              </div>
            </section>

            {/* Form Fields */}
            <section className="menu-section">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
                {template.fields.map(field => (
                  <div key={field.fieldId}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                      {field.fieldLabel}
                      {field.isRequired && <span style={{ color: 'red', marginLeft: '4px' }}>*</span>}
                    </label>
                    {renderField(field)}
                  </div>
                ))}

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    marginTop: '10px',
                    padding: '12px 24px',
                    backgroundColor: submitting ? '#a78bfa' : '#7c3aed',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Form'}
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}