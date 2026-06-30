import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

const API = "http://localhost:8080/api";

const STATUS_CONFIG = {
    uploaded:       { label: 'OCR Complete',      color: '#6b7280', bg: '#f3f4f6' },
    pending_review: { label: 'Waiting for Staff', color: '#92600a', bg: '#fef3c7' },
    mapping:        { label: 'Staff Processing',  color: '#3730a3', bg: '#e0e7ff' },
    confirmed:      { label: 'Fields Confirmed',  color: '#1e40af', bg: '#dbeafe' },
    ready:          { label: '✅ Letter Ready',    color: '#166534', bg: '#dcfce7' },
};

export default function UserHome() {
    const [userName,    setUserName]    = useState('');
    const [userData,    setUserData]    = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [submissions, setSubmissions] = useState([]);
    const [loadingSubs, setLoadingSubs] = useState(false);
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
    useEffect(() => {
        const fetchSubmissions = async () => {
            setLoadingSubs(true);
            try {
                const res = await authService.fetchWithAuth(
                    `${API}/letters/status/my`
                );
                if (!res.ok) return;
                const data = await res.json();
                setSubmissions(data.slice(0, 3)); // show latest 3 on home
            } catch (e) {
                console.error('Failed to fetch letter submissions:', e);
            } finally {
                setLoadingSubs(false);
            }
        };
        fetchSubmissions();
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

    const menuItems = [
        {
            id:          'form-input',
            icon:        '📝',
            title:       'Form Field Input',
            description: 'Fill in structured forms to submit your data to the system',
            action:      () => navigate('/user/form'),
            color:       '#7c3aed',
        },
        {
            id:          'ocr-scan',
            icon:        '🔍',
            title:       'OCR Service',
            description: 'Scan and upload documents for automatic data extraction',
            action:      () => navigate('/user/ocr-services'),
            color:       '#db2777',
        },
        {
            id:          'view-data',
            icon:        '📊',
            title:       'View My Data',
            description: 'View your submitted data in a structured table format',
            action:      () => navigate('/user/data'),
            color:       '#0891b2',
        },
    ];

    return (
        <div className="dashboard-container user-theme">

            {/* Background decoration */}
            <div className="bg-decoration">
                <div className="bg-circle circle-1" />
                <div className="bg-circle circle-2" />
                <div className="bg-circle circle-3" />
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
                    <button className="signout-btn" onClick={handleSignOut}>
                        Sign Out
                    </button>
                </div>
            </nav>

            <main className="dashboard-main">

                {/* Welcome Section */}
                <section className="welcome-section">
                    <div className="welcome-text">
                        <p className="greeting-label">{getGreeting()},</p>
                        <h1 className="welcome-heading">
                            Hi, Welcome!{' '}
                            <span className="highlight-name">{userName}</span> 👋
                        </h1>
                        <p className="welcome-subtitle">
                            {currentTime.toLocaleDateString('en-MY', {
                                weekday: 'long',
                                year:    'numeric',
                                month:   'long',
                                day:     'numeric',
                            })}
                        </p>
                    </div>
                    <div className="welcome-stats">
                        <div className="stat-chip">
                            <span className="stat-icon">🏢</span>
                            <span>{userData?.companyName || 'Company'}</span>
                        </div>
                        <div className="stat-chip">
                            <span className="stat-icon">📍</span>
                            <span>{userData?.companyAddress || 'Address'}</span>
                        </div>
                    </div>
                </section>

                {/* Menu Grid */}
                <section className="menu-section">
                    <h2 className="section-title">What would you like to do?</h2>
                    <div className="menu-grid">
                        {menuItems.map((item, index) => (
                            <div
                                key={item.id}
                                className="menu-card"
                                onClick={item.action}
                                style={{
                                    '--card-color': item.color,
                                    '--delay':      `${index * 0.1}s`,
                                }}
                            >
                                <div className="card-icon-wrapper">
                                    <span className="card-icon">{item.icon}</span>
                                </div>
                                <div className="card-content">
                                    <h3 className="card-title">{item.title}</h3>
                                    <p className="card-description">{item.description}</p>
                                </div>
                                <div className="card-arrow">→</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Letter Status Section ── */}
                <section className="menu-section">
                    <div style={{
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'space-between',
                        marginBottom:   16,
                    }}>
                        <h2 className="section-title" style={{ margin: 0 }}>
                            📬 My Letter Requests
                        </h2>
                        <button
                            onClick={() => navigate('/user/ocr-letter')}
                            style={{
                                padding:      '8px 16px',
                                background:   '#7c3aed',
                                color:        '#fff',
                                border:       'none',
                                borderRadius: 8,
                                fontSize:     13,
                                fontWeight:   600,
                                cursor:       'pointer',
                                fontFamily:   'inherit',
                            }}
                        >
                            + New Request
                        </button>
                    </div>

                    {loadingSubs ? (
                        <div style={{
                            background:   '#fff',
                            borderRadius: 12,
                            padding:      24,
                            textAlign:    'center',
                            color:        '#9ca3af',
                            fontSize:     14,
                        }}>
                            Loading your requests...
                        </div>
                    ) : submissions.length === 0 ? (
                        <div style={{
                            background:   '#fff',
                            borderRadius: 12,
                            padding:      '32px 24px',
                            textAlign:    'center',
                            color:        '#9ca3af',
                            fontSize:     14,
                            border:       '1px dashed #e5e7eb',
                        }}>
                            <p style={{ fontSize: 32, margin: '0 0 8px' }}>📭</p>
                            <p style={{ margin: 0 }}>
                                No letter requests yet.{' '}
                                <span
                                    style={{
                                        color:      '#7c3aed',
                                        cursor:     'pointer',
                                        fontWeight: 600,
                                    }}
                                    onClick={() => navigate('/user/ocr-letter')}
                                >
                                    Submit one now →
                                </span>
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            display:       'flex',
                            flexDirection: 'column',
                            gap:           10,
                        }}>
                            {submissions.map((sub, i) => {
                                const cfg = STATUS_CONFIG[sub.status]
                                    ?? { label: sub.status, color: '#6b7280', bg: '#f3f4f6' };

                                return (
                                    <div
                                        key={sub.ocrId ?? i}
                                        style={{
                                            background:     '#fff',
                                            borderRadius:   12,
                                            padding:        '16px 20px',
                                            display:        'flex',
                                            alignItems:     'center',
                                            justifyContent: 'space-between',
                                            gap:            12,
                                            border:         '1px solid #e5e7eb',
                                            cursor:         'pointer',
                                            transition:     'border-color 0.15s',
                                        }}
                                        onClick={() =>
                                            navigate(`/letter/status/${sub.ocrId}`)
                                        }
                                        onMouseEnter={e =>
                                            e.currentTarget.style.borderColor = '#7c3aed'
                                        }
                                        onMouseLeave={e =>
                                            e.currentTarget.style.borderColor = '#e5e7eb'
                                        }
                                    >
                                        {/* Left — template name + date */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{
                                                fontSize:     14,
                                                fontWeight:   600,
                                                color:        '#1a1a2e',
                                                margin:       '0 0 4px',
                                                overflow:     'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace:   'nowrap',
                                            }}>
                                                {sub.templateName ?? 'Letter Request'}
                                            </p>
                                            <p style={{
                                                fontSize: 12,
                                                color:    '#9ca3af',
                                                margin:   0,
                                            }}>
                                                {sub.processedAt
                                                    ? new Date(sub.processedAt)
                                                        .toLocaleString('en-MY')
                                                    : '—'}
                                            </p>
                                        </div>

                                        {/* Right — status badge + arrow */}
                                        <div style={{
                                            display:    'flex',
                                            alignItems: 'center',
                                            gap:        10,
                                            flexShrink: 0,
                                        }}>
                                            <span style={{
                                                padding:      '4px 12px',
                                                borderRadius: 20,
                                                fontSize:     11,
                                                fontWeight:   600,
                                                background:   cfg.bg,
                                                color:        cfg.color,
                                            }}>
                                                {cfg.label}
                                            </span>
                                            <span style={{ color: '#9ca3af', fontSize: 16 }}>
                                                →
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                            <button
                                onClick={() => navigate('/user/ocr-services')}
                                style={{
                                    background:  'none',
                                    border:      'none',
                                    color:       '#7c3aed',
                                    fontSize:    13,
                                    fontWeight:  600,
                                    cursor:      'pointer',
                                    padding:     '8px 0',
                                    textAlign:   'center',
                                    fontFamily:  'inherit',
                                }}
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