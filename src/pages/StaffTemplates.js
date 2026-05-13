import React, {useState,useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import TemplateFormModal from '../components/TemplateFormModal';
import {
    getTemplates,createTemplate,updateTemplate,
    toggleTemplate,deleteTemplate,
    getTemplateSubmissions
} from '../services/templateService';
import '../styles/Dashboard.css';
import ExcelJS from 'exceljs';

export default function StaffTemplates(){

    const [templates,setTemplates]= useState([]);
    const [loading,setLoading]= useState(true);
    const [showModal,setShowModal]= useState(false);
    const [editingTemplate,setEditingTemplate]= useState(null);
    const [selectedTemplate,setSelectedTemplate]= useState(null);
    const [submissions,setSubmissions] = useState([]);
    const [submissionsLoading,setSubmissionsLoading]= useState(false);
    const [searchTerm,setSearchTerm]= useState('');
    const [sortBy,setSortBy] = useState('date');
    const navigate = useNavigate();

    useEffect(() => { fetchTemplates();},[]);

    const fetchTemplates = async() =>{
        try{
            const data = await getTemplates();
            setTemplates(data);
        } catch (e){
            console.error(e);
        } finally {
            setLoading(false);
        }
        
    };

    const handleSave = async(data) =>{
        if (editingTemplate){
            await updateTemplate(editingTemplate.templateId,data);
        }else {
            await createTemplate(data);
        }
        fetchTemplates();
        setEditingTemplate(null);
        };
    

    const handleEdit =(templates) => {
        setEditingTemplate(templates);
        setShowModal(true);
    };

    const handleToggle = async (id) =>{
        await toggleTemplate(id);
        fetchTemplates();
    };

    const handleDelete = async (id) =>{
        if (!window.confirm('Delete this template?')) return;
        await deleteTemplate(id);
        fetchTemplates();
    };

    const handleViewSubmissions = async (templates)=> {
        if (selectedTemplate?.templateId === templates.templateId){
            setSelectedTemplate(null);
            setSubmissions([]);
            return;
        }
        setSelectedTemplate(templates);
        setSubmissionsLoading(true);
        try{
            const data = await getTemplateSubmissions(templates.templateId);
            setSubmissions(data);
        } catch (e){
            console.error(e);
        } finally{
            setSubmissionsLoading(false);
        }
    };

    const handleExportExcel = async () => {
    if (!submissions.length) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(selectedTemplate.templateName);
    const fields = selectedTemplate.fields.map(f => f.fieldLabel);

    // Detect image fields (comma-separated paths or single path)
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

    // Columns
    worksheet.columns = [
        { header: 'Submission ID', key: 'submissionId', width: 20 },
        { header: 'Submitted At', key: 'submittedAt', width: 22 },
        { header: 'Status', key: 'status', width: 12 },
        ...fields.map(f => ({
            header: f,
            key: f,
            width: imageFields.includes(f) ? 18 : 25
        }))
    ];

    // Style header
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

        // Count max images in any image field for this row — to size row height
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

        // Embed multiple images per field — stacked vertically in the cell
        for (let colIdx = 0; colIdx < fields.length; colIdx++) {
            const fieldLabel = fields[colIdx];
            if (!imageFields.includes(fieldLabel)) continue;

            const val = answerMap[fieldLabel] || '';
            const paths = val.split(',').filter(Boolean);

            for (let imgIdx = 0; imgIdx < paths.length; imgIdx++) {
                const filePath = paths[imgIdx].trim();
                try {
                    const imageUrl = `http://localhost:8080/${filePath.trim().replace(/\/\//g, '/')}`;
                    const res = await fetch(imageUrl, {
                        mode: 'cors',
                        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                    });
                    if(!res.ok) throw new Error(`HTTP ${res.status}`);
                    const blob = await res.blob();
                    const arrayBuffer = await blob.arrayBuffer();

                    const ext = filePath.split('.').pop().toLowerCase();
                    const imageId = workbook.addImage({
                        buffer: arrayBuffer,
                        extension: ext === 'jpg' ? 'jpeg' : ext,
                    });

                    const col = 3 + colIdx;
                    const imgHeightPx = Math.floor((ROW_HEIGHT/paths.length)*0.75)
                    const offsetTop = imgIdx * imgHeightPx;

                    worksheet.addImage(imageId, {
                         tl: { col: col, row: rowIndex - 1, nativeColOff: 0, nativeRowOff: offsetTop * 9525 },
                         ext: { width: 120, height: imgHeightPx },
                         editAs: 'oneCell',
                    });
                } catch (e) {
                    console.error('Failed to embed image:',filePath, e);
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

    const filteredSubmissions = submissions
        .filter(s =>{
            if(!searchTerm) return true;
            return s.answers.some(a =>
                a.answerValue?.toLowerCase().includes(searchTerm.toLowerCase())
            )||s.status.toLowerCase().includes(searchTerm.toLowerCase());
        })
        .sort((a,b) =>{
            if (sortBy === 'date') return new Date(b.submittedAt) - new Date(a.submittedAt);
            if (sortBy === 'status') return a.status.localeCompare(b.status);
            return 0;
        });


     return (
    <div className="dashboard-container staff-home">
        <div className='bg-decoration'>
            <div className='bg-circle-1'></div>
            <div className='bg-circle-2'></div>
            <div className='bg-circle-3'></div>
        </div>

        <nav className="dashboard-nav">
            <div className="nav-brand">
                <span className="brand-icon">⚡</span>
                <span className="brand-name">DataManager</span>
            </div>
            <div className="nav-info">
                <button className="signout-btn" onClick={() => navigate('/staff-home')}>← Back</button>
            </div>
        </nav>

        <main className="dashboard-main">
            <section className="welcome-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="welcome-text">
                    <h1 className="welcome-heading">Form Templates</h1>
                    <p className="welcome-subtitle">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
                </div>
                <button style={actionBtn('#e11d48')}
                    onClick={() => { setEditingTemplate(null); setShowModal(true); }}>
                    + New template
                </button>
            </section>

            <section className="menu-section">
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

                        {/* Template Cards */}
                        <div className="menu-grid">
                            {templates.map((t, index) => (
                                <div key={t.templateId}
                                    style={{
                                        background: '#ffffff',
                                        border: selectedTemplate?.templateId === t.templateId
                                            ? '2px solid #7c3aed'
                                            : '1px solid #e8eaf0',
                                        borderRadius: 12,
                                        padding: 20,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 16,
                                        animationDelay: `${index * 0.1}s`,
                                        transition: 'border-color 0.2s',
                                    }}>

                                    {/* Card Top */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: 10,
                                            background: '#f5f6fa',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                                                {t.fields.length} field{t.fields.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '2px 8px',
                                                    borderRadius: 99,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    background: t.isActive ? '#dcfce7' : '#f3f4f6',
                                                    color: t.isActive ? '#166534' : '#6b7280'
                                                }}>
                                                    {t.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Card Actions */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 8,
                                        borderTop: '1px solid #f3f4f6',
                                        paddingTop: 14,
                                    }}>
                                        <button
                                            onClick={() => handleViewSubmissions(t)}
                                            style={{
                                                ...actionBtn(selectedTemplate?.templateId === t.templateId ? '#5b21b6' : '#7c3aed'),
                                                gridColumn: '1 / -1'
                                            }}>
                                            {selectedTemplate?.templateId === t.templateId ? 'Hide submissions' : 'View submissions'}
                                        </button>
                                        <button onClick={() => handleEdit(t)} style={actionBtn('#3b82f6')}>
                                            Edit
                                        </button>
                                        <button onClick={() => handleToggle(t.templateId)}
                                            style={actionBtn(t.isActive ? '#d97706' : '#16a34a')}>
                                            {t.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button onClick={() => handleDelete(t.templateId)}
                                            style={{ ...actionBtn('#e53e3e'), gridColumn: '1 / -1' }}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Submissions Panel */}
                        {selectedTemplate && (
                            <div style={{
                                background: 'white', borderRadius: 12, padding: 24,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                border: '1px solid #e5e7eb'
                            }}>
                                {/* Panel Header */}
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

                                {submissionsLoading ? (
                                    <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>Loading submissions...</p>
                                ) : filteredSubmissions.length === 0 ? (
                                    <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>
                                        {searchTerm ? 'No submissions match your search.' : 'No submissions yet for this template.'}
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
                                                                <span style={{
                                                                    padding: '3px 10px', borderRadius: 99,
                                                                    fontSize: 11, fontWeight: 600,
                                                                    background: sub.status === 'submitted' ? '#dcfce7' : '#f3f4f6',
                                                                    color: sub.status === 'submitted' ? '#166534' : '#6b7280'
                                                                }}>
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
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </section>
        </main>

        {showModal && (
            <TemplateFormModal
                template={editingTemplate}
                onSave={handleSave}
                onClose={() => { setShowModal(false); setEditingTemplate(null); }}
            />
        )}
    </div>
);
}

const actionBtn = (bg) => ({
    padding: '9px 0', border: 'none', borderRadius: 8,
    background: bg, color: '#fff', cursor: 'pointer',
    fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
    width: '100%', fontFamily: 'inherit'
});

const thStyle = {
    padding: '10px 14px', textAlign: 'left', fontWeight: 600,
    color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap'
};

const tdStyle = {
    padding: '11px 14px', borderBottom: '1px solid #f3f4f6', color: '#374151'
};

