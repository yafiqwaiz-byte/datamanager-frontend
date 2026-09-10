import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { formatDateTime } from '../utils/dateUtils';
import '../styles/UserLetterStatus.css';

const API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

const STATUS_STEPS = [
    { key: "pending_review", label: "Submitted",        icon: "📨" },
    { key: "mapping",        label: "Processing",       icon: "⚙️" },
    { key: "confirmed",      label: "Fields Confirmed", icon: "✅" },
    { key: "ready",          label: "Letter Ready",     icon: "📄" },
];

export default function UserLetterStatus() {

    const { ocrId } = useParams();
    const navigate  = useNavigate();

    const [statusData, setStatusData] = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);

    const statusRef = useRef(null);

    // ── Fetch status ───────────────────────────────────────────────
    const fetchStatus = useCallback(async () => {
        if (!ocrId) {
            setError('No reference ID provided.');
            setLoading(false);
            return;
        }
        try {
            const res = await authService.fetchWithAuth(
                `${API}/letters/status/${ocrId}`
            );
            if (!res.ok) {
                const msg = await res.text().catch(() => '');
                throw new Error(msg || `Failed to fetch status (${res.status})`);
            }
            const data = await res.json();
            const safeData = {
                ocrId:        data.ocrId        ?? ocrId,
                status:       data.status        ?? 'uploaded',
                message:      data.message       ?? 'Processing your request...',
                letterId:     data.letterId      ?? null,
                generatedAt:  data.generatedAt   ?? null,
                downloadPdf:  data.downloadPdf   ?? null,
                downloadDocx: data.downloadDocx  ?? null,
            };
            setStatusData(safeData);
            statusRef.current = safeData.status;
            setError(null);
        } catch (e) {
            setError(e.message || 'Failed to fetch status. Please refresh.');
        } finally {
            setLoading(false);
        }
    }, [ocrId]);

    // ── Polling ────────────────────────────────────────────────────
    useEffect(() => {
        fetchStatus();
        const interval = setInterval(() => {
            if (statusRef.current === 'ready') {
                clearInterval(interval);
                return;
            }
            fetchStatus();
        }, 15000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const handleManualRefresh = () => {
        setLoading(true);
        fetchStatus();
    };

    const currentStepIndex = statusData
        ? STATUS_STEPS.findIndex(s => s.key === statusData.status)
        : -1;

    // ── Render ─────────────────────────────────────────────────────
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
                    {/* ✅ Back button goes to user-home */}
                    <button
                        className="signout-btn"
                        onClick={() => navigate('/user-home')}
                    >
                        ← Back
                    </button>
                </div>
            </nav>

            <main className="dashboard-main">
                <div className="uls-container">
                    <h1 className="uls-title">Letter Status</h1>

                    {/* ── Loading (first load only) ── */}
                    {loading && !statusData && (
                        <div className="uls-card uls-card--center">
                            <p className="uls-muted">⏳ Checking status...</p>
                        </div>
                    )}

                    {/* ── Error (no data yet) ── */}
                    {error && !statusData && (
                        <div className="uls-card">
                            <p className="uls-error">{error}</p>
                            <button
                                className="uls-btn"
                                onClick={handleManualRefresh}
                                style={{ marginTop: 12 }}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {statusData && (
                        <>
                            {/* ── Reference ID ── */}
                            <div className="uls-card">
                                <p className="uls-label">Reference ID</p>
                                <p className="uls-mono">{ocrId}</p>
                            </div>

                            {/* ── Stale error banner ── */}
                            {error && (
                                <div className="uls-card uls-card--error-banner">
                                    ⚠️ {error} — showing last known status.
                                </div>
                            )}

                            {/* ── Progress stepper ── */}
                            <div className="uls-card">
                                <p className="uls-section-title">Progress</p>

                                <div className="uls-steps">
                                    {STATUS_STEPS.map((step, index) => {
                                        const isDone    = currentStepIndex >= 0
                                                            && index < currentStepIndex;
                                        const isCurrent = index === currentStepIndex;
                                        const isPending = currentStepIndex >= 0
                                                            ? index > currentStepIndex
                                                            : true;

                                        return (
                                            <div
                                                key={step.key}
                                                className={`uls-step ${isPending ? 'uls-step--pending' : ''}`}
                                            >
                                                <div className={`uls-step__icon ${
                                                    isDone    ? 'uls-step__icon--done'    :
                                                    isCurrent ? 'uls-step__icon--current' :
                                                                'uls-step__icon--pending'
                                                }`}>
                                                    {isDone ? '✓' : step.icon}
                                                </div>
                                                <div>
                                                    <p className={`uls-step__label ${
                                                        isCurrent ? 'uls-step__label--current' :
                                                        isDone    ? 'uls-step__label--done'    : ''
                                                    }`}>
                                                        {step.label}
                                                    </p>
                                                    {isCurrent && statusData.message && (
                                                        <p className="uls-step__msg">
                                                            {statusData.message}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {statusData.status !== 'ready' && (
                                    <p className="uls-autorefresh">
                                        🔄 Auto-refreshing every 15 seconds...
                                    </p>
                                )}
                            </div>

                            {/* ── Download card ── */}
                            {statusData.status === 'ready' && statusData.letterId && (
                                <div className="uls-card">
                                    <div className="uls-success-banner">
                                        🎉 Your letter is ready!
                                    </div>
                                    {statusData.generatedAt && (
                                        <p className="uls-muted" style={{ marginBottom: 16 }}>
                                            Generated on{' '}
                                            {formatDateTime(statusData.generatedAt) || statusData.generatedAt}
                                        </p>
                                    )}
                                    <div className="uls-download-row">
                                        {statusData.downloadPdf && (
                                            <a
                                                href={`${API}${statusData.downloadPdf}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="uls-btn"
                                            >
                                                📥 Download PDF
                                            </a>
                                        )}
                                        {statusData.downloadDocx && (
                                            <a
                                                href={`${API}${statusData.downloadDocx}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="uls-btn-clear"
                                            >
                                                📄 Download DOCX
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Actions ── */}
                            <div className="uls-actions-row">
                                <button
                                    className="uls-btn-clear"
                                    onClick={handleManualRefresh}
                                    disabled={loading}
                                    style={{ flex: 1 }}
                                >
                                    {loading ? '⏳ Refreshing...' : '🔄 Refresh Now'}
                                </button>
                                {/* ✅ Back to Home button */}
                                <button
                                    className="uls-btn-home"
                                    onClick={() => navigate('/user-home')}
                                    style={{ flex: 1 }}
                                >
                                    🏠 Back to Home
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}