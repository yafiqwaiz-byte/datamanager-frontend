import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';
import { authService } from '../services/authService';

const API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';
const FILE_BASE = process.env.REACT_APP_FILE_BASE_URL || 'http://localhost:8080/';

const IMAGE_EXT = /\.(jpeg|jpg|png|gif|bmp|webp|svg)$/i;
const DOC_EXT   = /\.(pdf|doc|docx|xlsx|csv|txt)$/i;

const STATUS_STYLE = {
    submitted: { bg: '#d1fae5', color: '#065f46', icon: '✅', label: 'Submitted' },
    pending:   { bg: '#fef3c7', color: '#92400e', icon: '⏳', label: 'Pending' },
    rejected:  { bg: '#fee2e2', color: '#991b1b', icon: '⛔', label: 'Rejected' },
};
const DEFAULT_STATUS_STYLE = { bg: '#e5e7eb', color: '#374151', icon: '•', label: null };

function StatusBadge({ status }) {
    const s = STATUS_STYLE[status] || { ...DEFAULT_STATUS_STYLE, label: status };
    return (
        <span className="udata-status-badge" style={{ backgroundColor: s.bg, color: s.color }}>
            <span aria-hidden="true">{s.icon}</span> {s.label}
        </span>
    );
}

/** Detects a JSON object string like {"lat":..,"lng":..,"formattedAddress":..}
 *  produced by the location field, vs. any other JSON shape. */
function tryParseLocationValue(value) {
    try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            && ('formattedAddress' in parsed || ('lat' in parsed && 'lng' in parsed))) {
            return parsed;
        }
    } catch {
        // not JSON — fall through
    }
    return null;
}

/** Detects a JSON object string like {"Label A":"uploads/x.png","Label B":"uploads/y.png"}
 *  produced by the labeled_images field — every value in the object is a file path. */
function tryParseLabeledFilesValue(value) {
    try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const entries = Object.entries(parsed);
            if (entries.length > 0 && entries.every(([, v]) => typeof v === 'string' && v.trim())) {
                return entries; // [[label, path], ...]
            }
        }
    } catch {
        // not JSON — fall through
    }
    return null;
}

function LocationValue({ data }) {
    const mapsUrl = (typeof data.lat === 'number' && typeof data.lng === 'number')
        ? `https://www.google.com/maps?q=${data.lat},${data.lng}`
        : null;
    return (
        <div className="udata-location-card">
            <span className="udata-location-icon" aria-hidden="true">📍</span>
            <div className="udata-location-text">
                <span className="udata-location-address">
                    {data.formattedAddress || `${data.lat}, ${data.lng}`}
                </span>
                {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noreferrer" className="udata-location-link">
                        View on map ↗
                    </a>
                )}
            </div>
        </div>
    );
}

function FileThumb({ path, label, onPreviewImage }) {
    const url = `${FILE_BASE}${path}`;
    if (IMAGE_EXT.test(path)) {
        return (
            <button
                type="button"
                className="udata-thumb"
                onClick={() => onPreviewImage({ url, label })}
                aria-label={`Preview ${label}`}
            >
                <img src={url} alt={label} loading="lazy" />
                <span className="udata-thumb-overlay">🔍 {label}</span>
            </button>
        );
    }
    const ext = (path.split('.').pop() || '').toUpperCase();
    return (
        <a href={url} target="_blank" rel="noreferrer" className="udata-file-chip">
            <span className="udata-file-chip-icon" aria-hidden="true">📄</span>
            <span className="udata-file-chip-text">
                <span className="udata-file-chip-name">{label}</span>
                <span className="udata-file-chip-ext">{ext}</span>
            </span>
        </a>
    );
}

/**
 * Renders an answer value. File/image paths are shown as an actual visual
 * gallery (thumbnails you can preview), never as a bare clickable URL —
 * this directly maps to "match between system and real world": users think
 * in terms of "the photo I uploaded," not "a file path." Handles three
 * shapes: plain comma-separated paths, a labeled_images JSON map, and a
 * location JSON object — each renders as its own visual, not raw text.
 */
