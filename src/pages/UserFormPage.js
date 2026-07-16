import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';
import { authService } from '../services/authService';

const API = 'http://localhost:8080/api';

// Fallback grouping when a template has no explicit category from the API.
// Keeps the "group related fields" principle working even on unmigrated data.
const DEFAULT_CATEGORY = 'General Forms';

const CATEGORY_META = {
    'General Forms':     { icon: '📝', blurb: 'Everyday submissions and general-purpose forms.' },
    'HR & Employment':   { icon: '🧑‍💼', blurb: 'Employment, leave, and personnel forms.' },
    'Finance':           { icon: '💳', blurb: 'Claims, reimbursements, and payment forms.' },
    'Compliance':        { icon: '📋', blurb: 'Regulatory and policy acknowledgement forms.' },
    'Facilities':        { icon: '🏢', blurb: 'Site access, maintenance, and equipment forms.' },
};

function groupTemplates(templates) {
    const groups = new Map();
    for (const t of templates) {
        const key = t.category || DEFAULT_CATEGORY;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(t);
    }
    return Array.from(groups.entries()).map(([name, items]) => ({ name, items }));
}

function TemplateCard({ template, index, onOpen }) {
    return (
        <button
            type="button"
            className="tform-card"
            style={{ '--delay': `${index * 0.05}s` }}
            onClick={() => onOpen(template)}
        >
            <span className="tform-card-icon" aria-hidden="true">📝</span>
            <span className="tform-card-body">
                <span className="tform-card-title">{template.templateName}</span>
                {template.description && (
                    <span className="tform-card-desc">{template.description}</span>
                )}
            </span>
            <span className="tform-card-meta">
                {template.estimatedMinutes && (
                    <span className="tform-card-time">
                        ⏱ ~{template.estimatedMinutes} min
                    </span>
                )}
                <span className="tform-card-arrow" aria-hidden="true">→</span>
            </span>
        </button>
    );
}

function SectionSkeleton() {
    return (
        <div className="tform-skeleton-group">
            <div className="tform-skeleton-title" />
            <div className="tform-skeleton-grid">
                {[0, 1, 2].map(i => <div key={i} className="tform-skeleton-card" />)}
            </div>
        </div>
    );
}

