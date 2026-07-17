import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authService } from '../services/authService';
import '../styles/Dashboard.css';

const API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

/* ── Labeled Images field ──────────────────────────────────────────
   Uploads each image immediately when selected (one request per label),
   and reports back a JSON string of { label: path } to the parent form. */
function LabeledImagesField({ field, value, onChange }) {
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
        return <p className="frf-field-hint">No image labels configured for this field.</p>;
    }

    return (
        <div className="frf-labeled-images">
            {labels.map((label, i) => (
                <div key={i}>
                    <div className={`frf-label-row ${uploads[label] ? 'is-done' : ''}`}>
                        <span className="frf-label-badge">{i + 1}</span>
                        <span className="frf-label-text">{label}</span>
                        {uploads[label] && (
                            <span className="frf-label-status">✅ Uploaded</span>
                        )}
                        <label className={`frf-label-upload-btn ${uploads[label] ? 'is-done' : ''}`}>
                            {uploading[label] ? '⏳ Uploading…' : uploads[label] ? '🔄 Change' : '📷 Upload'}
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
                        <p className="frf-inline-error">{errors[label]}</p>
                    )}
                </div>
            ))}
            <div className="frf-progress-summary">
                {Object.keys(uploads).length}/{labels.length} photos uploaded
            </div>
        </div>
    );
}

