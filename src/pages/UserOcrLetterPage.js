import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import '../styles/OcrUpload.css';

const API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

export default function UserOcrLetterPage() {

    const navigate = useNavigate();

    const [file,             setFile]           = useState(null);
    const [preview,          setPreview]        = useState(null);
    const [processing,       setProcessing]     = useState(false); // covers OCR + submit
    const [processingStep,   setProcessingStep] = useState('');    // status label during processing
    const [error,            setError]          = useState(null);
    const [templates,        setTemplates]      = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [submitted,        setSubmitted]      = useState(false);
    const [submittedOcrId,   setSubmittedOcrId] = useState(null);

    // ── Fetch letter templates on mount ────────────────────────────
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res  = await authService.fetchWithAuth(`${API}/letters/templates/all`);
                const data = await res.json();
                setTemplates(data);
            } catch (e) {
                console.error('Failed to fetch templates:', e);
            }
        };
        fetchTemplates();
    }, []);

    // ── Handlers ───────────────────────────────────────────────────
    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
        setError(null);
    };

    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setError(null);
        setSelectedTemplate('');
        setSubmitted(false);
        setSubmittedOcrId(null);
        setProcessingStep('');
    };

    // ✅ FIX 1 — Back button now goes to /user-home directly (matches App.js route)
    // and is wrapped so any navigation error doesn't crash silently
    const handleBack = () => {
        try {
            navigate('/user-home');
        } catch (e) {
            console.error('Navigation failed:', e);
            window.location.href = '/user-home';
        }
    };

    // ── Single action: OCR extract → submit to staff ───────────────
    // User never sees extracted text — happens in background
    const handleUploadAndSubmit = async () => {
        if (!file) {
            setError('Please select an image first.');
            return;
        }
        if (!selectedTemplate) {
            setError('Please select a letter template first.');
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            // ── Stage 1: OCR extract ───────────────────────────────
            setProcessingStep('Extracting text from document...');

            const formData = new FormData();
            formData.append('file', file);

            const ocrRes = await authService.fetchWithAuth(`${API}/files/ocr/upload`, {
                method: 'POST',
                headers: {},
                body: formData,
            });
            if (!ocrRes.ok) {
                const msg = await ocrRes.text();
                throw new Error(msg || 'OCR failed, please try again.');
            }
            const ocrData = await ocrRes.json();

            if (ocrData.status === 'failed') {
                throw new Error('OCR could not extract text from this image. Please try a clearer image.');
            }
            if (!ocrData.ocrId) {
                throw new Error('OCR did not return a valid reference ID. Please try again.');
            }

            // ── Stage 2: Submit to staff queue ─────────────────────
            setProcessingStep('Submitting to staff...');

            const submitRes = await authService.fetchWithAuth(
                `${API}/letters/submit?ocrId=${ocrData.ocrId}&templateId=${selectedTemplate}`,
                { method: 'POST' }
            );
            if (!submitRes.ok) {
                const msg = await submitRes.text();
                throw new Error(msg || 'Submission failed, please try again.');
            }
            const submitData = await submitRes.json();

            if (!submitData.ocrId) {
                throw new Error('Submission succeeded but no reference ID was returned.');
            }

            // ── Done ───────────────────────────────────────────────
            setSubmittedOcrId(submitData.ocrId);
            setSubmitted(true);

        } catch (e) {
            setError(e.message || 'Something went wrong. Please try again.');
        } finally {
            setProcessing(false);
            setProcessingStep('');
        }
    };

    // ✅ FIX 2 — Track Status now uses the correct route path
    // matching App.js: /letter/status/:ocrId
    const handleTrackStatus = () => {
        if (!submittedOcrId) return;
        navigate(`/letter/status/${submittedOcrId}`);
    };

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
                    <button
                        className="signout-btn"
                        onClick={handleBack}
                        disabled={processing}
                    >
                        ← Back
                    </button>
                </div>
            </nav>

            <main className="dashboard-main">
                <div className="ocr-upload-container">
                    <h1 className="ocr-upload-title">Request a Letter</h1>

                    {/* ── Success state: reference ID + track button ── */}
                    {submitted ? (
                        <div className="ocr-upload-card">
                            <div className="ocr-upload-success-banner"
                                style={{ marginBottom: 20 }}>
                                ✅ Request submitted successfully!
                            </div>

                            <p style={{
                                fontSize: 14,
                                color: '#374151',
                                marginBottom: 20,
                                lineHeight: 1.6,
                            }}>
                                Your document has been sent to staff for processing.
                                You will be notified once your letter is ready to download.
                            </p>

                            {/* Reference ID box */}
                            <div style={{
                                background: '#f8fafc',
                                border: '1px solid #e5e7eb',
                                borderRadius: 8,
                                padding: '14px 16px',
                                marginBottom: 24,
                            }}>
                                <p style={{
                                    fontSize: 11,
                                    color: '#9ca3af',
                                    margin: '0 0 6px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.6px',
                                    fontWeight: 600,
                                }}>
                                    Reference ID
                                </p>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                }}>
                                    <p style={{
                                        fontSize: 13,
                                        fontFamily: 'monospace',
                                        color: '#1a1a2e',
                                        fontWeight: 600,
                                        margin: 0,
                                        wordBreak: 'break-all',
                                    }}>
                                        {submittedOcrId}
                                    </p>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(submittedOcrId);
                                            alert('Reference ID copied!');
                                        }}
                                        style={{
                                            padding: '5px 10px',
                                            background: '#f3f4f6',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: 6,
                                            fontSize: 12,
                                            cursor: 'pointer',
                                            fontFamily: 'inherit',
                                            flexShrink: 0,
                                            color: '#374151',
                                        }}
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    className="ocr-upload-btn-clear"
                                    onClick={handleReset}
                                    style={{ flex: 1 }}
                                >
                                    + New Request
                                </button>
                                <button
                                    className="ocr-upload-btn"
                                    onClick={handleTrackStatus}
                                    style={{ flex: 1 }}
                                >
                                    📬 Track Status
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* ── Upload form ── */
                        <div className="ocr-upload-card">
                            <p className="ocr-upload-step-label">
                                Select letter type &amp; upload your document
                            </p>

                            {/* Template selector */}
                            {templates.length === 0 ? (
                                <p style={{
                                    fontSize: 13,
                                    color: '#9ca3af',
                                    marginBottom: 16,
                                }}>
                                    No templates available. Ask staff to upload a template first.
                                </p>
                            ) : (
                                <select
                                    value={selectedTemplate}
                                    onChange={e => setSelectedTemplate(e.target.value)}
                                    className="ocr-upload-select"
                                    disabled={processing}
                                >
                                    <option value="">— Select letter type —</option>
                                    {templates.map(t => (
                                        <option
                                            key={t.letterTemplateId}
                                            value={t.letterTemplateId}
                                        >
                                            {t.templateName}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* File upload dropzone */}
                            <label
                                className="ocr-upload-dropzone"
                                style={{ pointerEvents: processing ? 'none' : 'auto' }}
                            >
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                    disabled={processing}
                                />
                                {preview ? (
                                    <img
                                        src={preview}
                                        alt="Preview"
                                        className="ocr-upload-preview"
                                    />
                                ) : (
                                    <>
                                        <p className="ocr-upload-drop-text">
                                            Click to select your document image
                                        </p>
                                        <p className="ocr-upload-drop-sub">
                                            JPG or PNG · up to 10 MB
                                        </p>
                                    </>
                                )}
                            </label>

                            {file && (
                                <p className="ocr-upload-file-info">
                                    📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                </p>
                            )}

                            {/* Processing steps indicator */}
                            {processing && processingStep && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '10px 14px',
                                    background: '#fffbeb',
                                    border: '1px solid #fde68a',
                                    borderRadius: 8,
                                    marginTop: 12,
                                    fontSize: 13,
                                    color: '#92600a',
                                    fontWeight: 500,
                                }}>
                                    <span style={{ fontSize: 16 }}>⏳</span>
                                    {processingStep}
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <p className="ocr-upload-error">{error}</p>
                            )}

                            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                {file && !processing && (
                                    <button
                                        onClick={handleReset}
                                        className="ocr-upload-btn-clear"
                                    >
                                        Clear
                                    </button>
                                )}
                                <button
                                    onClick={handleUploadAndSubmit}
                                    disabled={!file || !selectedTemplate || processing}
                                    className="ocr-upload-btn"
                                    style={{ flex: 1 }}
                                >
                                    {processing
                                        ? '⏳ Processing...'
                                        : '📨 Submit Request'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}