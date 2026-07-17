import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

const API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

const STATUS_CONFIG = {
    uploaded:       { label: 'OCR Complete',      icon: '📄', color: '#6b7280', bg: '#f3f4f6' },
    pending_review: { label: 'Waiting for Staff', icon: '⏳', color: '#92600a', bg: '#fef3c7' },
    mapping:        { label: 'Staff Processing',  icon: '⚙️', color: '#3730a3', bg: '#e0e7ff' },
    confirmed:      { label: 'Fields Confirmed',  icon: '✔️', color: '#1e40af', bg: '#dbeafe' },
    ready:          { label: 'Letter Ready',      icon: '✅', color: '#166534', bg: '#dcfce7' },
};

function LetterStatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] ?? { label: status, icon: '•', color: '#6b7280', bg: '#f3f4f6' };
    return (
        <span className="uh-status-badge" style={{ background: cfg.bg, color: cfg.color }}>
            <span aria-hidden="true">{cfg.icon}</span> {cfg.label}
        </span>
    );
}

function LetterRowSkeleton() {
    return (
        <div className="uh-skeleton-row">
            <div className="uh-skeleton-line" style={{ width: '45%' }} />
            <div className="uh-skeleton-pill" />
        </div>
    );
}

export default function UserHome() {
    const [userName,    setUserName]    = useState('');
    const [userData,    setUserData]    = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [submissions, setSubmissions] = useState([]);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [subsError,   setSubsError]   = useState(null);
    const navigate = useNavigate();

    // ── Auth check + user info from authService (not localStorage) ──
    useEffect(() => {
        const user = authService.getCurrentUser();
        if (!user) {
            navigate('/signin');
            return;
        }
        setUserName(user.fullName || user.name || user.username || 'User');
        setUserData(user);

        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Fetch letter submissions — identity from JWT cookie ────────
    const fetchSubmissions = async () => {
        setLoadingSubs(true);
        setSubsError(null);
        try {
            const res = await authService.fetchWithAuth(`${API}/letters/status/my`);
            if (!res.ok) throw new Error('Request failed');
            const data = await res.json();
            setSubmissions(data.slice(0, 3)); // show latest 3 on home
        } catch (e) {
            console.error('Failed to fetch letter submissions:', e);
            setSubsError('We couldn\u2019t load your letter requests.');
        } finally {
            setLoadingSubs(false);
        }
    };

    useEffect(() => {
        fetchSubmissions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const handleSignOut = () => {
        authService.logout();
        navigate('/signin');
    };

    // Icon-tile treatment (icon in a soft rounded square) instead of raw emoji —
    // mirrors the reference's "How can we help you?" tile grid, expressed in the
    // existing navy/amber palette from StaffLayout rather than introducing purple.
    const menuItems = [
        {
            id:          'form-input',
            icon:        '📝',
            title:       'Form Field Input',
            description: 'Fill in structured forms to submit your data to the system',
            action:      () => navigate('/user/form'),
            tone:        'amber',
        },
        {
            id:          'ocr-scan',
            icon:        '🔍',
            title:       'OCR Service',
            description: 'Scan and upload documents for automatic data extraction',
            action:      () => navigate('/user/ocr-services'),
            tone:        'navy',
        },
        {
            id:          'view-data',
            icon:        '📊',
            title:       'View My Data',
            description: 'View your submitted data in a structured table format',
            action:      () => navigate('/user/data'),
            tone:        'slate',
        },
    ];

    return (
        <div className="dashboard-container user-theme uh-root">

            {/* Navbar */}
            <nav className="dashboard-nav">
                <div className="nav-brand">
                    <span className="brand-icon">⚡</span>
                    <span className="brand-name">DataManager</span>
                </div>
                <div className="nav-info">
                    <span className="nav-role user-badge">USER</span>
                    <span className="nav-username">{userName}</span>
                    <button className="signout-btn" onClick={handleSignOut}>
                        Sign Out
                    </button>
                </div>
            </nav>

            <main className="uh-main">

                {/* ── Hero header — bold left-aligned title with generous
                     whitespace, echoing the reference's oversized centered
                     banner but kept personalized since a greeting beats a
                     generic prompt here. ── */}
                <section className="uh-hero">
                    <p className="uh-hero-eyebrow">{getGreeting()}</p>
                    <h1 className="uh-hero-title">
                        Welcome back, <span className="uh-hero-name">{userName}</span> 👋
                    </h1>
                    <p className="uh-hero-date">
                        {currentTime.toLocaleDateString('en-MY', {
                            weekday: 'long',
                            year:    'numeric',
                            month:   'long',
                            day:     'numeric',
                        })}
                    </p>
                    <div className="uh-hero-stats">
                        <div className="uh-stat-chip">
                            <span className="uh-stat-icon">🏢</span>
                            <span>{userData?.companyName || 'Company'}</span>
                        </div>
                        <div className="uh-stat-chip">
                            <span className="uh-stat-icon">📍</span>
                            <span>{userData?.companyAddress || 'Address'}</span>
                        </div>
                    </div>
                </section>

                {/* ── Action tile grid — icon-in-square cards, bold title over
                     muted description, consistent card padding: the core
                     visual pattern borrowed from the reference image. ── */}
                <section className="uh-section">
                    <h2 className="uh-section-label">What would you like to do?</h2>
                    <div className="uh-tile-grid">
                        {menuItems.map((item, index) => (
                            <div
                                key={item.id}
                                className="uh-tile"
                                role="button"
                                tabIndex={0}
                                onClick={item.action}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') item.action();
                                }}
                                style={{ '--delay': `${index * 0.08}s` }}
                            >
                                <div className={`uh-tile-icon uh-tile-icon--${item.tone}`}>
                                    <span>{item.icon}</span>
                                </div>
                                <h3 className="uh-tile-title">{item.title}</h3>
                                <p className="uh-tile-desc">{item.description}</p>
                                <span className="uh-tile-arrow" aria-hidden="true">→</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Letter Status Section ── */}
                <section className="uh-section">
                    <div className="uh-section-header">
                        <h2 className="uh-section-label uh-section-label-flush">
                            📬 My Letter Requests
                        </h2>
                        <button
                            className="uh-new-request-btn"
                            onClick={() => navigate('/user/ocr-letter')}
                        >
                            + New Request
                        </button>
                    </div>

                    {loadingSubs && (
                        <div className="uh-skeleton-list">
                            <LetterRowSkeleton />
                            <LetterRowSkeleton />
                        </div>
                    )}

                    {!loadingSubs && subsError && (
                        <div className="tform-error-banner" role="alert">
                            <span className="tform-error-icon" aria-hidden="true">⚠️</span>
                            <div className="tform-error-text">
                                <p className="tform-error-title">Couldn't load your letter requests</p>
                                <p className="tform-error-desc">{subsError}</p>
                            </div>
                            <button className="tform-retry-btn" onClick={fetchSubmissions}>
                                Try again
                            </button>
                        </div>
                    )}

                    {!loadingSubs && !subsError && submissions.length === 0 && (
                        <div className="uh-empty-card">
                            <p className="uh-empty-icon">📭</p>
                            <p className="uh-empty-text">
                                No letter requests yet.{' '}
                                <span
                                    className="uh-empty-link"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => navigate('/user/ocr-letter')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') navigate('/user/ocr-letter');
                                    }}
                                >
                                    Submit one now →
                                </span>
                            </p>
                        </div>
                    )}

                    {!loadingSubs && !subsError && submissions.length > 0 && (
                        <div className="uh-letter-list">
                            {submissions.map((sub, i) => (
                                <div
                                    key={sub.ocrId ?? i}
                                    className="uh-letter-row"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => navigate(`/letter/status/${sub.ocrId}`)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            navigate(`/letter/status/${sub.ocrId}`);
                                        }
                                    }}
                                >
                                    <div className="uh-letter-info">
                                        <p className="uh-letter-name">
                                            {sub.templateName ?? 'Letter Request'}
                                        </p>
                                        <p className="uh-letter-date">
                                            {sub.processedAt
                                                ? new Date(sub.processedAt).toLocaleString('en-MY')
                                                : '—'}
                                        </p>
                                    </div>
                                    <div className="uh-letter-meta">
                                        <LetterStatusBadge status={sub.status} />
                                        <span className="uh-letter-arrow" aria-hidden="true">→</span>
                                    </div>
                                </div>
                            ))}

                            <button
                                className="uh-view-all-btn"
                                onClick={() => navigate('/user/ocr-services')}
                            >
                                View all OCR services →
                            </button>
                        </div>
                    )}
                </section>

            </main>
        </div>
    );
}