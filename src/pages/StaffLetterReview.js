import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import StaffLayout from "../components/StaffLayout";
import '../styles/StaffLetterReview.css';

const API = "http://localhost:8080/api";

export default function StaffLetterReview() {

    const { ocrId } = useParams();
    const navigate  = useNavigate();

    const [staffName, setStaffName] = useState('');
    const [staffData, setStaffData] = useState(null);

    useEffect(() => {
        const user = authService.getCurrentUser();
        if (user) {
            setStaffName(user.name || user.username || '');
            setStaffData(user);
        }
    }, []);

    // ── State ──────────────────────────────────────────────────────
    const [ocrData,         setOcrData]         = useState(null);
    const [mappingData,     setMappingData]     = useState(null);
    const [validationData,  setValidationData]  = useState(null);
    const [editedFields,    setEditedFields]    = useState({});
    const [generatedLetter, setGeneratedLetter] = useState(null);
    const [step,            setStep]            = useState('review');
    const [loading,         setLoading]         = useState(false);
    const [pageLoading,     setPageLoading]     = useState(true);
    const [error,           setError]           = useState(null);
    const [message,         setMessage]         = useState(null);

    // ── Load on mount ──────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            setPageLoading(true);
            try {
                // Load OCR status
                const res = await authService.fetchWithAuth(
                    `${API}/letters/status/${ocrId}`
                );
                if (!res.ok) throw new Error('Failed to load request');
                const data = await res.json();
                setOcrData(data);

                // If already mapped — load existing mapping
                if (['mapping', 'confirmed', 'ready'].includes(data.status)) {
                    await loadExistingMapping();
                }

                // If already done
                if (data.status === 'ready' && data.letterId) {
                    setGeneratedLetter(data);
                    setStep('done');
                }
            } catch (e) {
                setError('Failed to load request details.');
            } finally {
                setPageLoading(false);
            }
        };
        init();
    }, [ocrId]);

    const loadExistingMapping = async () => {
        try {
            const res = await authService.fetchWithAuth(
                `${API}/letters/mapping/by-ocr/${ocrId}`
            );
            if (res.status === 204) return; // no mapping yet
            if (!res.ok) return;

            const data = await res.json();
            if (data?.mappingId) {
                setMappingData(data);
                setEditedFields(JSON.parse(data.mappedFields || '{}'));
                if (data.validationSummary && data.validationSummary !== '{}') {
                    setValidationData(JSON.parse(data.validationSummary));
                }
                setStep('confirm');
            }
        } catch (e) {
            console.warn('No existing mapping:', e.message);
        }
    };

    // ── Run auto-map ───────────────────────────────────────────────
    const handleAutoMap = async () => {
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            // Get templateId from queue
            const qRes  = await authService.fetchWithAuth(`${API}/letters/queue/all`);
            const queue = await qRes.json();
            const item  = queue.find(q => q.ocrId === ocrId);

            if (!item?.selectedTemplateId) {
                throw new Error('No letter type selected for this request.');
            }

            const res = await authService.fetchWithAuth(
                `${API}/letters/mapping/auto?ocrId=${ocrId}&templateId=${item.selectedTemplateId}`,
                { method: 'POST' }
            );
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Auto-mapping failed.');
            }

            const data = await res.json();
            setMappingData(data);
            setEditedFields(JSON.parse(data.mappedFields || '{}'));
            if (data.validationSummary && data.validationSummary !== '{}') {
                setValidationData(JSON.parse(data.validationSummary));
            }
            setStep('confirm');
            setMessage({ type: 'success', text: 'Fields mapped. Please review below.' });

        } catch (e) {
            setError(e.message || 'Auto-mapping failed.');
        } finally {
            setLoading(false);
        }
    };

    // ── Confirm + generate ─────────────────────────────────────────
    const handleConfirm = async () => {
        if (!mappingData?.mappingId) return;
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            // 1. Confirm fields
            const confirmRes = await authService.fetchWithAuth(
                `${API}/letters/mapping/confirm/${mappingData.mappingId}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(editedFields),
                }
            );
            if (!confirmRes.ok) {
                const msg = await confirmRes.text();
                throw new Error(msg || 'Confirmation failed.');
            }

            setMessage({ type: 'success', text: 'Fields confirmed. Generating letter...' });

            // 2. Generate letter
            const genRes = await authService.fetchWithAuth(
                `${API}/letters/generate/${mappingData.mappingId}`,
                { method: 'POST' }
            );
            if (!genRes.ok) {
                const msg = await genRes.text();
                throw new Error(msg || 'Letter generation failed.');
            }

            const genData = await genRes.json();
            setGeneratedLetter(genData);
            setStep('done');

        } catch (e) {
            setError(e.message || 'Failed to confirm and generate.');
        } finally {
            setLoading(false);
        }
    };

    // ── Validation helpers ─────────────────────────────────────────
    const getFieldValidation = (placeholder) =>
        validationData?.regexValidation?.[placeholder] || null;

    const getFieldBorderClass = (placeholder) => {
        const v = getFieldValidation(placeholder);
        if (!v) return '';
        if (v.status === 'FAIL') return 'slr-field--error';
        if (v.status === 'WARN') return 'slr-field--warn';
        return 'slr-field--ok';
    };

    const errorCount   = validationData?.counts?.regexFailures   || 0;
    const warnCount    = validationData?.counts?.regexWarnings    || 0;
    const bizErrors    = validationData?.counts?.businessErrors   || 0;
    const bizWarnings  = validationData?.counts?.businessWarnings || 0;
    const hasErrors    = errorCount > 0 || bizErrors > 0;
    const hasWarnings  = warnCount  > 0 || bizWarnings > 0;

    // ── Render ─────────────────────────────────────────────────────
    return (
        <StaffLayout
            title="Review Letter Request"
            staffName={staffName}
            staffData={staffData}
        >
            <div className="slr-container">

                {/* ── Back ── */}
                <button
                    className="slr-back-btn"
                    onClick={() => navigate('/staff/letter/queue')}
                >
                    ← Back to Queue
                </button>

                {/* ── Page loading ── */}
                {pageLoading && (
                    <div className="slr-card slr-card--center">
                        <p className="slr-muted">Loading request...</p>
                    </div>
                )}

                {!pageLoading && (
                    <>
                        {/* ── Alerts ── */}
                        {error && (
                            <div className="slr-alert slr-alert--error">
                                ❌ {error}
                            </div>
                        )}
                        {message && (
                            <div className={`slr-alert ${
                                message.type === 'success'
                                    ? 'slr-alert--success'
                                    : 'slr-alert--warn'
                            }`}>
                                {message.type === 'success' ? '✅' : '⚠️'} {message.text}
                            </div>
                        )}

                        {/* ══ STEP: REVIEW ══ */}
                        {step === 'review' && (
                            <div className="slr-card">
                                <div className="slr-card__header">
                                    <h2 className="slr-card__title">📋 Submission Details</h2>
                                    <span className={`slq-badge slq-badge--${ocrData?.status || 'uploaded'}`}>
                                        {ocrData?.status || 'uploaded'}
                                    </span>
                                </div>

                                <div className="slr-meta-row">
                                    <div className="slr-meta-item">
                                        <span className="slr-meta-label">Reference ID</span>
                                        <span className="slr-meta-value slr-mono">{ocrId}</span>
                                    </div>
                                    <div className="slr-meta-item">
                                        <span className="slr-meta-label">Status</span>
                                        <span className="slr-meta-value">{ocrData?.status || '—'}</span>
                                    </div>
                                </div>

                                <div className="slr-card__divider" />

                                <p className="slr-info-text">
                                    ℹ️ Click <strong>Run Auto-Map</strong> to extract and map
                                    fields from the OCR text to the letter template.
                                    You can review and edit fields before generating.
                                </p>

                                <button
                                    className="slr-primary-btn"
                                    onClick={handleAutoMap}
                                    disabled={loading}
                                >
                                    {loading ? '⏳ Mapping...' : '⚙️ Run Auto-Map'}
                                </button>
                            </div>
                        )}

                        {/* ══ STEP: CONFIRM ══ */}
                        {step === 'confirm' && mappingData && (
                            <div className="slr-card">
                                <div className="slr-card__header">
                                    <h2 className="slr-card__title">📝 Review Mapped Fields</h2>
                                    <div className="slr-validation-counts">
                                        {hasErrors && (
                                            <span className="slr-count slr-count--error">
                                                ❌ {errorCount + bizErrors} error{errorCount + bizErrors !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                        {hasWarnings && (
                                            <span className="slr-count slr-count--warn">
                                                ⚠️ {warnCount + bizWarnings} warning{warnCount + bizWarnings !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                        {!hasErrors && !hasWarnings && (
                                            <span className="slr-count slr-count--ok">
                                                ✅ All fields valid
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <p className="slr-muted" style={{ marginBottom: 16 }}>
                                    Edit any incorrect values below before confirming.
                                </p>

                                {/* Validation banner */}
                                {hasErrors && (
                                    <div className="slr-alert slr-alert--error" style={{ marginBottom: 16 }}>
                                        ❌ Fix all errors before confirming.
                                    </div>
                                )}
                                {!hasErrors && hasWarnings && (
                                    <div className="slr-alert slr-alert--warn" style={{ marginBottom: 16 }}>
                                        ⚠️ There are warnings. Review highlighted fields.
                                    </div>
                                )}

                                {/* Business rule violations */}
                                {validationData?.businessValidation?.length > 0 && (
                                    <div className="slr-biz-violations">
                                        {validationData.businessValidation.map((v, i) => (
                                            <div
                                                key={i}
                                                className={`slr-biz-item ${
                                                    v.severity === 'ERROR'
                                                        ? 'slr-biz-item--error'
                                                        : 'slr-biz-item--warn'
                                                }`}
                                            >
                                                {v.severity === 'ERROR' ? '❌' : '⚠️'}
                                                <span>
                                                    <strong>[{v.rule}]</strong> {v.message}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Fields grid */}
                                <div className="slr-fields-grid">
                                    {Object.entries(editedFields).map(([ph, value]) => {
                                        const validation    = getFieldValidation(ph);
                                        const borderClass   = getFieldBorderClass(ph);
                                        const label         = ph
                                            .replace(/[\[\]]/g, '')
                                            .replace(/_/g, ' ');

                                        return (
                                            <div key={ph} className="slr-field">
                                                <label className="slr-field__label">
                                                    {label}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={value || ''}
                                                    onChange={(e) =>
                                                        setEditedFields(prev => ({
                                                            ...prev,
                                                            [ph]: e.target.value
                                                        }))
                                                    }
                                                    className={`slr-field__input ${borderClass}`}
                                                    placeholder="— not found —"
                                                />
                                                {validation
                                                    && validation.status !== 'PASS'
                                                    && validation.status !== 'SKIP'
                                                    && (
                                                    <p className={`slr-field__msg ${
                                                        validation.status === 'FAIL'
                                                            ? 'slr-field__msg--error'
                                                            : 'slr-field__msg--warn'
                                                    }`}>
                                                        {validation.message}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="slr-card__divider" />

                                {/* Actions */}
                                <div className="slr-actions">
                                    <button
                                        className="slr-secondary-btn"
                                        onClick={handleAutoMap}
                                        disabled={loading}
                                    >
                                        🔄 Re-map
                                    </button>
                                    <button
                                        className={`slr-primary-btn ${
                                            hasErrors ? 'slr-primary-btn--disabled' : ''
                                        }`}
                                        onClick={handleConfirm}
                                        disabled={loading || hasErrors}
                                    >
                                        {loading
                                            ? '⏳ Generating...'
                                            : hasErrors
                                                ? '❌ Fix errors first'
                                                : '✅ Confirm & Generate Letter'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ══ STEP: DONE ══ */}
                        {step === 'done' && generatedLetter && (
                            <div className="slr-card slr-card--center">
                                <span className="slr-done-icon">🎉</span>
                                <h2 className="slr-done-title">
                                    Letter Generated!
                                </h2>
                                <p className="slr-muted">
                                    The user has been notified and can now download their letter.
                                </p>

                                <div className="slr-download-row">
                                    <a
                                        href={`${API}${generatedLetter.downloadPdf}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="slr-primary-btn slr-link-btn"
                                    >
                                        📥 Download PDF
                                    </a>
                                    <a
                                        href={`${API}${generatedLetter.downloadDocx}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="slr-secondary-btn slr-link-btn"
                                    >
                                        📄 Download DOCX
                                    </a>
                                </div>

                                <button
                                    className="slr-back-btn"
                                    style={{ marginTop: 16 }}
                                    onClick={() => navigate('/staff/letter/queue')}
                                >
                                    ← Back to Queue
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </StaffLayout>
    );
}