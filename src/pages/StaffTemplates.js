import React, {useState,useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import TemplateFormModal from '../components/TemplateFormModal';
import {
    getTemplates,createTemplate,updateTemplate,
    toggleTemplate,deleteTemplate
} from '../services/templateService';
import '../styles/Dashboard.css';

function StaffTemplates(){

    const [templates,setTemplates]= useState([]);
    const [loading,setLoading]= useState(true);
    const [showModal,setShowModal]= useState(false);
    const [editingTemplate,setEditingTemplate]= useState(null);
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

    return (
        <div className="dashboard-container staff-home">
            {/*background decoration */}
            <div className='bg-decoration'>
                <div className='bg-circle-1'></div>
                <div className='bg-circle-2'></div>
                <div className='bg-circle-3'></div>
            </div>
{/* Navbar */}
            <nav className="dashboard-nav">
                <div className="nav-brand">
                    <span className="brand-icon">⚡</span>
                    <span className="brand-name">DataManager</span>
                </div>
                <div className="nav-info">
                    <button className="signout-btn" onClick={() => navigate('/staff/home')}>
                        ← Back
                    </button>
                </div>
            </nav>

            <main className="dashboard-main">
                {/* Header */}
                <section className="welcome-section">
                    <div className="welcome-text">
                        <h1 className="welcome-heading">Form Templates</h1>
                        <p className="welcome-subtitle">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                        className="signout-btn"
                        style={{ background: '#e11d48', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}
                        onClick={() => { setEditingTemplate(null); setShowModal(true); }}>
                        + New template
                    </button>
                </section>

                {/* Template list */}
                <section className="menu-section">
                    {loading ? (
                        <p style={{ color: '#888', textAlign: 'center', marginTop: 60 }}>Loading...</p>
                    ) : templates.length === 0 ? (
                        <div style={{ textAlign: 'center', marginTop: 80, color: '#888' }}>
                            <p style={{ marginBottom: 16 }}>No templates yet.</p>
                            <button
                                className="signout-btn"
                                style={{ background: '#e11d48', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}
                                onClick={() => setShowModal(true)}>
                                Create your first template
                            </button>
                        </div>
                    ) : (
                        <div className="menu-grid">
                            {templates.map((t, index) => (
                                <div key={t.templateId} className="menu-card"
                                    style={{ '--card-color': '#e11d48', '--delay': `${index * 0.1}s`, cursor: 'default' }}>
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

export default StaffTemplates;
