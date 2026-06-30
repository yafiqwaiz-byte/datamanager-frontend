import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import '../styles/OcrUpload.css';

const API = "http://localhost:8080/api";

const STATUS_STEPS = [
    { key: "pending_review", label: "Submitted",       icon: "📨" },
    { key: "mapping",        label: "Processing",      icon: "⚙️" },
    { key: "confirmed",      label: "Fields Confirmed", icon: "✅" },
    { key: "ready",          label: "Letter Ready",    icon: "📄" },
];

export default function UserLetterStatus() {

    const { ocrId }   = useParams();
    const navigate    = useNavigate();

    const [statusData, setStatusData] = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);

    // ── Poll status every 15 seconds until ready ──────────────────
    const fetchStatus = useCallback(async () => {
        try {
            const res = await authService.fetchWithAuth(
                `${API}/letters/status/${ocrId}`
            );
            if (!res.ok) throw new Error('Failed to fetch status');
            const data = await res.json();
            setStatusData(data);
            setError(null);
        } catch (e) {
            setError('Failed to fetch status. Please refresh.');
        } finally {
            setLoading(false);
        }
    }, [ocrId]);

    useEffect(() => {
        fetchStatus();

        // Poll every 15 seconds — stop when ready
        const interval = setInterval(() => {
            if (statusData?.status === 'ready') {
                clearInterval(interval);
                return;
            }
            fetchStatus();
        }, 15000);

        return () => clearInterval(interval);
    }, [fetchStatus, statusData?.status]);

    // ── Get current step index ─────────────────────────────────────
    const currentStepIndex = STATUS_STEPS.findIndex(
        s => s.key === statusData?.status
    );

    // ── Render ─────────────────────────────────────────────────────
    return (
        <div className="dashboard-container user-theme">
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
                    <span className="nav-role user-badge">USER</span>
                    <button
                        className="signout-btn"
                        onClick={() => navigate('/user/ocr-letter')}
                    >
                        ← Back
                    </button>
                </div>
            </nav>

            <main className="dashboard-main">
                <div className="ocr-upload-container">
                    <h1 className="ocr-upload-title">Letter Status</h1>

                    {loading && (
                        <div className="ocr-upload-card" style={{ textAlign: 'center' }}>
                            <p style={{ color: '#6b7280' }}>⏳ Checking status...</p>
                        </div>
                    )}

                    {error && (
                        <div className="ocr-upload-card">
                            <p className="ocr-upload-error">{error}</p>
                            <button
                                className="ocr-upload-btn"
                                onClick={fetchStatus}
                                style={{ marginTop: 12 }}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {statusData && (
                        <>
                            {/* ── Reference ID ── */}
                            <div className="ocr-upload-card">
                                <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                                    Reference ID
                                </p>
                                <p style={{
                                    fontSize: 13,
                                    fontFamily: 'monospace',
                                    color: '#374151',
                                    wordBreak: 'break-all'
                                }}>
                                    {ocrId}
                                </p>
                            </div>

                            {/* ── Progress stepper ── */}
                            <div className="ocr-upload-card">
                                <p style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: '#111827',
                                    marginBottom: 24
                                }}>
                                    Progress
                                </p>

                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 16
                                }}>
                                    {STATUS_STEPS.map((step, index) => {
                                        const isDone    = index < currentStepIndex;
                                        const isCurrent = index === currentStepIndex;
                                        const isPending = index > currentStepIndex;

                                        return (
                                            <div
                                                key={step.key}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    opacity: isPending ? 0.4 : 1,
                                                }}
                                            >
                                                {/* Step icon */}
                                                <div style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '50%',
                                                    background: isDone
                                                        ? '#10b981'
                                                        : isCurrent
                                                            ? '#3b82f6'
                                                            : '#e5e7eb',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 16,
                                                    flexShrink: 0,
                                                }}>
                                                    {isDone ? '✓' : step.icon}
                                                </div>

                                                {/* Step label */}
                                                <div>
                                                    <p style={{
                                                        fontSize: 14,
                                                        fontWeight: isCurrent ? 600 : 400,
                                                        color: isCurrent
                                                            ? '#1d4ed8'
                                                            : isDone
                                                                ? '#065f46'
                                                                : '#6b7280',
                                                        margin: 0,
                                                    }}>
                                                        {step.label}
                                                    </p>
                                                    {isCurrent && (
                                                        <p style={{
                                                            fontSize: 12,
                                                            color: '#6b7280',
                                                            margin: '2px 0 0 0'
                                                        }}>
                                                            {statusData.message}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Auto-refresh notice */}
                                {statusData.status !== 'ready' && (
                                    <p style={{
                                        fontSize: 12,
                                        color: '#9ca3af',
                                        marginTop: 24,
                                        textAlign: 'center'
                                    }}>
                                        🔄 Auto-refreshing every 15 seconds...
                                    </p>
                                )}
                            </div>

                            {/* ── Download card — shown when ready ── */}
                            {statusData.status === 'ready' && statusData.letterId && (
                                <div className="ocr-upload-card">
                                    <div className="ocr-upload-success-banner"
                                        style={{ marginBottom: 16 }}>
                                        🎉 Your letter is ready!
                                    </div>

                                    <p style={{
                                        fontSize: 13,
                                        color: '#6b7280',
                                        marginBottom: 16
                                    }}>
                                        Generated on{' '}
                                        {new Date(statusData.generatedAt)
                                            .toLocaleString('en-MY')}
                                    </p>

                                    <div style={{
                                        display: 'flex',
                                        gap: 8,
                                        flexDirection: 'column'
                                    }}>
                                        <a
                                            href={`${API}${statusData.downloadPdf}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="ocr-upload-btn"
                                            style={{
                                                display: 'block',
                                                textAlign: 'center',
                                                textDecoration: 'none'
                                            }}
                                        >
                                            📥 Download PDF
                                        </a>
                                        <a
                                            href={`${API}${statusData.downloadDocx}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="ocr-upload-btn-clear"
                                            style={{
                                                display: 'block',
                                                textAlign: 'center',
                                                textDecoration: 'none'
                                            }}
                                        >
                                            📄 Download DOCX
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* ── Manual refresh ── */}
                            <button
                                className="ocr-upload-btn-clear"
                                onClick={fetchStatus}
                                style={{ width: '100%', marginTop: 8 }}
                            >
                                🔄 Refresh Now
                            </button>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}