function AnswerValue({ value, onPreviewImage }) {
    if (!value) return <span className="udata-empty-value">No data provided</span>;

    // Shape 1: location field → { lat, lng, formattedAddress }
    const locationData = tryParseLocationValue(value);
    if (locationData) {
        return <LocationValue data={locationData} />;
    }

    // Shape 2: labeled_images field → { "Label A": "path/a.png", ... }
    const labeledFiles = tryParseLabeledFilesValue(value);
    if (labeledFiles) {
        return (
            <div className="udata-file-gallery">
                {labeledFiles.map(([label, path], i) => (
                    <FileThumb key={i} path={path} label={label} onPreviewImage={onPreviewImage} />
                ))}
            </div>
        );
    }

    // Shape 3: plain comma-separated path list (attachimage/attachfile fields)
    const parts = value.split(',').map(v => v.trim()).filter(Boolean);
    const hasFiles = parts.some(p => IMAGE_EXT.test(p) || DOC_EXT.test(p));

    if (!hasFiles) {
        return <span className="udata-text-value">{value}</span>;
    }

    return (
        <div className="udata-file-gallery">
            {parts.map((path, i) => (
                <FileThumb
                    key={i}
                    path={path}
                    label={IMAGE_EXT.test(path) ? `Image ${i + 1}` : `File ${i + 1}`}
                    onPreviewImage={onPreviewImage}
                />
            ))}
        </div>
    );
}

function ImageLightbox({ image, onClose }) {
    if (!image) return null;
    return (
        <div className="udata-lightbox-backdrop" onClick={onClose} role="dialog" aria-modal="true">
            <div className="udata-lightbox-content" onClick={e => e.stopPropagation()}>
                <button className="udata-lightbox-close" onClick={onClose} aria-label="Close preview">
                    ✕
                </button>
                <img src={image.url} alt={image.label} />
                <a
                    className="udata-lightbox-open-link"
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                >
                    Open original ↗
                </a>
            </div>
        </div>
    );
}

function SubmissionSkeleton() {
    return (
        <div className="udata-skeleton-card">
            <div className="udata-skeleton-line" style={{ width: '40%' }} />
            <div className="udata-skeleton-line" style={{ width: '25%' }} />
        </div>
    );
}

