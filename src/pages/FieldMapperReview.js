import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import StaffLayout from "../components/StaffLayout";
import '../styles/FieldMapperReview.css';

const API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

// ── Helpers ────────────────────────────────────────────────────────

function statusClass(status) {
    switch (status) {
        case 'PASS': return 'pass';
        case 'WARN': return 'warn';
        case 'FAIL': return 'fail';
        case 'SKIP': return 'skip';
        default:     return '';
    }
}

function statusBadge(status) {
    switch (status) {
        case 'PASS': return '✅ Valid';
        case 'WARN': return '⚠️ Warning';
        case 'FAIL': return '❌ Invalid';
        case 'SKIP': return '— Optional';
        default:     return '';
    }
}

// ── Component ──────────────────────────────────────────────────────

export default function FieldMapperReview() {

    const { mappingId } = useParams();
    const navigate      = useNavigate();

    // ── Staff identity (for StaffLayout) ──────────────────────────
    const [staffName, setStaffName] = useState('');
    const [staffData, setStaffData] = useState(null);

    useEffect(() => {
        const user = authService.getCurrentUser();
        if (user) {
            setStaffName(user.name || user.username || '');
            setStaffData(user);
        }
    }, []);

    // ── Mapping state ──────────────────────────────────────────────
    const [fields,             setFields]             = useState({});
    const [regexValidation,    setRegexValidation]    = useState({});
    const [businessViolations, setBusinessViolations] = useState([]);
    const [counts,             setCounts]             = useState(null);
    const [mappingStatus,      setMappingStatus]      = useState(null);
    const [loading,            setLoading]            = useState(false);
    const [fetching,           setFetching]           = useState(true);
    const [confirmed,          setConfirmed]          = useState(false);
    const [error,              setError]              = useState(null);
    const [confirmError,       setConfirmError]       = useState(null);

    // ── Fetch mapping on mount ─────────────────────────────────────
    useEffect(() => {
        const fetchMapping = async () => {
            try {
                const res  = await authService.fetchWithAuth(
                    `${API}/letters/mapping/${mappingId}`
                );
                const data = await res.json();

                const mapped = JSON.parse(data.mappedFields);
                setFields(mapped);

                if (data.validationSummary) {
                    try {
                        const summary = JSON.parse(data.validationSummary);
                        setRegexValidation(summary.regexValidation   ?? {});
                        setBusinessViolations(summary.businessValidation ?? []);
                        setCounts(summary.counts ?? null);
                    } catch (_) { /* malformed summary — degrade gracefully */ }
                }

                setMappingStatus(data.status);
                if (data.status === 'confirmed') setConfirmed(true);

            } catch (e) {
                setError('Failed to load mapping data.');
                console.error(e);
            } finally {
                setFetching(false);
            }
        };

        if (mappingId) fetchMapping();
    }, [mappingId]);

    // ── Handlers ───────────────────────────────────────────────────
    const handleChange = (placeholder, value) => {
        setFields(prev => ({ ...prev, [placeholder]: value }));
        setConfirmError(null);
    };

    const handleConfirm = async () => {
        if (mappingStatus === 'validation_failed') {
            setConfirmError(
                'This mapping has validation errors that must be fixed before confirming. ' +
                'Please correct all fields marked ❌ Invalid below.'
            );
            return;
        }
        setLoading(true);
        setConfirmError(null);
        try {
            const response = await authService.fetchWithAuth(
                `${API}/letters/mapping/confirm/${mappingId}`,
                { method: 'PUT', body: JSON.stringify(fields) }
            );
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || 'Failed to confirm mapping.');
            }
            setConfirmed(true);
        } catch (e) {
            setConfirmError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Derived flags ──────────────────────────────────────────────
    const hasHardErrors = mappingStatus === 'validation_failed' ||
        Object.values(regexValidation).some(r => r?.status === 'FAIL');

    const hasWarnings = mappingStatus === 'pending_with_warnings' ||
        Object.values(regexValidation).some(r => r?.status === 'WARN') ||
        businessViolations.some(v => v?.severity === 'WARNING');

    // ── Topbar title reflects state ────────────────────────────────
    const pageTitle = confirmed          ? 'Mapping Confirmed'
                    : hasHardErrors      ? 'Review Mapping — Errors Found'
                    : hasWarnings        ? 'Review Mapping — Warnings'
                    :                     'Review Mapped Fields';

    // ── Render ─────────────────────────────────────────────────────
    if (fetching) {
        return (
            <StaffLayout title="Review Mapped Fields" staffName={staffName} staffData={staffData}>
                <div className="field-mapper-container">
                    <p className="field-mapper-loading">Loading mapping data...</p>
                </div>
            </StaffLayout>
        );
    }

    if (error) {
        return (
            <StaffLayout title="Review Mapped Fields" staffName={staffName} staffData={staffData}>
                <div className="field-mapper-container">
                    <p className="field-mapper-error-text">{error}</p>
                    <button
                        className="field-mapper-btn"
                        onClick={() => navigate('/staff/letter/upload-template')}
                        style={{ marginTop: 16 }}
                    >
                        ← Back to Letter Templates
                    </button>
                </div>
            </StaffLayout>
        );
    }

    return (
        <StaffLayout title={pageTitle} staffName={staffName} staffData={staffData}>
            <div className="field-mapper-container">

                <h2 className="field-mapper-title">Review and Confirm Mapped Fields</h2>
                <p className="field-mapper-subtitle">
                    Review the extracted fields and correct any errors before confirming.
                </p>

                {/* ── Confirmed state ── */}
                {confirmed ? (
                    <div className="field-mapper-confirmed-card">
                        <p className="field-mapper-confirmed-text">
                            ✅ Mapping confirmed! You can now generate the letter.
                        </p>
                        <button
                            className="field-mapper-btn"
                            style={{ marginTop: 16 }}
                            onClick={() => navigate(`/staff/letter/generate/${mappingId}`)}
                        >
                            Generate Letter →
                        </button>
                    </div>
                ) : (
                    <>
                        {/* ── Validation summary banner ── */}
                        {counts && (
                            <div className={`field-mapper-summary-banner ${
                                hasHardErrors ? 'banner-error' :
                                hasWarnings   ? 'banner-warn'  : 'banner-ok'
                            }`}>
                                <span className="banner-icon">
                                    {hasHardErrors ? '❌' : hasWarnings ? '⚠️' : '✅'}
                                </span>
                                <div className="banner-text">
                                    {hasHardErrors
                                        ? `${counts.regexFailures} field(s) failed validation — fix them before confirming.`
                                        : hasWarnings
                                        ? `${Number(counts.regexWarnings) + Number(counts.businessWarnings)} warning(s) — review before confirming.`
                                        : 'All fields passed validation — ready to confirm.'
                                    }
                                    {counts.businessErrors > 0 && (
                                        <span className="banner-sub">
                                            {' '}Also {counts.businessErrors} business rule error(s) below.
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Business violations panel ── */}
                        {businessViolations.length > 0 && (
                            <div className="field-mapper-biz-panel">
                                <p className="biz-panel-title">⚙️ Business Rule Checks</p>
                                <ul className="biz-panel-list">
                                    {businessViolations.map((v, i) => (
                                        <li
                                            key={i}
                                            className={`biz-panel-item biz-${v.severity?.toLowerCase()}`}
                                        >
                                            <span className="biz-severity">
                                                {v.severity === 'ERROR' ? '❌' : '⚠️'}
                                            </span>
                                            <span className="biz-rule">[{v.rule}]</span>
                                            <span className="biz-message">{v.message}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* ── Field rows ── */}
                        <div className="field-mapper-card">
                            {Object.entries(fields).map(([placeholder, value]) => {
                                const validation  = regexValidation[placeholder];
                                const fieldStatus = validation?.status ?? null;

                                return (
                                    <div
                                        key={placeholder}
                                        className={`field-mapper-row ${fieldStatus ? `row-${statusClass(fieldStatus)}` : ''}`}
                                    >
                                        <div className="field-mapper-placeholder-col">
                                            <span className="field-mapper-placeholder">
                                                {placeholder}
                                            </span>
                                            {fieldStatus && (
                                                <span className={`field-status-badge badge-${statusClass(fieldStatus)}`}>
                                                    {statusBadge(fieldStatus)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="field-mapper-arrow">→</div>

                                        <div className="field-mapper-input-col">
                                            <input
                                                className={`field-mapper-input ${fieldStatus ? `input-${statusClass(fieldStatus)}` : ''}`}
                                                value={value}
                                                onChange={e => handleChange(placeholder, e.target.value)}
                                                placeholder="Enter value..."
                                            />
                                            {validation?.message && fieldStatus !== 'PASS' && fieldStatus !== 'SKIP' && (
                                                <p className={`field-validation-msg msg-${statusClass(fieldStatus)}`}>
                                                    {validation.message}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {confirmError && (
                                <div className="field-mapper-confirm-error">
                                    ❌ {confirmError}
                                </div>
                            )}

                            <button
                                className={`field-mapper-btn ${hasHardErrors ? 'btn-disabled' : ''}`}
                                onClick={handleConfirm}
                                disabled={loading || hasHardErrors}
                                title={hasHardErrors
                                    ? 'Fix all invalid fields before confirming'
                                    : 'Confirm mapping'}
                            >
                                {loading        ? 'Confirming...'
                                : hasHardErrors ? '❌ Fix Errors to Confirm'
                                : hasWarnings   ? '⚠️ Confirm with Warnings'
                                :                 '✅ Confirm Mapping'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </StaffLayout>
    );
}