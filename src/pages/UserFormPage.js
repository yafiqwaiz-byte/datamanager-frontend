import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';
import axios from 'axios';

function UserFormPage() {
    const [templates, setTemplates] = useState([]);
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            navigate('/signin');
            return;
        }

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const username = localStorage.getItem('username') || 'User';
        setUserName(user.fullName || username);

        axios.get('/api/forms/templates', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            setTemplates(res.data);
            setLoading(false);
        })
        .catch(() => {
            setError('Failed to load form templates. Please try again later.');
            setLoading(false);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                    <button className="signout-btn" onClick={() => navigate('/user/home')}>← Back</button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="dashboard-main">
                <section className="welcome-section">
                    <div className="welcome-text">
                        <h1 className="welcome-heading">Available Forms</h1>
                        <p className="welcome-subtitle">Select a form to fill in your data</p>
                    </div>
                </section>

                <section className="menu-section">
                    {loading && <p>Loading forms...</p>}
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    {!loading && !error && templates.length === 0 && (
                        <p>No forms available at the moment.</p>
                    )}
                    <div className="menu-grid">
                        {templates.map((template, index) => (
                            <div
                                key={template.templateId}
                                className="menu-card"
                                onClick={() => navigate(`/user/form/${template.templateId}`)}
                                style={{ '--card-color': '#7c3aed', '--delay': `${index * 0.1}s` }}
                            >
                                <div className="card-icon-wrapper">
                                    <span className="card-icon">📝</span>
                                </div>
                                <div className="card-content">
                                    <h3 className="card-title">{template.templateName}</h3>
                                    <p className="card-description">{template.description}</p>
                                </div>
                                <div className="card-arrow">→</div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

export default UserFormPage;