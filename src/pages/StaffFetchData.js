import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSubmissions } from '../services/templateService';
import '../styles/Dashboard.css';
import ExcelJS from 'exceljs';

export default function StaffFetchData() {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [filterTemplate, setFilterTemplate] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements,setTotalElements] = useState(0);
    const navigate = useNavigate();

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async (page = 0) => {
        setLoading(true);
        try {
            const data = await getAllSubmissions(page,10);
            setSubmissions(data.content);
            setTotalPages(data.page.totalPages);
            setCurrentPage(data.page.number);
            setTotalElements(data.page.totalElements);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Get unique template names for filter dropdown
    const templateNames = [...new Set(submissions.map(s => s.templateName))];

    const filtered = submissions
        .filter(s => {
            const matchSearch = !searchTerm || s.answers.some(a =>
                a.answerValue?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            const matchTemplate = !filterTemplate || s.templateName === filterTemplate;
            const matchStatus = !filterStatus || s.status === filterStatus;
            return matchSearch && matchTemplate && matchStatus;
        })
        .sort((a, b) => {
            if (sortBy === 'date') return new Date(b.submittedAt) - new Date(a.submittedAt);
            if (sortBy === 'template') return a.templateName.localeCompare(b.templateName);
            if (sortBy === 'status') return a.status.localeCompare(b.status);
            return 0;
        });

    const handleExportExcel = async() =>{
        if (!filtered.length)return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Submissions');

        worksheet.columns = [
            {header: 'Template',key: 'template',width:25},
            {header: 'Submitted At',key: 'submittedAt',width:23},
            {header: 'Status',key: 'status',width:14},
            {header: 'Input Method',key: 'inputMethod',width:14},
            {header: 'Answers',key: 'answers',width:60},
        ];

        worksheet.getRow(1).eachCell(cell =>{
            cell.font ={ bold:true, color:{ argb:'FFFFFFFF'}};
            cell.fill ={ type:'pattern', pattern:'solid', fgColor:{argb:'FF4338CA'}};
            cell.alignment ={ vertical:'middle', horizontal:'center'};
        });

        worksheet.getRow(1).height = 30;

        filtered.forEach(sub => {
            const row =worksheet.addRow({
              template:sub.templateName,
              submittedAt:new Date(sub.submittedAt).toLocaleString('en-MY'),
              status: sub.status,
              inputMethod: sub.inputMethod,
              answers: sub.answers.map(a => `${a.fieldLabel}: ${a.answerValue || ''}`).join(' | ')
            });
            row.eachCell(cell =>{ cell.alignment = { vertical:'middle',wrapText:true};});
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer],{
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = URL.createObjectURL(blob);
        const doc = document.createElement('a');
        doc.href = url;
        doc.download = `submissions_${new Date().toISOString().slice(0,10)}.xlsx`;
        doc.click();
        URL.revokeObjectURL(url);
    };

const renderAnswerValue = (value) => {
    if (!value) return <span style={{ color: '#9ca3af' }}>—</span>;

    const parts = value.split(',').map(v => v.trim()).filter(Boolean);

    if (parts.some(p => p.match(/\.(jpeg|jpg|png|gif|bmp|svg)$/i) || 
                        p.match(/\.(pdf|doc|docx|xlsx|csv|txt)$/i))) {
        
    
    
    
                            return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {parts.map((path, i) => (
                    path.match(/\.(jpeg|jpg|png|gif|bmp|svg)$/i) ? (
                        <a key={i} href={`http://localhost:8080/${path}`}
                            target="_blank" rel="noreferrer"
                            style={{ color: '#7c3aed', textDecoration: 'underline' }}>
                            🖼 {parts.length > 1 ? `Image ${i + 1}` : 'View Image'}
                        </a>
                    ) : (
                        <a key={i} href={`http://localhost:8080/${path}`}
                            target="_blank" rel="noreferrer"
                            style={{ color: '#7c3aed', textDecoration: 'underline' }}>
                            📄 {parts.length > 1 ? `File ${i + 1}` : 'View File'}
                        </a>
                    )
                ))}
            </div>
        );
    }

    return <span style={{ color: '#111' }}>{value}</span>;
};

    const inputStyle = {
        padding: '8px 12px',
        border: '1px solid #ddd',
        borderRadius: 8,
        fontSize: 13,
        background: '#fff'
    };

    const cardStyle = {
        background: 'white',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #e5e7eb'
    };

    return (
        <div className="dashboard-container staff-theme">
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
                    <button className="signout-btn" onClick={() => navigate('/staff-home')}>← Back</button>
                </div>
            </nav>

            <main className="dashboard-main">
                <section className="welcome-section">
                    <div className="welcome-text">
                        <h1 className="welcome-heading">User Submissions</h1>
                        <p className="welcome-subtitle">{totalElements} total submission</p>
                    </div>
                    <button onClick={handleExportExcel}
                        style={{ padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
                        ⬇ Export Excel
                    </button>
                </section>

                {/* Filters */}
                <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                    <input
                        placeholder="Search answers..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={inputStyle}
                    />
                    <select value={filterTemplate} onChange={e => setFilterTemplate(e.target.value)} style={inputStyle}>
                        <option value="">All templates</option>
                        {templateNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={inputStyle}>
                        <option value="">All statuses</option>
                        <option value="submitted">Submitted</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={inputStyle}>
                        <option value="date">Sort by Date</option>
                        <option value="template">Sort by Template</option>
                        <option value="status">Sort by Status</option>
                    </select>
                </section>

                <section className="menu-section">
                    {loading ? (
                        <p style={{ color: '#888', textAlign: 'center', marginTop: 60 }}>Loading...</p>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
                            <p style={{ fontSize: 48 }}>📭</p>
                            <p>No submissions found.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {filtered.map(sub => (
                                <div key={sub.submissionId} style={cardStyle}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{sub.templateName}</h3>
                                            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
                                                {new Date(sub.submittedAt).toLocaleString('en-MY')} · {sub.inputMethod}
                                            </p>
                                        </div>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                                            background: sub.status === 'submitted' ? '#dcfce7' : '#f3f4f6',
                                            color: sub.status === 'submitted' ? '#16a34a' : '#6b7280'
                                        }}>
                                            {sub.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
                                        {sub.answers.map(a => (
                                        <div key={a.answerId} style={{ fontSize: 13 }}>
                                            <span style={{ color: '#6b7280', fontWeight: 500 }}>{a.fieldLabel}: </span>
                                            {renderAnswerValue(a.answerValue)}
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
                {totalPages > 1 && (
                    <div className="pagination-container">
                        <button
                            className={`pagination-btn ${currentPage === 0 ? 'disabled' : ''}`}
                            onClick={() => fetchAll(currentPage - 1)}
                            disabled={currentPage === 0}>
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
                                        className={`pagination-btn ${currentPage === i ? 'active' : ''}`}
                                        onClick={() => fetchAll(i)}>
                                        {i + 1}
                                    </button>
                                </React.Fragment>
                            ))
                        }

                        <button
                            className={`pagination-btn ${currentPage >= totalPages - 1 ? 'disabled' : ''}`}
                            onClick={() => fetchAll(currentPage + 1)}
                            disabled={currentPage >= totalPages - 1}>
                            Next →
                        </button>
                    </div>
                )}
            </main>
        </div>
    );



}