/* ── Location field ────────────────────────────────────────────────
   Primary: address text input with Google Places autocomplete suggestions.
   Secondary: "Use my current location" GPS button as a fallback. */
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

    React.useEffect(() => {
        if (current?.formattedAddress && !inputText) {
            setInputText(current.formattedAddress);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const text = e.target.value;
        setInputText(text);
        setError(null);

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
        <div ref={wrapperRef} className="frf-location-field">
            <div className="frf-location-input-wrap">
                <input
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Type your address or place name…"
                    className={`frf-location-input ${isConfirmed ? 'is-confirmed' : ''}`}
                />
                <span className="frf-location-status-icon">
                    {loadingPlace || fetchingSugg ? '⏳' : isConfirmed ? '✅' : ''}
                </span>

                {showDropdown && suggestions.length > 0 && (
                    <div className="frf-location-dropdown">
                        {suggestions.map((s, i) => (
                            <div
                                key={s.placeId}
                                onMouseDown={() => handleSelectSuggestion(s)}
                                className="frf-location-suggestion"
                                style={{
                                    borderBottom: i < suggestions.length - 1
                                        ? '1px solid #f3f4f6' : 'none',
                                }}
                            >
                                <span className="frf-location-suggestion-pin">📍</span>
                                <span>{s.description}</span>
                            </div>
                        ))}
                        <div className="frf-location-powered-by">Powered by Google</div>
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={handleGetLocation}
                disabled={loadingGps}
                className="frf-gps-btn"
            >
                {loadingGps ? '⏳ Detecting…' : '📍 Use my current location'}
            </button>

            {error && <p className="frf-inline-error">{error}</p>}
        </div>
    );
}

/* ── Section grouping ──────────────────────────────────────────────
   Groups fields under a "section" property if the template provides one,
   otherwise falls back to a single "Form Details" section — keeps long
   forms scannable instead of one flat column of every field. */
const DEFAULT_SECTION = 'Form Details';

function groupFields(fields) {
    const groups = new Map();
    for (const f of fields) {
        const key = f.section || DEFAULT_SECTION;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(f);
    }
    return Array.from(groups.entries()).map(([name, items]) => ({ name, items }));
}

function FieldSkeleton() {
    return (
        <div className="frf-skeleton-field">
            <div className="frf-skeleton-label" />
            <div className="frf-skeleton-input" />
        </div>
    );
}

export default function FormRenderer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [template, setTemplate]   = useState(null);
    const [answers, setAnswers]     = useState({});
    const [loading, setLoading]     = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError]         = useState(null);
    const [missingFields, setMissingFields] = useState([]);
    const [userName, setUserName]   = useState('');

    const loadTemplate = () => {
        setLoading(true);
        setError(null);
        authService.fetchWithAuth(`${API}/forms/templates/${id}`)
            .then(res => {
                if (!res.ok) throw new Error('Request failed');
                return res.json();
            })
            .then(data => {
                setTemplate(data);
                const initial = {};
                data.fields.forEach(f => initial[f.fieldId] = '');
                setAnswers(initial);
                setLoading(false);
            })
            .catch(() => {
                setError('We couldn\u2019t load this form. Please try again.');
                setLoading(false);
            });
    };

    useEffect(() => {
        const user = authService.getCurrentUser();
        if (!user) {
            navigate('/signin');
            return;
        }
        setUserName(user.fullName || user.name || user.username || 'User');
        loadTemplate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleChange = (fieldId, value) => {
        setAnswers(prev => ({ ...prev, [fieldId]: value }));
        // Clear the "missing" flag on this field the moment the user edits it —
        // error prevention feedback should update in real time, not just on submit.
        setMissingFields(prev => prev.filter(fid => fid !== fieldId));
    };

    const handleSubmit = async () => {
        const missing = template.fields.filter(f => {
            if (!f.isRequired) return false;
            const val = answers[f.fieldId];

            if (f.fieldType === 'labeled_images') {
                const labels = f.imageLabels || [];
                if (labels.length === 0) return false;
                let parsed = {};
                try { parsed = val ? JSON.parse(val) : {}; } catch { parsed = {}; }
                return labels.some(label => !parsed[label]);
            }

            if (Array.isArray(val)) return val.length === 0;
            return !val;
        });

        if (missing.length > 0) {
            setMissingFields(missing.map(f => f.fieldId));
            // Scroll to the first missing field for a faster fix
            const firstId = missing[0].fieldId;
            const el = document.getElementById(`frf-field-${firstId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

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
            } else if (field.fieldType === 'labeled_images' || field.fieldType === 'location') {
                formData.append(`answer_${field.fieldId}`, value || '{}');
            } else {
                formData.append(`answer_${field.fieldId}`, value || '');
            }
        });

        try {
            setSubmitting(true);
            const res = await authService.fetchWithAuth(`${API}/forms/submit`, {
                method: 'POST',
                headers: {},
                body: formData,
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Submission failed. Please try again.');
            }
            navigate('/user/data', { state: { justSubmitted: template.templateName } });
        } catch (e) {
            console.error('Submission error:', e);
            setError(e.message);
            setSubmitting(false);
        }
    };

    const renderField = (field) => {
        const isMissing = missingFields.includes(field.fieldId);
        const inputClass = `frf-input ${isMissing ? 'is-error' : ''}`;

        switch (field.fieldType) {
            case 'number':
                return <input type="number" className={inputClass} placeholder={field.placeholder}
                    onChange={e => handleChange(field.fieldId, e.target.value)} />;

            case 'textarea':
                return <textarea rows={4} className={inputClass} placeholder={field.placeholder}
                    onChange={e => handleChange(field.fieldId, e.target.value)} />;

            case 'dropdown':
                return (
                    <select className={inputClass} onChange={e => handleChange(field.fieldId, e.target.value)}>
                        <option value="">-- Select --</option>
                        {field.placeholder && field.placeholder.split(',').map(opt => (
                            <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                        ))}
                    </select>
                );

            case 'email':
                return <input type="email" className={inputClass} placeholder={field.placeholder || 'example@email.com'}
                    onChange={e => handleChange(field.fieldId, e.target.value)} />;

            case 'phone':
                return <input type="tel" className={inputClass} placeholder={field.placeholder || '01X-XXXXXXX'}
                    pattern="[0-9]{3}-[0-9]{8}"
                    onChange={e => handleChange(field.fieldId, e.target.value)} />;

            case 'radio':
                return (
                    <div className="frf-choice-group">
                        {field.placeholder && field.placeholder.split(',').map(opt => (
                            <label key={opt.trim()} className="frf-choice-label">
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
                    <div className="frf-choice-group">
                        {field.placeholder && field.placeholder.split(',').map(opt => (
                            <label key={opt.trim()} className="frf-choice-label">
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
                    <div className="frf-yesno-group">
                        {['Yes', 'No'].map(opt => (
                            <label key={opt} className="frf-choice-label">
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
                    <div className="frf-rating-group">
                        {[1, 2, 3, 4, 5].map(star => (
                            <span
                                key={star}
                                onClick={() => handleChange(field.fieldId, star.toString())}
                                className={`frf-star ${answers[field.fieldId] >= star ? 'is-filled' : ''}`}
                            >
                                ★
                            </span>
                        ))}
                    </div>
                );

            case 'datetime':
                return <input type="datetime-local" className={inputClass}
                    onChange={e => handleChange(field.fieldId, e.target.value)} />;

            case 'attachimage':
                return (
                    <div>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="frf-file-input"
                            onChange={e => {
                                const files = Array.from(e.target.files);
                                if (files.length > 0) handleChange(field.fieldId, files);
                            }}
                        />
                        {answers[field.fieldId] && Array.isArray(answers[field.fieldId]) && (
                            <div className="frf-image-preview-grid">
                                {answers[field.fieldId].map((file, i) => (
                                    <div key={i} className="frf-image-preview-item">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt={`Preview ${i + 1}`}
                                        />
                                        <p>{file.name}</p>
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
                            className="frf-file-input"
                            onChange={e => {
                                const file = e.target.files[0];
                                if (file) handleChange(field.fieldId, file);
                            }}
                        />
                        {answers[field.fieldId] && typeof answers[field.fieldId] === 'object' && (
                            <p className="frf-file-attached">📎 {answers[field.fieldId].name}</p>
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
                return <input type="text" className={inputClass} placeholder={field.placeholder}
                    onChange={e => handleChange(field.fieldId, e.target.value)} />;
        }
    };

    const groups = useMemo(
        () => (template ? groupFields(template.fields) : []),
        [template]
    );

    return (
        <div className="dashboard-container user-theme">
            <div className="bg-decoration">
                <div className="bg-circle circle-1" />
                <div className="bg-circle circle-2" />
                <div className="bg-circle circle-3" />
            </div>

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

            <main className="dashboard-main">
                {loading && (
                    <>
                        <div className="frf-skeleton-header" />
                        <FieldSkeleton />
                        <FieldSkeleton />
                        <FieldSkeleton />
                    </>
                )}

                {!loading && error && !template && (
                    <div className="tform-error-banner" role="alert">
                        <span className="tform-error-icon" aria-hidden="true">⚠️</span>
                        <div className="tform-error-text">
                            <p className="tform-error-title">Couldn't load this form</p>
                            <p className="tform-error-desc">{error}</p>
                        </div>
                        <button className="tform-retry-btn" onClick={loadTemplate}>
                            Try again
                        </button>
                    </div>
                )}

                {!loading && template && (
                    <>
                        <section className="welcome-section">
                            <div className="welcome-text">
                                <h1 className="welcome-heading">{template.templateName}</h1>
                                {template.description && (
                                    <p className="welcome-subtitle">{template.description}</p>
                                )}
                            </div>
                        </section>

                        {/* Submission error (distinct from load error) shown inline near the action,
                            not as a blocking alert() — visibility of system status + recoverability. */}
                        {error && (
                            <div className="tform-error-banner" role="alert" style={{ maxWidth: 640 }}>
                                <span className="tform-error-icon" aria-hidden="true">⚠️</span>
                                <div className="tform-error-text">
                                    <p className="tform-error-title">Couldn't submit the form</p>
                                    <p className="tform-error-desc">{error}</p>
                                </div>
                            </div>
                        )}

                        {missingFields.length > 0 && (
                            <div className="tform-error-banner" role="alert" style={{ maxWidth: 640 }}>
                                <span className="tform-error-icon" aria-hidden="true">⚠️</span>
                                <div className="tform-error-text">
                                    <p className="tform-error-title">A few required fields are missing</p>
                                    <p className="tform-error-desc">
                                        Please fill in the fields highlighted below before submitting.
                                    </p>
                                </div>
                            </div>
                        )}

                        <section className="menu-section">
                            <div className="frf-form-shell">
                                {/* Grouped sections — same "avoid overwhelm" pattern as the form
                                    picker: long forms are chunked instead of one flat column. */}
                                {groups.map((group, gi) => (
                                    <div key={group.name} className="frf-section">
                                        {groups.length > 1 && (
                                            <div className="frf-section-header">
                                                <span className="frf-section-index">{gi + 1}</span>
                                                <span className="frf-section-title">{group.name}</span>
                                            </div>
                                        )}
                                        <div className="frf-field-list">
                                            {group.items.map(field => (
                                                <div
                                                    key={field.fieldId}
                                                    id={`frf-field-${field.fieldId}`}
                                                    className="frf-field"
                                                >
                                                    <label className="frf-field-label">
                                                        {field.fieldLabel}
                                                        {field.isRequired && (
                                                            <span className="frf-required-mark">*</span>
                                                        )}
                                                    </label>
                                                    {renderField(field)}
                                                    {missingFields.includes(field.fieldId) && (
                                                        <p className="frf-inline-error">
                                                            This field is required.
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="frf-submit-btn"
                                >
                                    {submitting ? '⏳ Submitting…' : 'Submit Form'}
                                </button>
                            </div>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}