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
    const [mapped,setMappedData] = useState({});
    const [templates,setTemplate] = useState([]);
    const [selectedTemplate,setSelectedTemplate] = useState(null);
    const navigate = useNavigate();

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
        setResult(null);
        setError(null);
        setMappedData({});
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

            if(data.extractedText){
                parseExtractedText(data.extractedText);
            }

            const tRes = await authService.fetchWithAuth(`${API}/forms/templates?active=true`);
            const tData = await tRes.json();
            setTemplate(tData);
        } catch (e) {
            const msg = e.response?.data?.message || e.response?.data || 'OCR failed, please try again.';
            setError(typeof msg === 'string' ? msg : 'OCR failed, please try again.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const parseExtractedText = (text) =>{
        const lines = text.split('\n');
        const parsed = {};
        let currentHeader = null;
        let listItems = [];

        const saveList =() => {
            if (currentHeader && listItems.length >0){
                parsed[currentHeader] = listItems.join('\n');
                listItems = [];
            }
        }

        lines.forEach(line => {
            const trimmed = line.trim();
            if(!trimmed) return;
            
            const listMatch = trimmed.match(/^\d+\.\s+(.+)$/);
            if (listMatch && currentHeader){
                listItems.push(listMatch[1].trim());
                return;
            }

            const kvmatch = trimmed.match(/^(.+?)\s{0,2}:\s{0,2}(.+)$/);
            if(kvmatch){
                saveList();
                currentHeader = null;
                const key = kvmatch[1].trim();
                const value = kvmatch[2].trim();
                if(key && value ) parsed[key] = value;
                return;
        } 

        const headerMatch = trimmed.match(/^(.+?)\s*:?\s*$/);
        if(headerMatch){
            saveList()
            currentHeader = headerMatch[1].trim();
        }
    });
    saveList();
    setMappedData(parsed);
       
    };

    const handleFieldChange = (key,value) => {
        setMappedData(prev => ({
            ...prev,
            [key]:value
        }));
    };

    const handleAddField =() => {
        const fieldName = prompt('Enter field name:');
        if(fieldName){
            setMappedData(prev => ({
                ...prev,
                [fieldName]:''
            }));
        }
    };

    const handleRemoveField =(key) =>{
        setMappedData(prev => {
            const updated = {...prev};
            delete updated[key];
            return updated;
        });
    }

    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setError(null);
        setMappedData({});
        setTemplate([]);
        setSelectedTemplate(null);
        };

const handleSubmitForm = async () => {
    try {
        setLoading(true);

        const formData = new FormData();
        formData.append('templateId', selectedTemplate.templateId);
        formData.append('inputMethod', 'OCR');        
        Object.entries(mapped).forEach(([key, value]) => {   
            formData.append(key, value);            
        });

        const res = await authService.fetchWithAuth(`${API}/forms/submit`, {
            method: 'POST',
            headers: {},                              
            body: formData,                           
        });

        if (!res.ok) {
            const errorMsg = await res.text();
            throw new Error(errorMsg || 'Form submission failed');
        }

        const data = await res.json();
        alert('✅ Form submitted successfully!\n\nSubmission ID: ' + data.submissionId);

    } catch (error) {
        console.error('Form submission error:', error);
        alert('❌ Form submission failed:\n' + error.message);
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
            <div className="ocr-upload-container">
                <h1 className="ocr-upload-title">OCR Scan</h1>

                {/* Step 1 — Upload Card */}
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

                {/* Step 2 — Extracted Text */}
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

                {/* Step 3 — Select Template */}
                {result && result.status !== 'failed' && templates.length > 0 && (
                    <div className="ocr-upload-card">
                        <p className="ocr-upload-step-label">Step 3 — Select Template</p>

                        {templates.length === 0 ? (
                            <p style={{ fontSize: 13, color: '#6b7280' }}>No templates available.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {templates.map(t => (
                                    <div
                                        key={t.templateId}
                                        onClick={() => setSelectedTemplate(t)}
                                        style={{
                                            padding: '12px 16px',
                                            border: `1.5px solid ${selectedTemplate?.templateIdId === t.templateId  ? '#6d28d9' : '#e5e7eb'}`,
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            background: selectedTemplate?.templateId  === t.templateId  ? '#f5f3ff' : '#f9fafb',
                                            color: '#374151',
                                            fontSize: 14,
                                            fontWeight: selectedTemplate?.templateId  === t.templateId  ? 600 : 400,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <span style={{ marginRight: 8 }}>
                                            {selectedTemplate?.templateId  === t.templateId  ? '🟣' : '⚪'}
                                        </span>
                                        {t.templateName}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4 — Review & Submit */}
                {selectedTemplate && Object.keys(mapped).length > 0 && (
                    <div className="ocr-upload-card">
                        <p className="ocr-upload-step-label">Step 4 — Review & Submit</p>

                        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                            📋 Template: <strong>{selectedTemplate.templateName}</strong>
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {Object.entries(mapped).map(([key, value]) => (
                                <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span style={{
                                        minWidth: 140,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: '#374151',
                                    }}>
                                        {key}
                                    </span>
                                    <input
                                        value={value}
                                        onChange={(e) => handleFieldChange(key, e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: 8,
                                            fontSize: 13,
                                            fontFamily: 'inherit',
                                            background: '#f9fafb',
                                            color: '#374151',
                                        }}
                                    />
                                    <button
                                        onClick={() => handleRemoveField(key)}
                                        style={{
                                            padding: '6px 10px',
                                            background: '#fee2e2',
                                            color: '#991b1b',
                                            border: 'none',
                                            borderRadius: 6,
                                            cursor: 'pointer',
                                            fontSize: 13,
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                            <button
                                onClick={handleAddField}
                                style={{
                                    padding: '10px 16px',
                                    background: '#f3f4f6',
                                    color: '#374151',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                + Add Field
                            </button>
                            <button
                                onClick={handleSubmitForm}
                                disabled={loading}
                                className="ocr-upload-btn"
                                style={{ flex: 1 }}
                            >
                                {loading ? '⏳ Submitting...' : '🚀 Submit Form'}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </main>
    </div>);
}