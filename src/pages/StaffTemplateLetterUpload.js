import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import StaffLayout from "../components/StaffLayout";
import '../styles/TemplateUpload.css';

const BASE_URL = "http://localhost:8080/api";

export default function StaffTemplateLetterUpload() {

    const navigate = useNavigate();

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

    // ── Tab state ──────────────────────────────────────────────────
    // 'upload' = the existing step wizard, 'manage' = template list
    const [activeTab, setActiveTab] = useState('upload');

    // ── Upload wizard state ───────────────────────────────────────
    const [templateName, setTemplateName] = useState("");
    const [file,         setFile]         = useState(null);
    const [message,      setMessage]      = useState(null);
    const [loading,      setLoading]      = useState(false);

    const [letterTemplateId, setLetterTemplateId] = useState(null);
    const [htmlPreview,      setHtmlPreview]      = useState(null);
    const [placeholders,     setPlaceholders]     = useState([]);
    const [step,             setStep]             = useState(1);

    // ── Manage Templates state ────────────────────────────────────
    const [templates,        setTemplates]        = useState([]);
    const [templatesLoading, setTemplatesLoading]  = useState(true);
    const [templatesError,   setTemplatesError]    = useState(null);

    // Which template row is currently being edited (null = none)
    const [editingId,       setEditingId]       = useState(null);
    const [editName,        setEditName]        = useState("");
    const [editFile,        setEditFile]        = useState(null);
    const [editSaving,      setEditSaving]      = useState(false);
    const [editMessage,     setEditMessage]     = useState(null);

    const [deletingId,      setDeletingId]      = useState(null);
    const [deleteError,     setDeleteError]     = useState(null);

    // ── Fetch templates when Manage tab is opened ──────────────────
    const fetchTemplates = async () => {
        setTemplatesLoading(true);
        setTemplatesError(null);
        try {
            const res = await authService.fetchWithAuth(`${BASE_URL}/letters/templates/all`);
            if (!res.ok) throw new Error('Failed to fetch templates');
            const data = await res.json();
            setTemplates(data);
        } catch (e) {
            setTemplatesError('Failed to load templates. Please try again.');
        } finally {
            setTemplatesLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'manage') {
            fetchTemplates();
        }
    }, [activeTab]);

    // ── Upload wizard handlers ──────────────────────────────────────

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
                { method: 'POST', headers: {}, body: formData }
            );
            if (!uploadRes.ok) throw new Error('Upload failed');
            const savedTemplate = await uploadRes.json();
            setLetterTemplateId(savedTemplate.letterTemplateId);

            const previewRes = await authService.fetchWithAuth(
                `${BASE_URL}/letters/templates/preview/${savedTemplate.letterTemplateId}`
            );
            if (!previewRes.ok) throw new Error('Preview failed');
            const previewData = await previewRes.json();
            setHtmlPreview(previewData.html);
            setStep(2);
            setMessage(null);
        } catch (e) {
            setMessage({ type: "error", text: "Upload failed: " + e.message });
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

        const placeholder = `[${fieldName.toUpperCase().replace(/\s+/g, '_')}]`;
        if (placeholders.find(p => p.placeholder === placeholder)) {
            alert(`"${placeholder}" already added!`);
            selection.removeAllRanges();
            return;
        }

        setPlaceholders(prev => [...prev, { original: selectedText, placeholder }]);
        selection.removeAllRanges();
        setMessage({ type: "success", text: `Added placeholder: ${placeholder}` });
    };

    const removePlaceholder = (placeholder) => {
        setPlaceholders(prev => prev.filter(p => p.placeholder !== placeholder));
    };

    const handleSavePlaceholders = async () => {
        if (placeholders.length === 0) {
            setMessage({ type: "error", text: "Please select at least one placeholder." });
            return;
        }
        setLoading(true);
        try {
            const res = await authService.fetchWithAuth(
                `${BASE_URL}/letters/templates/placeholders/${letterTemplateId}`,
                { method: 'POST', body: JSON.stringify(placeholders) }
            );
            if (!res.ok) throw new Error('Save failed');
            setStep(3);
            setMessage({ type: "success", text: "Template and placeholders saved successfully!" });
        } catch (e) {
            setMessage({ type: "error", text: "Failed to save placeholders: " + e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setStep(1);
        setTemplateName("");
        setFile(null);
        setPlaceholders([]);
        setHtmlPreview(null);
        setLetterTemplateId(null);
        setMessage(null);
    };

    // ── Manage Templates handlers ───────────────────────────────────

    const startEdit = (template) => {
        setEditingId(template.letterTemplateId);
        setEditName(template.templateName);
        setEditFile(null);
        setEditMessage(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName("");
        setEditFile(null);
        setEditMessage(null);
    };

    const handleSaveEdit = async (templateId) => {
        if (!editName || !editName.trim()) {
            setEditMessage({ type: "error", text: "Template name cannot be empty." });
            return;
        }
        setEditSaving(true);
        setEditMessage(null);
        try {
            const formData = new FormData();
            formData.append("templateName", editName.trim());
            if (editFile) {
                formData.append("file", editFile);
            }

            const res = await authService.fetchWithAuth(
                `${BASE_URL}/letters/templates/${templateId}`,
                { method: 'PUT', headers: {}, body: formData }
            );
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || 'Update failed');
            }

            const fileWasReplaced = !!editFile;

            await fetchTemplates();
            cancelEdit();

            if (fileWasReplaced) {
                // Placeholders were reset server-side — let staff know and
                // offer to jump straight into re-marking them.
                setTemplates(prev => prev.map(t =>
                    t.letterTemplateId === templateId
                        ? { ...t, _needsPlaceholders: true }
                        : t
                ));
            }
        } catch (e) {
            setEditMessage({ type: "error", text: "Update failed: " + e.message });
        } finally {
            setEditSaving(false);
        }
    };

    const handleRemarkPlaceholders = async (templateId) => {
        // Reuses the existing Step 2 highlight UI — just enter it from
        // "edit" instead of a fresh upload.
        setLoading(true);
        try {
            const previewRes = await authService.fetchWithAuth(
                `${BASE_URL}/letters/templates/preview/${templateId}`
            );
            if (!previewRes.ok) throw new Error('Preview failed');
            const previewData = await previewRes.json();

            setLetterTemplateId(templateId);
            setHtmlPreview(previewData.html);
            setPlaceholders([]);
            setStep(2);
            setMessage(null);
            setActiveTab('upload');
        } catch (e) {
            setTemplatesError('Failed to load template for placeholder marking: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (templateId) => {
        const confirmed = window.confirm(
            "Delete this template? This cannot be undone."
        );
        if (!confirmed) return;

        setDeletingId(templateId);
        setDeleteError(null);
        try {
            const res = await authService.fetchWithAuth(
                `${BASE_URL}/letters/templates/${templateId}`,
                { method: 'DELETE' }
            );
            if (res.status === 409) {
                const errText = await res.text();
                throw new Error(errText || 'This template is still in use.');
            }
            if (!res.ok && res.status !== 204) {
                throw new Error('Delete failed');
            }
            setTemplates(prev => prev.filter(t => t.letterTemplateId !== templateId));
        } catch (e) {
            setDeleteError(e.message);
        } finally {
            setDeletingId(null);
        }
    };

    // ── Step label for topbar title ────────────────────────────────
    const stepTitle = activeTab === 'manage'
        ? 'Manage Letter Templates'
        : step === 1 ? 'Upload Letter Template'
        : step === 2 ? 'Mark Placeholders'
        :              'Template Saved';

    // ── Render ─────────────────────────────────────────────────────
    return (
        <StaffLayout
            title={stepTitle}
            staffName={staffName}
            staffData={staffData}
        >
            <div className="template-upload-container">

                {/* ── Tabs ── */}
                <div className="template-tabs">
                    <button
                        className={`template-tab ${activeTab === 'upload' ? 'template-tab--active' : ''}`}
                        onClick={() => setActiveTab('upload')}
                    >
                        Upload New
                    </button>
                    <button
                        className={`template-tab ${activeTab === 'manage' ? 'template-tab--active' : ''}`}
                        onClick={() => setActiveTab('manage')}
                    >
                        Manage Templates
                    </button>
                </div>

                {/* ══════════════════════════════════════════════════ */}
                {/*  TAB: Upload New (existing wizard)                  */}
                {/* ══════════════════════════════════════════════════ */}
                {activeTab === 'upload' && (
                    <>
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
                                    <label className="template-upload-label">Template Name</label>
                                    <input
                                        className="template-upload-input"
                                        type="text"
                                        placeholder="e.g. Surat Pengesahan Kerja"
                                        value={templateName}
                                        onChange={e => setTemplateName(e.target.value)}
                                    />
                                </div>

                                <div className="template-upload-field">
                                    <label className="template-upload-label">Word Template (.docx)</label>
                                    <div
                                        className="template-upload-dropzone"
                                        onClick={() => document.getElementById("fileInput").click()}
                                    >
                                        {file ? (
                                            <p className="template-upload-file-name">📄 {file.name}</p>
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
                                            onChange={e => {
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
                                <div className="template-upload-instructions">
                                    <p>📌 <strong>How to add placeholders:</strong></p>
                                    <ol>
                                        <li>Read through your document below</li>
                                        <li><strong>Click and drag</strong> to highlight any text to replace with OCR data</li>
                                        <li>The highlighted text becomes a placeholder</li>
                                    </ol>
                                </div>

                                <div className="template-upload-highlight-layout">

                                    {/* Document Preview */}
                                    <div className="template-upload-preview-wrapper">
                                        <p className="template-upload-preview-label">
                                            📄 Document Preview — highlight text to add placeholder
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
                                                No placeholders yet. Highlight text in the document.
                                            </p>
                                        ) : (
                                            <div className="template-upload-placeholder-list">
                                                {placeholders.map((p, i) => (
                                                    <div key={i} className="template-upload-placeholder-item">
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
                                    <p>
                                        Your template has been saved with
                                        <strong> {placeholders.length} </strong>placeholders:
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
                                        onClick={handleReset}
                                    >
                                        Upload Another Template
                                    </button>
                                    <button
                                        className="template-upload-btn-secondary"
                                        onClick={() => navigate('/staff-home')}
                                    >
                                        Back to Dashboard
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ══════════════════════════════════════════════════ */}
                {/*  TAB: Manage Templates                              */}
                {/* ══════════════════════════════════════════════════ */}
                {activeTab === 'manage' && (
                    <div className="template-upload-card">

                        {templatesLoading && (
                            <p className="template-upload-drop-text">Loading templates...</p>
                        )}

                        {templatesError && (
                            <div className="template-upload-message error">
                                {templatesError}
                            </div>
                        )}

                        {deleteError && (
                            <div className="template-upload-message error">
                                {deleteError}
                            </div>
                        )}

                        {!templatesLoading && !templatesError && templates.length === 0 && (
                            <p className="template-upload-drop-text">
                                No templates uploaded yet. Switch to "Upload New" to add one.
                            </p>
                        )}

                        {!templatesLoading && templates.length > 0 && (
                            <div className="template-manage-list">
                                {templates.map((t) => {
                                    const isEditing = editingId === t.letterTemplateId;
                                    const isDeleting = deletingId === t.letterTemplateId;

                                    return (
                                        <div key={t.letterTemplateId} className="template-manage-item">

                                            {!isEditing ? (
                                                <>
                                                    <div className="template-manage-info">
                                                        <p className="template-manage-name">
                                                            {t.templateName}
                                                        </p>
                                                        <p className="template-manage-date">
                                                            Created: {t.createdAt
                                                                ? new Date(t.createdAt).toLocaleString('en-MY')
                                                                : '—'}
                                                        </p>
                                                        {t._needsPlaceholders && (
                                                            <p className="template-manage-warning">
                                                                ⚠️ File was replaced — placeholders were reset.{' '}
                                                                <button
                                                                    className="template-manage-link-btn"
                                                                    onClick={() => handleRemarkPlaceholders(t.letterTemplateId)}
                                                                >
                                                                    Re-mark placeholders now
                                                                </button>
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="template-manage-actions">
                                                        <button
                                                            className="template-manage-edit-btn"
                                                            onClick={() => startEdit(t)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="template-manage-delete-btn"
                                                            onClick={() => handleDelete(t.letterTemplateId)}
                                                            disabled={isDeleting}
                                                        >
                                                            {isDeleting ? "Deleting..." : "Delete"}
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="template-manage-edit-panel">
                                                    {editMessage && (
                                                        <div className={`template-upload-message ${editMessage.type}`}>
                                                            {editMessage.text}
                                                        </div>
                                                    )}

                                                    <div className="template-upload-field">
                                                        <label className="template-upload-label">
                                                            Template Name
                                                        </label>
                                                        <input
                                                            className="template-upload-input"
                                                            type="text"
                                                            value={editName}
                                                            onChange={e => setEditName(e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="template-upload-field">
                                                        <label className="template-upload-label">
                                                            Replace Word Template (optional)
                                                        </label>
                                                        <div
                                                            className="template-upload-dropzone"
                                                            onClick={() => document.getElementById(`editFileInput-${t.letterTemplateId}`).click()}
                                                        >
                                                            {editFile ? (
                                                                <p className="template-upload-file-name">📄 {editFile.name}</p>
                                                            ) : (
                                                                <p className="template-upload-drop-text">
                                                                    Click to upload a replacement .docx file
                                                                </p>
                                                            )}
                                                            <input
                                                                id={`editFileInput-${t.letterTemplateId}`}
                                                                type="file"
                                                                accept=".docx"
                                                                style={{ display: "none" }}
                                                                onChange={e => setEditFile(e.target.files[0])}
                                                            />
                                                        </div>
                                                        {editFile && (
                                                            <p className="template-manage-warning" style={{ marginTop: 8 }}>
                                                                ⚠️ Replacing the file will reset this template's placeholders.
                                                                You'll need to re-mark them after saving.
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="template-manage-edit-buttons">
                                                        <button
                                                            className="template-upload-btn"
                                                            onClick={() => handleSaveEdit(t.letterTemplateId)}
                                                            disabled={editSaving}
                                                        >
                                                            {editSaving ? "Saving..." : "Save Changes"}
                                                        </button>
                                                        <button
                                                            className="template-upload-btn-secondary"
                                                            onClick={cancelEdit}
                                                            disabled={editSaving}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </StaffLayout>
    );
}