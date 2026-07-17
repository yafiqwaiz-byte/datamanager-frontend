import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import StaffLayout from "../components/StaffLayout";
import '../styles/StaffLetterQueue.css';

const API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

const STATUS_CONFIG = {
    pending_review: { label: 'Pending Review', className: 'slq-badge slq-badge--pending'  },
    mapping:        { label: 'Processing',      className: 'slq-badge slq-badge--mapping'  },
    confirmed:      { label: 'Confirmed',       className: 'slq-badge slq-badge--confirmed'},
    ready:          { label: 'Ready',           className: 'slq-badge slq-badge--ready'    },
    uploaded:       { label: 'Uploaded',        className: 'slq-badge slq-badge--uploaded' },
};

export default function StaffLetterQueue() {

    const navigate = useNavigate();

    const [staffName, setStaffName] = useState('');
    const [staffData, setStaffData] = useState(null);

    useEffect(() => {
        const user = authService.getCurrentUser();
        if (user) {
            setStaffName(user.name || user.username || '');
            setStaffData(user);
        }
    }, []);

    const [queue,   setQueue]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [filter,  setFilter]  = useState('pending_review');

    // ── Fetch queue ────────────────────────────────────────────────
    const fetchQueue = async (statusFilter) => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = statusFilter === 'all'
                ? `${API}/letters/queue/all`
                : `${API}/letters/queue/pending`;

            const res  = await authService.fetchWithAuth(endpoint);
            if (!res.ok) throw new Error('Failed to fetch queue');
            const data = await res.json();
            setQueue(data);
        } catch (e) {
            setError('Failed to load queue. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchQueue(filter); }, [filter]);

    const getActionLabel = (status) => {
        if (status === 'ready')          return 'View';
        if (status === 'pending_review') return 'Process →';
        return 'Continue →';
    };

    // ── Render ─────────────────────────────────────────────────────
    return (
        <StaffLayout
            title="Letter Requests"
            staffName={staffName}
            staffData={staffData}
        >
            <div className="slq-container">

                {/* ── Toolbar ── */}
                <div className="slq-toolbar">
                    <div className="slq-tabs">
                        {[
                            { key: 'pending_review', label: 'Pending Review' },
                            { key: 'all',            label: 'All Requests'   },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                className={`slq-tab ${filter === tab.key ? 'slq-tab--active' : ''}`}
                                onClick={() => setFilter(tab.key)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <button
                        className="slq-refresh-btn"
                        onClick={() => fetchQueue(filter)}
                    >
                        🔄 Refresh
                    </button>
                </div>

                {/* ── Loading ── */}
                {loading && (
                    <div className="slq-state">
                        <p className="slq-state__text">Loading queue...</p>
                    </div>
                )}

                {/* ── Error ── */}
                {error && (
                    <div className="slq-state slq-state--error">
                        <p className="slq-state__text">{error}</p>
                        <button
                            className="slq-refresh-btn"
                            onClick={() => fetchQueue(filter)}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* ── Empty ── */}
                {!loading && !error && queue.length === 0 && (
                    <div className="slq-empty">
                        <span className="slq-empty__icon">📭</span>
                        <p className="slq-empty__text">No requests found.</p>
                        <p className="slq-empty__sub">
                            {filter === 'pending_review'
                                ? 'No pending submissions from users yet.'
                                : 'No letter requests have been submitted yet.'}
                        </p>
                    </div>
                )}

                {/* ── Table ── */}
                {!loading && !error && queue.length > 0 && (
                    <div className="slq-table-wrapper">
                        <table className="sl-table">
                            <thead>
                                <tr>
                                    <th>File Name</th>
                                    <th>Letter Type</th>
                                    <th>Status</th>
                                    <th>Submitted At</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {queue.map((item, i) => {
                                    const cfg = STATUS_CONFIG[item.status]
                                             || STATUS_CONFIG.uploaded;
                                    return (
                                        <tr key={item.ocrId}>
                                            <td title={item.fileName}>
                                                {item.fileName || '—'}
                                            </td>
                                            <td title={item.selectedTemplateName}>
                                                {item.selectedTemplateName || '—'}
                                            </td>
                                            <td>
                                                <span className={cfg.className}>
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className="muted">
                                                {item.processedAt
                                                    ? new Date(item.processedAt)
                                                        .toLocaleString('en-MY')
                                                    : '—'}
                                            </td>
                                            <td>
                                                <button
                                                    className={`slq-action-btn ${
                                                        item.status === 'ready'
                                                            ? 'slq-action-btn--view'
                                                            : 'slq-action-btn--process'
                                                    }`}
                                                    onClick={() => navigate(
                                                        `/staff/letter/review/${item.ocrId}`
                                                    )}
                                                >
                                                    {getActionLabel(item.status)}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── Count ── */}
                {!loading && queue.length > 0 && (
                    <p className="slq-count">
                        Showing {queue.length} request{queue.length !== 1 ? 's' : ''}
                    </p>
                )}
            </div>
        </StaffLayout>
    );
}