export default function UserFormPage() {
    const [templates, setTemplates] = useState([]);
    const [userName, setUserName]   = useState('');
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [query, setQuery]         = useState('');
    const [collapsed, setCollapsed] = useState({}); // { [categoryName]: true }
    const navigate = useNavigate();

    const loadTemplates = () => {
        setLoading(true);
        setError(null);
        authService.fetchWithAuth(`${API}/forms/user-templates`)
            .then(res => {
                if (!res.ok) throw new Error('Request failed');
                return res.json();
            })
            .then(data => {
                setTemplates(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => {
                setError('We couldn\u2019t load your forms. Please check your connection and try again.');
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
        loadTemplates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        if (!query.trim()) return templates;
        const q = query.trim().toLowerCase();
        return templates.filter(t =>
            (t.templateName || '').toLowerCase().includes(q) ||
            (t.description || '').toLowerCase().includes(q)
        );
    }, [templates, query]);

    const groups = useMemo(() => groupTemplates(filtered), [filtered]);

    const toggleGroup = (name) => {
        setCollapsed(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const openTemplate = (template) => {
        navigate(`/user/form/${template.templateId}`);
    };

    return (
        <div className="dashboard-container user-theme">
            <div className="bg-decoration">
                <div className="bg-circle circle-1" />
                <div className="bg-circle circle-2" />
                <div className="bg-circle circle-3" />
            </div>

            {/* Navbar — matches StaffLayout's topbar language: brand, role badge, user, sign out */}
            <nav className="dashboard-nav">
                <div className="nav-brand">
                    <span className="brand-icon">⚡</span>
                    <span className="brand-name">DataManager</span>
                </div>
                <div className="nav-info">
                    <span className="nav-role user-badge">USER</span>
                    <span className="nav-username">{userName}</span>
                    <button className="signout-btn" onClick={() => navigate('/user-home')}>
                        ← Back
                    </button>
                </div>
            </nav>

            <main className="dashboard-main">
                <section className="welcome-section">
                    <div className="welcome-text">
                        <h1 className="welcome-heading">Available Forms</h1>
                        <p className="welcome-subtitle">
                            Pick a form below. Forms are grouped by type so you only see what's relevant.
                        </p>
                    </div>
                </section>

                {/* Search acts as an escape hatch for users who know exactly what they want —
                    flexibility & efficiency of use (Nielsen #7) */}
                {!loading && !error && templates.length > 0 && (
                    <div className="tform-search-bar">
                        <span className="tform-search-icon" aria-hidden="true">🔍</span>
                        <input
                            type="text"
                            className="tform-search-input"
                            placeholder="Search forms by name…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            aria-label="Search forms"
                        />
                        {query && (
                            <button
                                type="button"
                                className="tform-search-clear"
                                onClick={() => setQuery('')}
                                aria-label="Clear search"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}

                <section className="menu-section">
                    {/* Visibility of system status: skeletons, not a bare "Loading..." string */}
                    {loading && (
                        <>
                            <SectionSkeleton />
                            <SectionSkeleton />
                        </>
                    )}

                    {/* Error recovery: explain what happened + offer a retry action */}
                    {!loading && error && (
                        <div className="tform-error-banner" role="alert">
                            <span className="tform-error-icon" aria-hidden="true">⚠️</span>
                            <div className="tform-error-text">
                                <p className="tform-error-title">Something went wrong</p>
                                <p className="tform-error-desc">{error}</p>
                            </div>
                            <button className="tform-retry-btn" onClick={loadTemplates}>
                                Try again
                            </button>
                        </div>
                    )}

                    {!loading && !error && templates.length === 0 && (
                        <div className="tform-empty-state">
                            <p className="tform-empty-icon">🗂️</p>
                            <p className="tform-empty-title">No forms available yet</p>
                            <p className="tform-empty-desc">
                                Check back later, or contact staff if you were expecting a form here.
                            </p>
                        </div>
                    )}

                    {!loading && !error && templates.length > 0 && filtered.length === 0 && (
                        <div className="tform-empty-state">
                            <p className="tform-empty-icon">🔍</p>
                            <p className="tform-empty-title">No forms match “{query}”</p>
                            <button className="tform-retry-btn" onClick={() => setQuery('')}>
                                Clear search
                            </button>
                        </div>
                    )}

                    {/* Grouped, collapsible sections — this is the core "avoid overwhelm" fix:
                        Gestalt proximity + progressive disclosure instead of one flat grid. */}
                    {!loading && !error && groups.map((group) => {
                        const meta = CATEGORY_META[group.name] || { icon: '📁', blurb: '' };
                        const isCollapsed = !!collapsed[group.name];
                        return (
                            <div key={group.name} className="tform-group">
                                <button
                                    type="button"
                                    className="tform-group-header"
                                    onClick={() => toggleGroup(group.name)}
                                    aria-expanded={!isCollapsed}
                                >
                                    <span className="tform-group-icon" aria-hidden="true">{meta.icon}</span>
                                    <span className="tform-group-heading">
                                        <span className="tform-group-title">{group.name}</span>
                                        {meta.blurb && (
                                            <span className="tform-group-blurb">{meta.blurb}</span>
                                        )}
                                    </span>
                                    <span className="tform-group-count">{group.items.length}</span>
                                    <span className={`tform-group-chevron ${isCollapsed ? 'is-collapsed' : ''}`}>
                                        ⌄
                                    </span>
                                </button>

                                {!isCollapsed && (
                                    <div className="tform-group-grid">
                                        {group.items.map((template, i) => (
                                            <TemplateCard
                                                key={template.templateId}
                                                template={template}
                                                index={i}
                                                onOpen={openTemplate}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </section>
            </main>
        </div>
    );
}