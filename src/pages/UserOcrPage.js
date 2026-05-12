import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/Dashboard.css';
import axios from "axios";

function UserOcrPage() {

    const [file,setfile] = useState(null);
    const [preview,setPreview] = useState(null);
    const [loading,setLoading] = useState(false);
    const [result,setResult] = useState(null);
    const [error,setError] = useState(null);
    const [template,setTemplate] = useState([]);
    const [selectedTemplate,setSelectedTemplate] = useState("");
    const [mappingDone,setMappingDone] = useState(false);
    const navigate = useNavigate();

        useEffect(() => {
        const fetchTemplates = async () => {
            const token = localStorage.getItem('authToken');
            const res = await axios.get('http://localhost:8080/api/letters/templates/all', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setTemplates(res.data);
        };
        fetchTemplates();
    }, []);

    const handleFileChange = (e) =>{
        const select = e.target.files[0];
        if (!select) return;
        setfile(select);
        setPreview(URL.createObjectURL(select));
        setResult(null);
        setError(null);
    };

    const handleAutoMap = async() =>{
        if(!result?.ocrId || !selectedTemplate) return;

        try{
            await axios.post(`http://localhost:8080/api/letters/mapping/auto?ocrId=${result.ocrId}&templateId=${selectedTemplate}`,{
        },
        {
            headers:{ 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        setMappingDone(true);
        alert('Auto-mapping completed! Please review and confirm the mapping.');
        } catch (e){
            setError('Auto-mapping failed,Please try again.');
            console.error(e);
        }
    };

    const handleUpload = async() =>{
        if(!file) {
            setError('Please select an image first'); return;
        }
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('authToken');
        const formData = new FormData();
        formData.append('file',file);

        try {
            const res = await axios.post('http://localhost:8080/api/ocr/upload',formData,{
                headers:{ 
                    'Authorization': `Bearer ${token}`,
            }
            });
            console.log('OCR response:', res.data);
            setResult(res.data);
        } catch (e) {
            setError('OCR failed,Please try again.');
            console.error(e);
        } finally {
            setLoading(false);
        }
        
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
                <section className="welcome-section">
                    <div className="welcome-text">
                        <h1 className="welcome-heading">OCR Scan</h1>
                        <p className="welcome-subtitle">Upload an image to extract text automatically</p>
                    </div>
                </section>

                <section className="menu-section">
                    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>

                        {/* Upload Panel */}
                        <div style={panelStyle}>
                            <h2 style={panelTitle}>Upload Image</h2>

                            {/* Drop zone */}
                            <label style={dropZoneStyle}>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                                {preview ? (
                                    <img
                                        src={preview}
                                        alt="Preview"
                                        style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8, objectFit: 'contain' }}
                                    />
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                                        <p style={{ fontSize: 48 }}>🖼</p>
                                        <p style={{ fontSize: 14 }}>Click to select an image</p>
                                        <p style={{ fontSize: 12 }}>JPG, PNG supported</p>
                                    </div>
                                )}
                            </label>

                            {file && (
                                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
                                    📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                </p>
                            )}

                            {error && (
                                <p style={{ color: '#e53e3e', fontSize: 13, marginTop: 8 }}>{error}</p>
                            )}

                            <button
                                onClick={handleUpload}
                                disabled={!file || loading}
                                style={{
                                    marginTop: 16,
                                    width: '100%',
                                    padding: '12px 0',
                                    background: !file || loading ? '#a78bfa' : '#7c3aed',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 15,
                                    fontWeight: 600,
                                    cursor: !file || loading ? 'not-allowed' : 'pointer',
                                    fontFamily: 'inherit'
                                }}
                            >
                                {loading ? '🔍 Extracting text...' : '🔍 Extract Text'}
                            </button>
                        </div>

                        {/* Result Panel */}
                        {result && (
                            <div style={{ ...panelStyle, flex: 2 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <h2 style={panelTitle}>Extracted Text</h2>
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                                        background: result.status === 'success' ? '#dcfce7' : '#fee2e2',
                                        color: result.status === 'success' ? '#166534' : '#991b1b'
                                    }}>
                                        {result.status}
                                    </span>
                                </div>

                                {result.status === 'failed' ? (
                                    <p style={{ color: '#e53e3e', fontSize: 13 }}>
                                        OCR Error: {result.errorLog}
                                    </p>
                                ) : (
                                    <>
                                        {/* Raw extracted text */}
                                        <div style={{
                                            background: '#f9fafb',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: 8,
                                            padding: 16,
                                            fontSize: 13,
                                            color: '#374151',
                                            whiteSpace: 'pre-wrap',
                                            maxHeight: 300,
                                            overflowY: 'auto',
                                            marginBottom: 20,
                                            fontFamily: 'monospace'
                                        }}>
                                            {result.extractedText || 'No text detected'}
                                        </div>

                                        {/* Info */}
                                        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                                            📁 File: {result.upload?.fileName} · 
                                            🕐 {new Date(result.processedAt).toLocaleString('en-MY')}
                                        </p>

                                        {/* Copy button */}
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(result.extractedText);
                                                alert('Text copied!');
                                            }}
                                            style={{
                                                padding: '8px 16px',
                                                background: '#f3f4f6',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: 8,
                                                fontSize: 13,
                                                cursor: 'pointer',
                                                fontFamily: 'inherit'
                                            }}
                                        >
                                            📋 Copy Text
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

const panelStyle = {
    background: 'white',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #e5e7eb',
    flex: 1,
    minWidth: 280
};

const panelTitle = {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 16,
    margin: '0 0 16px 0'
};

const dropZoneStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed #e5e7eb',
    borderRadius: 10,
    padding: 20,
    cursor: 'pointer',
    minHeight: 200,
    transition: 'border-color 0.2s',
    background: '#fafafa'
};

export default UserOcrPage;

