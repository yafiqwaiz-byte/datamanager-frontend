import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSubmissions } from '../services/templateService';
import '../styles/Dashboard.css';

function StaffFetchData() {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [filterTemplate, setFilterTemplate] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const navigate = useNavigate();

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            const data = await getAllSubmissions();
            setSubmissions(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Get unique template names for filter dropdown
    const templateNames = [...new Set(submissions.map(s => s.templateName))];

    const filtered = submissions
        .filter(s => {
            const matchSearch = !searchTerm || s.answers.some(a =>
                a.answerValue?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            const matchTemplate = !filterTemplate || s.templateName === filterTemplate;
            const matchStatus = !filterStatus || s.status === filterStatus;
            return matchSearch && matchTemplate && matchStatus;
        })
        .sort((a, b) => {
            if (sortBy === 'date') return new Date(b.submittedAt) - new Date(a.submittedAt);
            if (sortBy === 'template') return a.templateName.localeCompare(b.templateName);
            if (sortBy === 'status') return a.status.localeCompare(b.status);
            return 0;
        });

    const handleExportCSV = () => {
        if (!filtered.length) return;
        const headers = ['Template', 'Submitted At', 'Status', 'Input Method', 'Answers'];
        const rows = filtered.map(s => [
            s.templateName,
            new Date(s.submittedAt).toLocaleString('en-MY'),
            s.status,
            s.inputMethod,
            s.answers.map(a => `${a.fieldLabel}: ${a.answerValue || ''}`).join(' | ')
        ]);
        const csv = [headers, ...rows].map(r => r.map(v =>
            `"${String(v).replace(/"/g, '""')}"`
        ).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `all_submissions_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="dashboard-container staff-theme">
            <div className="bg-decoration">
                <div className="bg-circle circle-1"></div>
                <div className="bg-circle circle-2"></div>
                <div className="bg-circle circle-3"></div>
            </div>

            <nav className="dashboard-nav">
                <div className="nav-brand">
                    <span className="brand-icon">⚡</span>
                    <span className="brand-name">DataManager</span>
                </div>
                <div className="nav-info">
                    <button className="signout-btn" onClick={() => navigate('/staff-home')}>← Back</button>
                </div>
            </nav>

            <main className="dashboard-main">
                <section className="welcome-section">
                    <div className="welcome-text">
                        <h1 className="welcome-heading">User Submissions</h1>
                        <p className="welcome-subtitle">{filtered.length} of {submissions.length} submissions</p>
                    </div>
                    <button onClick={handleExportCSV}
                        style={{ padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
                        ⬇ Export CSV
                    </button>
                </section>

                {/* Filters */}
                <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                    <input
                        placeholder="Search answers..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={inputStyle}
                    />
                    <select value={filterTemplate} onChange={e => setFilterTemplate(e.target.value)} style={inputStyle}>
                        <option value="">All templates</option>
                        {templateNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={inputStyle}>
                        <option value="">All statuses</option>
                        <option value="submitted">Submitted</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={inputStyle}>
                        <option value="date">Sort by Date</option>
                        <option value="template">Sort by Template</option>
                        <option value="status">Sort by Status</option>
                    </select>
                </section>

                <section className="menu-section">
                    {loading ? (
                        <p style={{ color: '#888', textAlign: 'center', marginTop: 60 }}>Loading...</p>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
                            <p style={{ fontSize: 48 }}>📭</p>
                            <p>No submissions found.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {filtered.map(sub => (
                                <div key={sub.submissionId} style={cardStyle}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{sub.templateName}</h3>
                                            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
                                                {new Date(sub.submittedAt).toLocaleString('en-MY')} · {sub.inputMethod}
                                            </p>
                                        </div>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                                            background: sub.status === 'submitted' ? '#dcfce7' : '#f3f4f6',
                                            color: sub.status === 'submitted' ? '#16a34a' : '#6b7280'
                                        }}>
                                            {sub.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
                                        {sub.answers.map(a => (
                                            <div key={a.answerId} style={{ fontSize: 13 }}>
                                                <span style={{ color: '#6b7280', fontWeight: 500 }}>{a.fieldLabel}: </span>
                                                <span style={{ color: '#111' }}>{a.answerValue || '—'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

const inputStyle = {
    padding: '8px 12px', border: '1px solid #ddd',
    borderRadius: 8, fontSize: 13, background: '#fff'
};

const cardStyle = {
    background: 'white', borderRadius: 12, padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb'
};
export default StaffFetchData;