import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/Dashboard.css';
import '../styles/StaffUploadPage.css';
import { authService } from "../services/authService";

const API = "http://localhost:8080/api";

const STEP = {
    IDLE: "idle",
    UPLOADING: "uploading",
    PROCESSING: "processing",
    SAVING: "saving",
    DONE: "done",
    ERROR: "error",
};

const STEP_LABELS = {
    [STEP.UPLOADING]:  "Uploading file…",
    [STEP.PROCESSING]: "Processing Excel data…",
    [STEP.SAVING]:     "Saving cleaned rows…",
};

const INFO_STEPS = [
    { icon: '⬆', label: 'File uploaded securely' },
    { icon: '🔍', label: 'Duplicates removed' },
    { icon: '🧹', label: 'Missing values filled' },
    { icon: '📐', label: 'Outliers capped (IQR)' },
    { icon: '📏', label: 'Extreme values handled (Z-score)' },
    { icon: '⚖',  label: 'Data normalized (min-max)' },
    { icon: '🏷',  label: 'Categories encoded' },
    { icon: '✅', label: 'Raw + cleaned versions saved' },
];

export default function StaffUploadPage() {
    const [file, setFile] = useState(null);
    const [step, setStep] = useState(STEP.IDLE);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [excelResult, setExcelResult] = useState(null);
    const [cleanedRows, setCleanedRows] = useState([]);
    const [previewHeaders, setPreviewHeaders] = useState([]);
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const busy = [STEP.UPLOADING, STEP.PROCESSING, STEP.SAVING].includes(step);

    const reset = () => {
        setFile(null);
        setStep(STEP.IDLE);
        setProgress(0);
        setError(null);
        setExcelResult(null);
        setCleanedRows([]);
        setPreviewHeaders([]);
    };

    const handleFile = (f) => {
        if (!f) return;
        if (!f.name.match(/\.(xlsx|xls)$/i)) {
            setError("Only .xlsx or .xls files are accepted.");
            setStep(STEP.ERROR);
            return;
        }
        setFile(f);
        setError(null);
        setStep(STEP.IDLE);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
    };

   

const handleUpload = async () => {
    if (!file) return;
    setError(null);

    try {
        // ── Step 1: Upload Excel file with progress tracking ──────────
        setStep(STEP.UPLOADING);
        setProgress(10);

        const formData = new FormData();
        formData.append('file', file);

        // Convert FormData to a Blob so we know the total byte size
        // (FormData itself doesn't expose .size)
        const blob = new Blob([await new Response(formData).blob()]);
        const totalBytes = blob.size;
        let uploadedBytes = 0;

        // Wrap the blob in a ReadableStream that tracks how many
        // bytes have been read (= sent to the server)
        const trackingStream = new ReadableStream({
            start(controller) {
                const reader = blob.stream().getReader();

                function push() {
                    reader.read().then(({ done, value }) => {
                        if (done) {
                            controller.close();
                            return;
                        }
                        uploadedBytes += value.byteLength;
                        // Map upload progress to 10–40% range
                        const uploadPct = Math.round((uploadedBytes / totalBytes) * 30);
                        setProgress(10 + uploadPct);
                        controller.enqueue(value);
                        push();
                    }).catch(err => controller.error(err));
                }
                push();
            }
        });

        // NOTE: duplex: 'half' is required in Chrome when sending a
        // streaming body — it tells the browser not to buffer the whole
        // request before sending
        const uploadRes = await fetch(`${API}/files/excel/upload`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                // Content-Type must NOT be set here — the browser can't
                // add the multipart boundary to a streaming body, so we
                // send the raw blob as octet-stream instead
                'Content-Type': 'application/octet-stream',
                'X-File-Name': encodeURIComponent(file.name),
            },
            body: trackingStream,
            duplex: 'half',
        });

        if (!uploadRes.ok) throw new Error('Upload failed');
        const uploadData = await uploadRes.json();

        const uploadId = uploadData?.uploadId;
        if (!uploadId) throw new Error('No uploadId returned from server.');
        setProgress(40);

        // ── Step 2: Process Excel data ───────────────────────────────
        setStep(STEP.PROCESSING);
        const processFormData = new FormData();
        processFormData.append('file', file);

        const processRes = await authService.fetchWithAuth(`${API}/excel/upload/${uploadId}`, {
            method: 'POST',
            headers: {},   // let browser set multipart boundary
            body: processFormData,
        });
        if (!processRes.ok) throw new Error('Processing failed');
        const excel = await processRes.json();
        setExcelResult(excel);
        setProgress(70);

        // ── Step 3: Save processed rows ──────────────────────────────
        setStep(STEP.SAVING);
        const saveRes = await authService.fetchWithAuth(
            `${API}/processed-rows/save/${excel.excelId}`,
            { method: 'POST' }
        );
        if (!saveRes.ok) throw new Error('Saving failed');
        setProgress(85);

        // ── Step 4: Fetch cleaned preview ────────────────────────────
        const cleanedRes = await authService.fetchWithAuth(
            `${API}/processed-rows/${excel.excelId}/cleaned`
        );
        if (!cleanedRes.ok) throw new Error('Failed to fetch cleaned data');
        const rows = await cleanedRes.json();

        if (rows.length > 0) {
            const parsed = JSON.parse(rows[0].rowData);
            setPreviewHeaders(Object.keys(parsed).slice(0, 8));
        }
        setCleanedRows(rows.slice(0, 10));
        setProgress(100);
        setStep(STEP.DONE);

    } catch (e) {
        setError(e.message || 'Something went wrong.');
        setStep(STEP.ERROR);
        setProgress(0);
    }
};

    return (
        <div className="dashboard-container staff-theme">
            {/* ── Navbar ── */}
            <nav className="dashboard-nav">
                <div className="nav-brand">
                    <span className="brand-icon">⚡</span>
                    <span className="brand-name">DataManager</span>
                </div>
                <div className="nav-info">
                    <span className="nav-role staff-badge">STAFF</span>
                    <button className="signout-btn" onClick={() => navigate('/staff-home')}>← Back</button>
                </div>
            </nav>

            <main className="dashboard-main">
                {/* ── Page Header ── */}
                <section className="welcome-section">
                    <h1 className="welcome-heading">Upload Excel Data</h1>
                    <p className="welcome-subtitle">
                        Upload a spreadsheet — we'll clean, validate, and preview the results.
                    </p>
                </section>

                <section className="menu-section">
                    {step !== STEP.DONE ? (
                        <UploadView
                            file={file}
                            step={step}
                            busy={busy}
                            progress={progress}
                            error={error}
                            dragging={dragging}
                            fileInputRef={fileInputRef}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={onDrop}
                            onFileChange={(e) => handleFile(e.target.files[0])}
                            onClickZone={() => !busy && fileInputRef.current?.click()}
                            onUpload={handleUpload}
                            onClear={reset}
                        />
                    ) : (
                        <PreviewView
                            excelResult={excelResult}
                            cleanedRows={cleanedRows}
                            previewHeaders={previewHeaders}
                            onReset={reset}
                        />
                    )}
                </section>
            </main>
        </div>
    );
}

