import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/Dashboard.css';

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

    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/signin');
      return;
    }

    axios.get(`http://localhost:8080/api/forms/templates/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        setTemplate(res.data);
        const initial = {};
        res.data.fields.forEach(f => initial[f.fieldId] = '');
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
            if (Array.isArray(val)) return val.length === 0;
            return !val;
        })
        .map(f => f.fieldLabel);

    if (missing.length > 0) {
        alert(`Please fill in required fields: ${missing.join(', ')}`);
        return;
    }

    // ── Build FormData ─────────────────────────────────────────
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('templateId', template.templateId);
    formData.append('inputMethod', 'form');

    template.fields.forEach(field => {
        const value = answers[field.fieldId];
        if ((field.fieldType === 'attachimage' || field.fieldType === 'attachfile') && value) {
            if (Array.isArray(value)) {
                value.forEach(file => formData.append(`file_${field.fieldId}`, file));
            } else if (value instanceof File) {
                formData.append(`file_${field.fieldId}`, value);
            }
        } else {
            formData.append(`answer_${field.fieldId}`, value || '');
        }
    });

    // ── Submit ─────────────────────────────────────────────────
    try {
        setSubmitting(true);
        await axios.post('http://localhost:8080/api/forms/submit', formData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        alert('Form submitted successfully!');
        navigate('/user/data');
    } catch (e) {
        console.error('Submission error:', e);
        alert(e.response?.data?.message || 'Submission failed. Please try again.');
        setSubmitting(false); // ✅ now called on both success path ending early and failure
    }};

  
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

      case 'date':
        return <input type="date" style={baseStyle}
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