export default function UserDataPage() {
    const [submissions, setSubmissions]           = useState([]);
    const [userName, setUserName]                 = useState('');
    const [loading, setLoading]                   = useState(true);
    const [error, setError]                       = useState(null);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [previewImage, setPreviewImage]         = useState(null);
    const [currentPage, setCurrentPage]           = useState(0);
    const [totalPages, setTotalPages]             = useState(0);
    const [totalElements, setTotalElements]       = useState(0);
    const navigate = useNavigate();

    const fetchSubmissions = async (page = 0) => {
        setLoading(true);
        setError(null);
        try {
            const response = await authService.fetchWithAuth(
                `${API}/forms/my-submissions?page=${page}&size=10`
            );
            if (!response.ok) throw new Error('Failed to load submissions');
            const data = await response.json();
            setSubmissions(data.content);
            setTotalPages(data.page.totalPages);
            setCurrentPage(data.page.number);
            setTotalElements(data.page.totalElements);
        } catch {
            setError('We couldn\u2019t load your submissions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const user = authService.getCurrentUser();
        if (!user) {
            navigate('/signin');
            return;
        }
        setUserName(user.fullName || user.name || user.username || 'User');
        fetchSubmissions(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-MY', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    };

    const pageNumbers = useMemo(() => {
        return Array.from({ length: totalPages }, (_, i) => i)
            .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 2);
    }, [totalPages, currentPage]);

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
                    <button className="signout-btn" onClick={() => navigate('/user-home')}>← Back</button>
                </div>
            </nav>

            <main className="dashboard-main">
                <section className="welcome-section">
                    <div className="welcome-text">
                        <h1 className="welcome-heading">My Submissions</h1>
                        <p className="welcome-subtitle">
                            {totalElements > 0
                                ? `${totalElements} total submission${totalElements !== 1 ? 's' : ''}`
                                : 'View all your submitted form data'}
                        </p>
                    </div>
                </section>

                <section className="menu-section">
                    {loading && (
                        <div className="udata-skeleton-list">
                            <SubmissionSkeleton />
                            <SubmissionSkeleton />
                            <SubmissionSkeleton />
                        </div>
                    )}

                    {!loading && error && (
                        <div className="udata-error-banner" role="alert">
                            <span className="udata-error-icon" aria-hidden="true">⚠️</span>
                            <div className="udata-error-text">
                                <p className="udata-error-title">Couldn't load your submissions</p>
                                <p className="udata-error-desc">{error}</p>
                            </div>
                            <button className="udata-retry-btn" onClick={() => fetchSubmissions(currentPage)}>
                                Try again
                            </button>
                        </div>
                    )}

                    {!loading && !error && submissions.length === 0 && (
                        <div className="udata-empty-state">
                            <p className="udata-empty-icon">📭</p>
                            <p className="udata-empty-title">No submissions yet</p>
                            <p className="udata-empty-desc">Fill in a form to get started.</p>
                            <button className="udata-primary-btn" onClick={() => navigate('/user/form')}>
                                Go to Forms
                            </button>
                        </div>
                    )}

                    {!loading && submissions.length > 0 && (
                        <div className="udata-submission-list">
                            {submissions.map(submission => {
                                const isOpen = selectedSubmission?.submissionId === submission.submissionId;
                                return (
                                    <div key={submission.submissionId} className="udata-submission-card">
                                        <div className="udata-submission-header">
                                            <div className="udata-submission-title-block">
                                                <h3 className="udata-submission-title">
                                                    {submission.templateName}
                                                </h3>
                                                <p className="udata-submission-date">
                                                    Submitted: {formatDate(submission.submittedAt)}
                                                </p>
                                            </div>
                                            <div className="udata-submission-actions">
                                                <StatusBadge status={submission.status} />
                                                <button
                                                    className="udata-details-btn"
                                                    onClick={() =>
                                                        setSelectedSubmission(isOpen ? null : submission)
                                                    }
                                                    aria-expanded={isOpen}
                                                >
                                                    {isOpen ? 'Hide details' : 'View details'}
                                                    <span className={`udata-chevron ${isOpen ? 'is-open' : ''}`}>⌄</span>
                                                </button>
                                            </div>
                                        </div>

                                        {isOpen && (
                                            <div className="udata-submission-body">
                                                {submission.answers.map((answer) => (
                                                    <div key={answer.answerId} className="udata-answer-row">
                                                        <span className="udata-answer-label">
                                                            {answer.fieldLabel}
                                                        </span>
                                                        <div className="udata-answer-value">
                                                            <AnswerValue
                                                                value={answer.answerValue}
                                                                onPreviewImage={setPreviewImage}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {totalPages > 1 && (
                    <div className="pagination-container">
                        <button
                            className={`pagination-btn ${currentPage === 0 ? 'disabled' : ''}`}
                            onClick={() => fetchSubmissions(currentPage - 1)}
                            disabled={currentPage === 0}
                        >
                            ← Prev
                        </button>

                        {pageNumbers.map((i, idx, arr) => (
                            <React.Fragment key={i}>
                                {idx > 0 && arr[idx - 1] !== i - 1 && (
                                    <span className="pagination-ellipsis">…</span>
                                )}
                                <button
                                    className={`pagination-btn ${currentPage === i ? 'active' : ''}`}
                                    onClick={() => fetchSubmissions(i)}
                                >
                                    {i + 1}
                                </button>
                            </React.Fragment>
                        ))}

                        <button
                            className={`pagination-btn ${currentPage >= totalPages - 1 ? 'disabled' : ''}`}
                            onClick={() => fetchSubmissions(currentPage + 1)}
                            disabled={currentPage >= totalPages - 1}
                        >
                            Next →
                        </button>
                    </div>
                )}
            </main>

            <ImageLightbox image={previewImage} onClose={() => setPreviewImage(null)} />
        </div>
    );
}