// ─── Upload View ───────────────────────────────────────────────────────────────

function UploadView({
    file, step, busy, progress, error, dragging,
    fileInputRef, onDragOver, onDragLeave, onDrop,
    onFileChange, onClickZone, onUpload, onClear,
}) {
    const dropZoneClass = [
        'su-drop-zone',
        dragging         ? 'su-drop-zone--dragging'  : '',
        file             ? 'su-drop-zone--has-file'  : '',
        busy             ? 'su-drop-zone--busy'       : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="su-upload-layout">
            {/* ── Upload Panel ── */}
            <div className="su-panel">
                <h2 className="su-panel-title">📂 Select File</h2>

                {/* Drop zone */}
                <div
                    className={dropZoneClass}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={onClickZone}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={onFileChange}
                    />

                    {file ? (
                        <div className="su-drop-zone__file">
                            <p className="su-drop-zone__file-icon">📊</p>
                            <p className="su-drop-zone__file-name">{file.name}</p>
                            <p className="su-drop-zone__file-size">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                    ) : (
                        <div className="su-drop-zone__content">
                            <p className="su-drop-zone__icon">📁</p>
                            <p className="su-drop-zone__label">
                                {dragging ? 'Release to drop' : 'Drop your file here'}
                            </p>
                            <p className="su-drop-zone__hint">or click to browse · .xlsx, .xls only</p>
                        </div>
                    )}
                </div>

                {/* Error */}
                {step === STEP.ERROR && error && (
                    <div className="su-error-banner">
                        <span className="su-error-banner__icon">!</span>
                        {error}
                    </div>
                )}

                {/* Progress */}
                {busy && (
                    <div className="su-progress">
                        <div className="su-progress__header">
                            <span>{STEP_LABELS[step]}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="su-progress__track">
                            <div className="su-progress__bar" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="su-actions">
                    {file && !busy && (
                        <button className="su-btn-clear" onClick={onClear}>Clear</button>
                    )}
                    <button
                        className="su-btn-upload"
                        disabled={!file || busy}
                        onClick={onUpload}
                    >
                        {busy ? 'Working…' : '⬆ Upload & Process'}
                    </button>
                </div>
            </div>

            {/* ── Info Panel ── */}
            <div className="su-panel su-panel--info">
                <h2 className="su-panel-title">What happens next?</h2>
                {INFO_STEPS.map((item, i) => (
                    <div key={i} className="su-step-item">
                        <span className="su-step-item__icon">{item.icon}</span>
                        <span className="su-step-item__label">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Preview View ──────────────────────────────────────────────────────────────

function PreviewView({ excelResult, cleanedRows, previewHeaders, onReset }) {
    return (
        <div>
            {/* Summary bar */}
            <div className="su-summary-bar">
                <div className="su-summary-item">
                    <span className="su-summary-item__value">{excelResult?.rowCount ?? '—'}</span>
                    <span className="su-summary-item__label">Rows processed</span>
                </div>
                <div className="su-summary-divider" />
                <div className="su-summary-item">
                    <span className="su-summary-item__value">{previewHeaders.length}</span>
                    <span className="su-summary-item__label">Columns detected</span>
                </div>
                <div className="su-summary-divider" />
                <div className="su-summary-item">
                    <span className="su-summary-item__value">2</span>
                    <span className="su-summary-item__label">Versions saved</span>
                </div>
                <div className="su-summary-bar__actions">
                    <button className="su-btn-clear" onClick={onReset}>Upload another</button>
                </div>
            </div>

            {/* Cleaned data preview */}
            <div className="su-panel">
                <div className="su-preview-header">
                    <h2 className="su-panel-title">🧹 Cleaned Data Preview</h2>
                    <span className="su-badge">First {cleanedRows.length} rows</span>
                </div>

                {cleanedRows.length === 0 ? (
                    <p className="su-table__no-rows">No cleaned rows found.</p>
                ) : (
                    <div className="su-table-wrapper">
                        <table className="su-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    {previewHeaders.map((h) => (
                                        <th key={h}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {cleanedRows.map((row, i) => {
                                    let rowData = {};
                                    try { rowData = JSON.parse(row.rowData); } catch (_) {}
                                    return (
                                        <tr key={row.rowId ?? i}>
                                            <td>{row.rowIndex}</td>
                                            {previewHeaders.map((h) => (
                                                <td key={h}>
                                                    {rowData[h] ?? (
                                                        <span className="su-table__empty-cell">—</span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {previewHeaders.length === 8 && (
                    <p className="su-table__col-note">
                        * Showing first 8 columns only for readability.
                    </p>
                )}
            </div>
        </div>
    );
}
