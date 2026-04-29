import React, {useState,useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import TemplateFormModal from '../components/TemplateFormModal';
import {
    getTemplates,createTemplate,updateTemplate,
    toggleTemplate,deleteTemplate,
    getTemplateSubmissions
} from '../services/templateService';
import '../styles/Dashboard.css';

function StaffTemplates(){

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

    const handleExportCSV =()=> {
        if (!submissions.length) return;
        const fields = selectedTemplate.fields.map(f => f.fieldLabel);
        const headers = ['Submission ID', 'Submitted At', 'Status', ...fields];
        const rows = filteredSubmissions.map(sub =>{
            const answermap = {};
            sub.answers.forEach(a => {answermap[a.fieldLabel]= a.answerValue || '';});
            return [
                sub.submissionId,
                new Date(sub.submittedAt).toLocaleString('en-MY'),
                sub.status,
                ...fields.map(f => answermap[f] || '')
            ];    
            });

            const csv = [headers,...rows].map(r => r.join(',')).join('\n');
            const blob = new Blob([csv],{ type: 'text/csv'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href=url;
            a.download = `${selectedTemplate.templateName}_submissions.csv`;
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
                <section className="welcome-section">
                    <div className="welcome-text">
                        <h1 className="welcome-heading">Form Templates</h1>
                        <p className="welcome-subtitle">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button style={btnStyle('#e11d48')}
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
                            <button style={btnStyle('#e11d48')} onClick={() => setShowModal(true)}>
                                Create your first template
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                            {/* Template Cards */}
                            <div className="menu-grid">
                                {templates.map((t, index) => (
                                    <div key={t.templateId} className="menu-card"
                                        style={{
                                            '--card-color': selectedTemplate?.templateId === t.templateId ? '#7c3aed' : '#e11d48',
                                            '--delay': `${index * 0.1}s`,
                                            cursor: 'default',
                                            outline: selectedTemplate?.templateId === t.templateId ? '2px solid #7c3aed' : 'none'
                                        }}>
                                        <div className="card-icon-wrapper">
                                            <span className="card-icon">📝</span>
                                        </div>
                                        <div className="card-content">
                                            <h3 className="card-title">{t.templateName}</h3>
                                            <p className="card-description">{t.description || '—'}</p>
                                            <p style={{ fontSize: 12, color: '#999', margin: '4px 0 0' }}>
                                                {t.fields.length} field{t.fields.length !== 1 ? 's' : ''} •{' '}
                                                <span style={{ color: t.isActive ? '#16a34a' : '#9ca3af', fontWeight: 500 }}>
                                                    {t.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 'auto' }}>
                                            <button onClick={() => handleViewSubmissions(t)}
                                                style={btnStyle('#7c3aed')}>
                                                {selectedTemplate?.templateId === t.templateId ? 'Hide' : 'Submissions'}
                                            </button>
                                            <button onClick={() => handleEdit(t)}
                                                style={btnStyle('#3b82f6')}>Edit</button>
                                            <button onClick={() => handleToggle(t.templateId)}
                                                style={btnStyle(t.isActive ? '#d97706' : '#16a34a')}>
                                                {t.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button onClick={() => handleDelete(t.templateId)}
                                                style={btnStyle('#e53e3e')}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Submissions Panel */}
                            {selectedTemplate && (
                                <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
                                    {/* Panel Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                                                {selectedTemplate.templateName} — Submissions
                                            </h2>
                                            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                                                {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            {/* Search */}
                                            <input
                                                placeholder="Search answers..."
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                                style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, width: 180 }}
                                            />
                                            {/* Sort */}
                                            <select
                                                value={sortBy}
                                                onChange={e => setSortBy(e.target.value)}
                                                style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }}>
                                                <option value="date">Sort by Date</option>
                                                <option value="status">Sort by Status</option>
                                            </select>
                                            {/* Export */}
                                            <button onClick={handleExportCSV} style={btnStyle('#16a34a')}>
                                                ⬇ Export CSV
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
                                                                        padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                                                                        background: sub.status === 'submitted' ? '#dcfce7' : '#f3f4f6',
                                                                        color: sub.status === 'submitted' ? '#16a34a' : '#6b7280'
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

const btnStyle = (bg) => ({
    padding: '5px 12px', border: 'none', borderRadius: 6,
    background: bg, color: '#fff', cursor: 'pointer',
    fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap'
});

const thStyle = {
    padding: '10px 12px', textAlign: 'left', fontWeight: 600,
    color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap'
};

const tdStyle = {
    padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151'
};

export default StaffTemplates;