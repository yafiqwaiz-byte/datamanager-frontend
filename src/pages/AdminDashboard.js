import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { formatDateTime } from '../utils/dateUtils';
import '../styles/AdminDashboard.css';

const API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

export default function AdminDashboard() {
    const [pendingAccounts, setPendingAccounts]   = useState([]);
    const [inviteEmail, setInviteEmail]           = useState('');
    const [message, setMessage]                   = useState(null);
    const [loading, setLoading]                   = useState(false);
    const [fetchingList, setFetchingList]         = useState(true);
    const [generatedCode, setGeneratedCode]       = useState(null);

    useEffect(() => {
        fetchPendingAccounts();
    }, []);

    const fetchPendingAccounts = async () => {
        setFetchingList(true);
        try {
            const res  = await authService.fetchWithAuth(`${API}/admin/accounts/pending`);
            const data = await res.json();
            setPendingAccounts(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to fetch pending accounts:', e);
        } finally {
            setFetchingList(false);
        }
    };

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 5000); // auto-dismiss after 5s
    };

    const handleGenerateInvite = async () => {
        if (!inviteEmail) return;
        setLoading(true);
        setGeneratedCode(null);
        try {
            const res  = await authService.fetchWithAuth(`${API}/admin/invite/generate`, {
                method: 'POST',
                body: JSON.stringify({ email: inviteEmail }),
            });
            const data = await res.json();
            setGeneratedCode({ code: data.inviteCode, expiresAt: data.expiresAt });
            showMessage(`✅ Invite sent to ${inviteEmail}`);
            setInviteEmail('');
        } catch (e) {
            showMessage('❌ Failed to send invite. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (accountId, username) => {
        try {
            const res  = await authService.fetchWithAuth(
                `${API}/admin/accounts/${accountId}/approve`,
                { method: 'PATCH' }
            );
            const data = await res.json();
            showMessage(`✅ ${data.username} has been approved!`);
            fetchPendingAccounts();
        } catch (e) {
            showMessage('❌ Approval failed. Please try again.', 'error');
        }
    };

    const handleReject = async (accountId) => {
        if (!window.confirm('Are you sure you want to reject this account?')) return;
        try {
            const res  = await authService.fetchWithAuth(
                `${API}/admin/accounts/${accountId}/reject`,
                { method: 'PATCH' }
            );
            const data = await res.json();
            showMessage(`Account ${data.username} has been rejected.`, 'error');
            fetchPendingAccounts();
        } catch (e) {
            showMessage('❌ Rejection failed. Please try again.', 'error');
        }
    };

    const getInitial = (username) => username?.charAt(0).toUpperCase() || '?';

    return (
        <div className="admin-wrapper">

            {/* Nav */}
            <nav className="admin-nav">
                <div className="admin-nav-brand">
                    <span className="brand-icon">⚡</span>
                    <span className="brand-name">DataManager</span>
                </div>
                <div className="admin-nav-actions">
                    <span className="admin-badge">Admin</span>
                    <button
                        className="admin-signout-btn"
                        onClick={() => authService.logout()}
                    >
                        Sign Out
                    </button>
                </div>
            </nav>

            <main className="admin-main">

                {/* Page Header */}
                <div className="admin-page-header">
                    <h1 className="admin-page-title">
                        Admin <span>Dashboard</span>
                    </h1>
                    <p className="admin-page-subtitle">
                        Manage staff registrations and invite codes
                    </p>
                </div>

                {/* Message Banner */}
                {message && (
                    <div className={`admin-message-banner ${message.type}`}>
                        <span>{message.text}</span>
                        <button
                            className="admin-message-close"
                            onClick={() => setMessage(null)}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Stats Row */}
                <div className="admin-stats-row">
                    <div className="admin-stat-card">
                        <span className="admin-stat-value">
                            {pendingAccounts.length}
                        </span>
                        <span className="admin-stat-label">Pending</span>
                    </div>
                    <div className="admin-stat-card">
                        <span className="admin-stat-value">1</span>
                        <span className="admin-stat-label">Admin</span>
                    </div>
                    <div className="admin-stat-card">
                        <span className="admin-stat-value">
                            {generatedCode ? '1' : '0'}
                        </span>
                        <span className="admin-stat-label">Active Invites</span>
                    </div>
                </div>

                {/* Generate Invite Card */}
                <div className="admin-card">
                    <div className="admin-card-header">
                        <h2 className="admin-card-title">
                            <span className="icon">📧</span>
                            Generate Staff Invite
                        </h2>
                    </div>

                    <p className="admin-invite-description">
                        Enter the email address of the person you want to invite as staff.
                        An invite code will be generated and sent to their email automatically.
                        Invite codes expire after <strong>24 hours</strong>.
                    </p>

                    <div className="admin-invite-form">
                        <input
                            type="email"
                            className="admin-input"
                            placeholder="Enter staff email address"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerateInvite()}
                        />
                        <button
                            className="admin-btn admin-btn-primary"
                            onClick={handleGenerateInvite}
                            disabled={loading || !inviteEmail}
                        >
                            {loading ? '⏳ Sending...' : '📨 Send Invite'}
                        </button>
                    </div>

                    {/* Show generated code */}
                    {generatedCode && (
                        <div className="admin-invite-code-display">
                            <code>{generatedCode.code}</code>
                            <span className="expires">
                                Expires: {formatDateTime(generatedCode.expiresAt) || generatedCode.expiresAt}
                            </span>
                            <button
                                className="admin-btn admin-btn-ghost"
                                style={{ padding: '5px 12px', fontSize: 12 }}
                                onClick={() => {
                                    navigator.clipboard.writeText(generatedCode.code);
                                    showMessage('✅ Invite code copied to clipboard!');
                                }}
                            >
                                📋 Copy
                            </button>
                        </div>
                    )}
                </div>

                {/* Pending Approvals Card */}
                <div className="admin-card">
                    <div className="admin-card-header">
                        <h2 className="admin-card-title">
                            <span className="icon">⏳</span>
                            Pending Approvals
                        </h2>
                        <span className={`admin-count-badge ${pendingAccounts.length === 0 ? 'zero' : ''}`}>
                            {pendingAccounts.length}
                        </span>
                    </div>

                    {fetchingList ? (
                        <div className="admin-loading">
                            <div className="admin-spinner" />
                            Loading accounts...
                        </div>
                    ) : pendingAccounts.length === 0 ? (
                        <div className="admin-empty-state">
                            <span className="empty-icon">✅</span>
                            <p>No pending accounts. All caught up!</p>
                        </div>
                    ) : (
                        <div className="admin-account-list">
                            {pendingAccounts.map((acc) => (
                                <div key={acc.accountId} className="admin-account-item">
                                    <div className="admin-account-info">
                                        <div className="admin-account-avatar">
                                            {getInitial(acc.username)}
                                        </div>
                                        <div className="admin-account-details">
                                            <span className="admin-account-username">
                                                {acc.username}
                                            </span>
                                            <div className="admin-account-meta">
                                                <span>{acc.role}</span>
                                                <span className="dot">·</span>
                                                <span className={`admin-status-pill ${acc.status}`}>
                                                    {acc.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="admin-account-actions">
                                        <button
                                            className="admin-btn admin-btn-success"
                                            onClick={() => handleApprove(acc.accountId, acc.username)}
                                        >
                                            ✅ Approve
                                        </button>
                                        <button
                                            className="admin-btn admin-btn-danger"
                                            onClick={() => handleReject(acc.accountId)}
                                        >
                                            ❌ Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}