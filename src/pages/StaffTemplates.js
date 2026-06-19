import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TemplateFormModal from '../components/TemplateFormModal';
import {
    getTemplates, createTemplate, updateTemplate,
    toggleTemplate, deleteTemplate,
    getTemplateSubmissions
} from '../services/templateService';
import { authService } from '../services/authService';
import ExcelJS from 'exceljs';
import StaffLayout from '../components/StaffLayout';

export default function StaffTemplates() {

    // ── Staff info from localStorage ─────────────────────────────────────────
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const staffName = user?.fullName || localStorage.getItem('username') || 'Staff';

    // ── State ─────────────────────────────────────────────────────────────────
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    // eslint-disable-next-line no-unused-vars
    const navigate = useNavigate();

    useEffect(() => { fetchTemplates(); }, []);

    // ── API handlers ──────────────────────────────────────────────────────────
    const fetchTemplates = async () => {
        try {
            const data = await getTemplates();
            setTemplates(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data) => {
        try {
            if (editingTemplate) {
                await updateTemplate(editingTemplate.templateId, data);
            } else {
                await createTemplate(data);
            }
            await fetchTemplates();
            setEditingTemplate(null);
            setShowModal(false);
        } catch (e) {
            console.error('Save failed:', e);
            alert('Failed to save template, please try again');
        }
    };

    const handleEdit = (template) => {
        setEditingTemplate(template);
        setShowModal(true);
    };

    const handleToggle = async (id) => {
        await toggleTemplate(id);
        fetchTemplates();
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this template?')) return;
        await deleteTemplate(id);
        fetchTemplates();
    };

    const handleViewSubmissions = async (template, page = 0) => {
        if (selectedTemplate?.templateId === template.templateId && page === 0) {
            setSelectedTemplate(null);
            setSubmissions([]);
            setCurrentPage(0);
            setTotalPages(0);
            return;
        }
        setSelectedTemplate(template);
        setSubmissionsLoading(true);
        try {
            const data = await getTemplateSubmissions(template.templateId, page, 10);
            setSubmissions(data.content);
            setTotalPages(data.page.totalPages);
            setCurrentPage(data.page.number);
        } catch (e) {
            console.error(e);
        } finally {
            setSubmissionsLoading(false);
        }
    };

    // ── Filtered + sorted submissions ─────────────────────────────────────────
    const filteredSubmissions = submissions
        .filter(s => {
            if (!searchTerm) return true;
            return s.answers.some(a =>
                a.answerValue?.toLowerCase().includes(searchTerm.toLowerCase())
            ) || s.status.toLowerCase().includes(searchTerm.toLowerCase());
        })
        .sort((a, b) => {
            if (sortBy === 'date') return new Date(b.submittedAt) - new Date(a.submittedAt);
            if (sortBy === 'status') return a.status.localeCompare(b.status);
            return 0;
        });

    // ── Excel export ──────────────────────────────────────────────────────────
    const handleExportExcel = async () => {
        if (!submissions.length) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(selectedTemplate.templateName);
        const fields = selectedTemplate.fields.map(f => f.fieldLabel);

        const imageFields = [];
        filteredSubmissions.forEach(sub => {
            sub.answers.forEach(a => {
                const val = a.answerValue || '';
                const isImg = val.split(',').some(p =>
                    p.trim().endsWith('.png') || p.trim().endsWith('.jpg') || p.trim().endsWith('.jpeg')
                );
                if (isImg && !imageFields.includes(a.fieldLabel)) {
                    imageFields.push(a.fieldLabel);
                }
            });
        });

        worksheet.columns = [
            { header: 'Submission ID', key: 'submissionId', width: 20 },
            { header: 'Submitted At',  key: 'submittedAt',  width: 22 },
            { header: 'Status',        key: 'status',       width: 12 },
            ...fields.map(f => ({
                header: f, key: f,
                width: imageFields.includes(f) ? 18 : 25
            }))
        ];

        worksheet.getRow(1).eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        worksheet.getRow(1).height = 30;

        for (let i = 0; i < filteredSubmissions.length; i++) {
            const sub = filteredSubmissions[i];
            const rowIndex = i + 2;
            const answerMap = {};
            sub.answers.forEach(a => { answerMap[a.fieldLabel] = a.answerValue || ''; });

            let maxImages = 1;
            imageFields.forEach(f => {
                const paths = (answerMap[f] || '').split(',').filter(Boolean);
                if (paths.length > maxImages) maxImages = paths.length;
            });
            const ROW_HEIGHT = 120 * maxImages;

            const rowData = {
                submissionId: sub.submissionId,
                submittedAt: new Date(sub.submittedAt).toLocaleString('en-MY'),
                status: sub.status,
            };
            fields.forEach(f => {
                if (!imageFields.includes(f)) rowData[f] = answerMap[f] || '—';
            });

            const row = worksheet.addRow(rowData);
            row.height = ROW_HEIGHT;
            row.eachCell(cell => { cell.alignment = { vertical: 'middle', wrapText: true }; });

            for (let colIdx = 0; colIdx < fields.length; colIdx++) {
                const fieldLabel = fields[colIdx];
                if (!imageFields.includes(fieldLabel)) continue;
                const val = answerMap[fieldLabel] || '';
                const paths = val.split(',').filter(Boolean);

                for (let imgIdx = 0; imgIdx < paths.length; imgIdx++) {
                    const filePath = paths[imgIdx].trim();
                    try {
                        const imageUrl = `http://localhost:8080/${filePath.trim().replace(/\/\//g, '/')}`;
                        const res = await authService.fetchWithAuth(imageUrl);
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const blob = await res.blob();
                        const arrayBuffer = await blob.arrayBuffer();
                        const ext = filePath.split('.').pop().toLowerCase();
                        const imageId = workbook.addImage({
                            buffer: arrayBuffer,
                            extension: ext === 'jpg' ? 'jpeg' : ext,
                        });
                        const col = 3 + colIdx;
                        const imgHeightPx = Math.floor((ROW_HEIGHT / paths.length) * 0.75);
                        const offsetTop = imgIdx * imgHeightPx;
                        worksheet.addImage(imageId, {
                            tl: { col, row: rowIndex - 1, nativeColOff: 0, nativeRowOff: offsetTop * 9525 },
                            ext: { width: 120, height: imgHeightPx },
                            editAs: 'oneCell',
                        });
                    } catch (e) {
                        console.error('Failed to embed image:', filePath, e);
                    }
                }
            }
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTemplate.templateName}_submissions.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <StaffLayout title="Form Templates" staffName={staffName} staffData={user}>

            {/* ── Page Header ── */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: 20
            }}>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
                        Form Templates
                    </h1>
                    <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                        {templates.length} template{templates.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    style={actionBtn('#e11d48')}
                    onClick={() => { setEditingTemplate(null); setShowModal(true); }}>
                    + New template
                </button>
            </div>

            {/* ── Body ── */}
            {loading ? (
                <p style={{ color: '#888', textAlign: 'center', marginTop: 60 }}>Loading...</p>
            ) : templates.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: 80, color: '#888' }}>
                    <p style={{ marginBottom: 16 }}>No templates yet.</p>
                    <button style={actionBtn('#e11d48')} onClick={() => setShowModal(true)}>
                        Create your first template
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

                    {/* ── Template Cards Grid ── */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 16
                    }}>
                        {templates.map((t) => (
                            <div key={t.templateId} style={{
                                background: '#fff',
                                border: selectedTemplate?.templateId === t.templateId
                                    ? '2px solid #7c3aed' : '1px solid #e8eaf0',
                                borderRadius: 12, padding: 20,
                                display: 'flex', flexDirection: 'column', gap: 16,
                                transition: 'border-color 0.2s',
                            }}>
                                {/* Top */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 10,
                                        background: '#f5f6fa', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        fontSize: 20, flexShrink: 0
                                    }}>📝</div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>
                                            {t.templateName}
                                        </p>
                                        <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>
                                            {t.description || '—'}
                                        </p>
                                        <p style={{ fontSize: 12, color: '#9ca3af' }}>
                                            {t.fields.length} field{t.fields.length !== 1 ? 's' : ''}&nbsp;·&nbsp;
                                            <span style={{
                                                display: 'inline-block', padding: '2px 8px',
                                                borderRadius: 99, fontSize: 11, fontWeight: 600,
                                                background: t.isActive ? '#dcfce7' : '#f3f4f6',
                                                color: t.isActive ? '#166534' : '#6b7280'
                                            }}>
                                                {t.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                                    borderTop: '1px solid #f3f4f6', paddingTop: 14,
                                }}>
                                    <button
                                        onClick={() => handleViewSubmissions(t)}
                                        style={{
                                            ...actionBtn(selectedTemplate?.templateId === t.templateId ? '#5b21b6' : '#7c3aed'),
                                            gridColumn: '1 / -1'
                                        }}>
                                        {selectedTemplate?.templateId === t.templateId
                                            ? 'Hide submissions' : 'View submissions'}
                                    </button>
                                    <button onClick={() => handleEdit(t)} style={actionBtn('#3b82f6')}>
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleToggle(t.templateId)}
                                        style={actionBtn(t.isActive ? '#d97706' : '#16a34a')}>
                                        {t.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(t.templateId)}
                                        style={{ ...actionBtn('#e53e3e'), gridColumn: '1 / -1' }}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Submissions Panel ── */}
                    {selectedTemplate && (
                        <div style={{
                            background: 'white', borderRadius: 12, padding: 24,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            border: '1px solid #e5e7eb'
                        }}>
                            {/* Header */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', marginBottom: 20,
                                flexWrap: 'wrap', gap: 12
                            }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>
                                        {selectedTemplate.templateName} — Submissions
                                    </h2>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                                        {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <input
                                        placeholder="Search answers..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        style={{
                                            padding: '8px 14px', border: '1px solid #e8eaf0',
                                            borderRadius: 8, fontSize: 13, width: 190,
                                            outline: 'none', fontFamily: 'inherit'
                                        }}
                                    />
                                    <select
                                        value={sortBy}
                                        onChange={e => setSortBy(e.target.value)}
                                        style={{
                                            padding: '8px 14px', border: '1px solid #e8eaf0',
                                            borderRadius: 8, fontSize: 13,
                                            fontFamily: 'inherit', outline: 'none'
                                        }}>
                                        <option value="date">Sort by Date</option>
                                        <option value="status">Sort by Status</option>
                                    </select>
                                    <button onClick={handleExportExcel} style={actionBtn('#16a34a')}>
                                        ⬇ Export Excel
                                    </button>
                                </div>
                            </div>

                            {/* Table */}
                            {submissionsLoading ? (
                                <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>
                                    Loading submissions...
                                </p>
                            ) : filteredSubmissions.length === 0 ? (
                                <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>
                                    {searchTerm
                                        ? 'No submissions match your search.'
                                        : 'No submissions yet for this template.'}
                                </p>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb' }}>
                                                <th style={thStyle}>Submitted At</th>
                                                <th style={thStyle}>Status</th>
                                                {selectedTemplate.fields.map(f => (
                                                    <th key={f.fieldId} style={thStyle}>{f.fieldLabel}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSubmissions.map((sub, i) => {
                                                const answerMap = {};
                                                sub.answers.forEach(a => { answerMap[a.fieldLabel] = a.answerValue; });
                                                return (
                                                    <tr key={sub.submissionId}
                                                        style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                                                        <td style={tdStyle}>
                                                            {new Date(sub.submittedAt).toLocaleString('en-MY')}
                                                        </td>
                                                        <td style={tdStyle}>
                                                            <span className={`sl-status ${sub.status === 'submitted' ? 'active' : 'pending'}`}>
                                                                <span className="dot" />
                                                                {sub.status}
                                                            </span>
                                                        </td>
                                                        {selectedTemplate.fields.map(f => (
                                                            <td key={f.fieldId} style={tdStyle}>
                                                                {answerMap[f.fieldLabel] || '—'}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div style={{
                                            display: 'flex', justifyContent: 'center',
                                            alignItems: 'center', gap: 6, marginTop: 20
                                        }}>
                                            <button
                                                onClick={() => handleViewSubmissions(selectedTemplate, currentPage - 1)}
                                                disabled={currentPage === 0}
                                                style={pageBtn(currentPage === 0)}>
                                                ← Prev
                                            </button>
                                            {Array.from({ length: totalPages }, (_, i) => i)
                                                .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 2)
                                                .map((i, idx, arr) => (
                                                    <React.Fragment key={i}>
                                                        {idx > 0 && arr[idx - 1] !== i - 1 && (
                                                            <span style={{ color: '#9ca3af', padding: '0 4px' }}>...</span>
                                                        )}
                                                        <button
                                                            onClick={() => handleViewSubmissions(selectedTemplate, i)}
                                                            style={pageBtn(false, currentPage === i)}>
                                                            {i + 1}
                                                        </button>
                                                    </React.Fragment>
                                                ))}
                                            <button
                                                onClick={() => handleViewSubmissions(selectedTemplate, currentPage + 1)}
                                                disabled={currentPage >= totalPages - 1}
                                                style={pageBtn(currentPage >= totalPages - 1)}>
                                                Next →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Modal ── */}
            {showModal && (
                <TemplateFormModal
                    template={editingTemplate}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditingTemplate(null); }}
                />
            )}

        </StaffLayout>
    );
}

/* ── Style helpers ───────────────────────────────────────────────────────────── */
const actionBtn = (bg) => ({
    padding: '9px 16px', border: 'none', borderRadius: 8,
    background: bg, color: '#fff', cursor: 'pointer',
    fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
    fontFamily: 'inherit'
});

const pageBtn = (disabled, active = false) => ({
    padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6,
    background: active ? '#0f172a' : disabled ? '#f9fafb' : '#fff',
    color: active ? '#f59e0b' : disabled ? '#d1d5db' : '#374151',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13, fontWeight: active ? 600 : 400, fontFamily: 'inherit'
});

const thStyle = {
    padding: '10px 14px', textAlign: 'left', fontWeight: 600,
    color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap'
};

const tdStyle = {
    padding: '11px 14px', borderBottom: '1px solid #f3f4f6', color: '#374151'
};