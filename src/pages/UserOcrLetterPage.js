import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/OcrUpload.css';
import axios from "axios";

const API = "http://localhost:8080/api";

export default function UserOcrLetterPage() {

    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [mapping, setMapping] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const navigate = useNavigate();

    // ── Fetch available letter templates on mount ──────────────────
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const res = await axios.get(`${API}/letters/templates/all`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setTemplates(res.data);
            } catch (e) {
                console.error('Failed to fetch templates:', e);
            }
        };
        fetchTemplates();
    }, []);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
        setResult(null);
        setError(null);
    };

    // ── Step 1: Upload image and extract text via OCR ──────────────
    const handleUpload = async () => {
        if (!file) { setError('Please select an image first'); return; }
        if (!selectedTemplate) { setError('Please select a letter template first'); return; }
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('authToken');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(`${API}/files/ocr/upload`, formData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setResult(res.data);
        } catch (e) {
            const msg = e.response?.data?.message || e.response?.data || 'OCR failed, please try again.';
            setError(typeof msg === 'string' ? msg : 'OCR failed, please try again.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: Auto-map OCR result to selected template ──────────
    const handleAutoMap = async () => {
        if (!result?.ocrId || !selectedTemplate) return;
        setMapping(true);
        setError(null);
        try {
            const res = await axios.post(
                `${API}/letters/mapping/auto?ocrId=${result.ocrId}&templateId=${selectedTemplate}`,
                {},
                { headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } }
            );
            navigate(`/staff/letter/review/${res.data.mappingId}`);
        } catch (e) {
            const msg = e.response?.data?.message || e.response?.data || 'Auto-mapping failed, please try again.';
            setError(typeof msg === 'string' ? msg : 'Auto-mapping failed, please try again.');
            console.error(e);
        } finally {
            setMapping(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setError(null);
        setSelectedTemplate("");
    };

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
                <button className="signout-btn" onClick={() => navigate('/user/ocr-services')}>← Back</button>
            </div>
        </nav>

        <main className="dashboard-main">
            <div className="ocr-upload-container">
                <h1 className="ocr-upload-title">Generate Letter</h1>

                {/* Step 1: Select template + upload image */}
                <div className="ocr-upload-card">
                    <p className="ocr-upload-step-label">
                        <span className="ocr-upload-step-badge">1</span>
                        Select template &amp; upload image
                    </p>

                    {templates.length === 0 ? (
                        <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>
                            No templates available. Ask staff to upload a template first.
                        </p>
                    ) : (
                        <select
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                            className="ocr-upload-select"
                        >
                            <option value="default">— Select a letter template —</option>
                            {templates.map((t) => (
                                <option key={t.letterTemplateId} value={t.letterTemplateId}>
                                    {t.templateName}
                                </option>
                            ))}
                        </select>
                    )}

                    <label className="ocr-upload-dropzone">
                        <input
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        {preview ? (
                            <img src={preview} alt="Preview" className="ocr-upload-preview" />
                        ) : (
                            <>
                                <p className="ocr-upload-drop-text">Click to select a document image</p>
                                <p className="ocr-upload-drop-sub">JPG or PNG · up to 10 MB</p>
                            </>
                        )}
                    </label>

                    {file && (
                        <p className="ocr-upload-file-info">
                            📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </p>
                    )}

                    {error && <p className="ocr-upload-error">{error}</p>}

                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        {file && !loading && (
                            <button onClick={handleReset} className="ocr-upload-btn-clear">
                                Clear
                            </button>
                        )}
                        <button
                            onClick={handleUpload}
                            disabled={!file || !selectedTemplate || loading}
                            className="ocr-upload-btn"
                            style={{ flex: 1 }}
                        >
                            {loading ? '🔍 Extracting text...' : '🔍 Extract Text'}
                        </button>
                    </div>
                </div>

                {/* Step 2: Review extracted text + trigger auto-map */}
                {result && (
                    <div className="ocr-upload-card">
                        <p className="ocr-upload-step-label">
                            <span className="ocr-upload-step-badge">2</span>
                            Review &amp; map to template
                        </p>

                        {result.status === 'failed' ? (
                            <p className="ocr-upload-error">
                                OCR Error: {result.errorLog}
                            </p>
                        ) : (
                            <>
                                <div className="ocr-upload-success-banner">
                                    ✅ Text extracted from {result.upload?.fileName}
                                </div>

                                <textarea
                                    readOnly
                                    value={result.extractedText || 'No text detected'}
                                    style={{
                                        width: '100%',
                                        minHeight: 200,
                                        padding: 12,
                                        border: '0.5px solid #e5e7eb',
                                        borderRadius: 8,
                                        fontSize: 13,
                                        fontFamily: 'monospace',
                                        resize: 'vertical',
                                        background: '#f9fafb',
                                        color: '#374151',
                                        boxSizing: 'border-box',
                                        marginBottom: 12,
                                        outline: 'none',
                                    }}
                                />

                                <p className="ocr-upload-meta">
                                    🕐 {new Date(result.processedAt).toLocaleString('en-MY')}
                                </p>

                                <button
                                    onClick={handleAutoMap}
                                    disabled={mapping}
                                    className="ocr-upload-btn"
                                >
                                    {mapping ? '⏳ Mapping...' : '⚡ Map to Template'}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </main>
    </div>
 );
}