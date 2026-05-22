import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import '../styles/TemplateUpload.css';

const BASE_URL = "http://localhost:8080/api";

export default function TemplateLetterUpload() {

    const navigate = useNavigate();

    const [templateName, setTemplateName] = useState("");
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    const [letterTemplateId, setLetterTemplateId] = useState(null);  // ← Changed
    const [htmlPreview, setHtmlPreview] = useState(null);
    const [placeholders, setPlaceholders] = useState([]);
    const [step, setStep] = useState(1);

    const handleUpload = async () => {
        if (!templateName || !file) {
            setMessage({ type: "error", text: "Please fill in all fields." });
            return;
        }

        setLoading(true);

        try {
            

            const formData = new FormData();
            formData.append("templateName", templateName);
            formData.append("file", file);

            const uploadRes = await authService.fetchWithAuth(
               `${BASE_URL}/letters/templates/upload`,
               {
                method: 'POST',
                headers: {},
                body: formData,
                }
            );

            const savedTemplate = uploadRes.data;
            setLetterTemplateId(savedTemplate.letterTemplateId);  // ← Changed

            const previewRes = await authService.fetchWithAuth(
                `${BASE_URL}/letters/templates/preview/${savedTemplate.letterTemplateId}`
            );
            if (!previewRes.ok) throw new Error('Preview failed');
            const previewData = await previewRes.json();
            setHtmlPreview(previewData.data.html);
            setStep(2);
            setMessage(null);
        } catch (e) {
            setMessage({
                type: "error",
                text: "Upload failed: " + e.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const selectedText = selection.toString().trim();
        if (!selectedText) return;

        const fieldName = window.prompt(
            `You selected: "${selectedText}"\n\nEnter placeholder name (e.g. NAMA_PEKERJA):`,
            selectedText.toUpperCase().replace(/\s+/g, '_')
        );

        if (!fieldName) return;

        const placeholder = `[${fieldName
            .toUpperCase()
            .replace(/\s+/g, '_')}]`;

        if (placeholders.find(p => p.placeholder === placeholder)) {
            alert(`"${placeholder}" already added!`);
            selection.removeAllRanges();
            return;
        }    

        setPlaceholders(prev => [...prev, { 
            original: selectedText, 
            placeholder 
        }]);
        selection.removeAllRanges();

        setMessage({
            type: "success",
            text: `Added placeholder: ${placeholder}`
        });
    };

    const removePlaceholder = (placeholder) => {
       setPlaceholders(prev => 
        prev.filter(p => p.placeholder !== placeholder));
    };

    const handleSavePlaceholders = async () => {
        if (placeholders.length === 0) {
            setMessage({
                type: "error",
                text: "Please select at least one placeholder."
            });
            return;
        }

        setLoading(true);
        try {
           const res = await authService.fetchWithAuth(`${BASE_URL}/letters/templates/placeholders/${letterTemplateId}`,
            {
                method: 'POST',
                body:JSON.stringify(placeholders),
            }
           );
           if (res.ok) throw new Error('Save failed');
            setStep(3);
            setMessage({
                type: "success",
                text: "Template and placeholders saved successfully!"
            });
        } catch (e) {
            setMessage({
                type: "error",
                text: "Failed to save placeholders: " + e.message
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="template-upload-container">

            {/* Header */}
            <div className="template-upload-header">
                <button
                    className="template-upload-back"
                    onClick={() => navigate('/staff-home')}
                >
                    ← Back
                </button>
                <h2 className="template-upload-title">Upload Letter Template</h2>
                <p className="template-upload-subtitle">
                    Upload your Word document, then highlight text to mark 
                    as placeholders
                </p>
            </div>

            {/* Step Indicator */}
            <div className="template-upload-steps">
                <div className={`template-upload-step ${step >= 1 ? 'active' : ''}`}>
                    <span className="step-number">1</span>
                    <span className="step-label">Upload</span>
                </div>
                <div className="step-divider" />
                <div className={`template-upload-step ${step >= 2 ? 'active' : ''}`}>
                    <span className="step-number">2</span>
                    <span className="step-label">Highlight</span>
                </div>
                <div className="step-divider" />
                <div className={`template-upload-step ${step >= 3 ? 'active' : ''}`}>
                    <span className="step-number">3</span>
                    <span className="step-label">Done</span>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`template-upload-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* ── Step 1: Upload Form ── */}
            {step === 1 && (
                <div className="template-upload-card">
                    <div className="template-upload-field">
                        <label className="template-upload-label">
                            Template Name
                        </label>
                        <input
                            className="template-upload-input"
                            type="text"
                            placeholder="e.g. Surat Pengesahan Kerja"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                        />
                    </div>

                    <div className="template-upload-field">
                        <label className="template-upload-label">
                            Word Template (.docx)
                        </label>
                        <div
                            className="template-upload-dropzone"
                            onClick={() => 
                                document.getElementById("fileInput").click()
                            }
                        >
                            {file ? (
                                <p className="template-upload-file-name">
                                    📄 {file.name}
                                </p>
                            ) : (
                                <p className="template-upload-drop-text">
                                    Click to upload .docx file
                                </p>
                            )}
                            <input
                                id="fileInput"
                                type="file"
                                accept=".docx"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                    setFile(e.target.files[0]);
                                    setMessage(null);
                                }}
                            />
                        </div>
                    </div>

                    <button
                        className="template-upload-btn"
                        onClick={handleUpload}
                        disabled={loading}
                    >
                        {loading ? "Uploading..." : "Upload & Preview"}
                    </button>
                </div>
            )}

            {/* ── Step 2: Highlight Placeholders ── */}
            {step === 2 && (
                <div className="template-upload-highlight-container">

                    {/* Instructions */}
                    <div className="template-upload-instructions">
                        <p>📌 <strong>How to add placeholders:</strong></p>
                        <ol>
                            <li>Read through your document below</li>
                            <li>
                                <strong>Click and drag</strong> to highlight 
                                any text you want to replace with OCR data
                            </li>
                            <li>The highlighted text becomes a placeholder</li>
                        </ol>
                    </div>

                    <div className="template-upload-highlight-layout">

                        {/* Document Preview */}
                        <div className="template-upload-preview-wrapper">
                            <p className="template-upload-preview-label">
                                📄 Document Preview — highlight text to add 
                                placeholder
                            </p>
                            <div
                                className="template-upload-preview"
                                onMouseUp={handleTextSelection}
                                dangerouslySetInnerHTML={{ __html: htmlPreview }}
                            />
                        </div>

                        {/* Placeholder List */}
                        <div className="template-upload-placeholder-panel">
                            <p className="template-upload-preview-label">
                                🏷️ Placeholders ({placeholders.length})
                            </p>

                            {placeholders.length === 0 ? (
                                <p className="template-upload-no-placeholder">
                                    No placeholders yet. Highlight text in 
                                    the document.
                                </p>
                            ) : (
                                <div className="template-upload-placeholder-list">
                                    {placeholders.map((p, i) => (
                                        <div key={i} 
                                             className="template-upload-placeholder-item">
                                            <div>
                                                <span style={{ fontSize: 12, color: '#666' }}>
                                                    "{p.original}" →
                                                </span>
                                                <span className="template-upload-tag">
                                                    {p.placeholder}
                                                </span>
                                            </div>
                                            <button
                                                className="template-upload-remove-btn"
                                                onClick={() => removePlaceholder(p.placeholder)}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                className="template-upload-btn"
                                onClick={handleSavePlaceholders}
                                disabled={loading || placeholders.length === 0}
                                style={{ marginTop: 16 }}
                            >
                                {loading ? "Saving..." : "Save Placeholders"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Step 3: Done ── */}
            {step === 3 && (
                <div className="template-upload-card">
                    <div className="template-upload-success">
                        <p className="template-upload-success-icon">✅</p>
                        <h3>Template Ready!</h3>
                        <p>Your template has been saved with 
                            <strong> {placeholders.length} </strong> 
                            placeholders:
                        </p>
                        <div className="template-upload-tags">
                            {placeholders.map((p, i) => (
                                <span key={i} className="template-upload-tag">
                                    {p.placeholder}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="template-upload-actions">
                        <button
                            className="template-upload-btn"
                            onClick={() => {
                                setStep(1);
                                setTemplateName("");
                                setFile(null);
                                setPlaceholders([]);
                                setHtmlPreview(null);
                                setLetterTemplateId(null);  // ← Changed
                                setMessage(null);
                            }}
                        >
                            Upload Another Template
                        </button>
                        <button
                            className="template-upload-btn-secondary"
                            onClick={() => navigate('/staff-home')}
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}