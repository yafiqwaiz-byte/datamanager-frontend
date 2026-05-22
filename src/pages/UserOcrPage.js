import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/OcrUpload.css';
import { authService } from "../services/authService";

const API = "http://localhost:8080/api";

export default function UserOcrPage() {

    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
        setResult(null);
        setError(null);
    };

    const handleUpload = async () => {
        if (!file) { setError('Please select an image first'); return; }
        setLoading(true);
        setError(null);

       
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await authService.fetchWithAuth(`${API}/files/ocr/upload`,{
                method: 'POST',
                headers: {},
                body: formData,
            });
            if(!res.ok){
                const msg = await res.text();
                 throw new Error(typeof msg === 'string' ? msg : 'OCR failed, please try again.');
            }
            const data = await res.json();
            setResult(data);
        } catch (e) {
            const msg = e.response?.data?.message || e.response?.data || 'OCR failed, please try again.';
            setError(typeof msg === 'string' ? msg : 'OCR failed, please try again.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setError(null);
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
                    <button className="signout-btn" onClick={() => navigate('/user-home')}>← Back</button>
                </div>
            </nav>

            <main className="dashboard-main">
                <div className="ocr-upload-container">
                    <h1 className="ocr-upload-title">OCR Scan</h1>

                    {/* Upload Card */}
                    <div className="ocr-upload-card">
                        <p className="ocr-upload-step-label">Step 1 — Upload Image</p>

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
                                <p className="ocr-upload-drop-text">
                                    Click to select an image · JPG, PNG supported
                                </p>
                            )}
                        </label>

                        {file && (
                            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
                                📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                            </p>
                        )}

                        {error && (
                            <p style={{ fontSize: 13, color: '#991b1b', marginTop: 8 }}>{error}</p>
                        )}

                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                            {file && !loading && (
                                <button
                                    onClick={handleReset}
                                    style={{
                                        padding: '11px 16px',
                                        background: '#f3f4f6',
                                        color: '#374151',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 8,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    Clear
                                </button>
                            )}
                            <button
                                onClick={handleUpload}
                                disabled={!file || loading}
                                className="ocr-upload-btn"
                                style={{ flex: 1 }}
                            >
                                {loading ? '🔍 Extracting text...' : '🔍 Extract Text'}
                            </button>
                        </div>
                    </div>

                    {/* Result Card */}
                    {result && (
                        <div className="ocr-upload-card">
                            <p className="ocr-upload-step-label">Step 2 — Extracted Text</p>

                            {result.status === 'failed' ? (
                                <p style={{ color: '#e53e3e', fontSize: 13 }}>
                                    OCR Error: {result.errorLog}
                                </p>
                            ) : (
                                <>
                                    <div className="ocr-upload-success-card">
                                        <p className="ocr-upload-success-text">
                                            ✅ Text extracted from {result.upload?.fileName}
                                        </p>
                                    </div>

                                    <textarea
                                        readOnly
                                        value={result.extractedText || 'No text detected'}
                                        style={{
                                            width: '100%',
                                            minHeight: 200,
                                            padding: 12,
                                            border: '1px solid #e5e7eb',
                                            borderRadius: 8,
                                            fontSize: 13,
                                            fontFamily: 'monospace',
                                            resize: 'vertical',
                                            background: '#f9fafb',
                                            color: '#374151',
                                            boxSizing: 'border-box',
                                            marginBottom: 12,
                                        }}
                                    />

                                    <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
                                        🕐 {new Date(result.processedAt).toLocaleString('en-MY')}
                                    </p>

                                    <button
                                        onClick={() => { navigator.clipboard.writeText(result.extractedText); alert('Text copied!'); }}
                                        className="ocr-upload-btn"
                                        style={{ background: '#6b7280' }}
                                    >
                                        📋 Copy Text
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