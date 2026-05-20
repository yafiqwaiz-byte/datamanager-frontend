import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';
import axios from 'axios';

export default function UserDataPage() {
    const [submissions, setSubmissions] = useState([]);  
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [currentPage,setCurrentPage] = useState(0);
    const [totalPages,setTotalPages] = useState(0);
    const [totalElements,setTotalElements] = useState(0);
    const navigate = useNavigate();

    const fetchSubmissions = async (page =0) => {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        try{
            const response = await axios.get(`http://localhost:8080/api/forms/my-submissions?page=${page}&size=10`,
                {headers:{ 'Authorization': `Bearer ${token}`}}
            );
            setSubmissions(response.data.content);
            setTotalPages(response.data.page.totalPages);
            setCurrentPage(response.data.page.number);
            setTotalElements(response.data.page.totalElements);
        } catch {
            setError('Failed to load your submission.Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const username = localStorage.getItem('username') || 'User';
        setUserName(user.fullName || username);

        const token = localStorage.getItem('authToken');
        if (!token) {
            navigate('/signin');
            return;
        }
        fetchSubmissions(0);
        
    }, []);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-MY', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isImagePath = (value) => {  // ← was 'isimagePath' (wrong casing)
        if (!value) return false;
        return value.match(/\.(jpeg|jpg|png|bmp|svg)$/i);
    };

    const isFilePath = (value) => {  // ← was 'isfilePath' (wrong casing)
        if (!value) return false;
        return value.match(/\.(pdf|doc|docx|xls|xlsx|txt)$/i);
    };

    const renderAnswerValue = (value) => {
    if (!value) return <span style={{ color: 'gray' }}>No data</span>;

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

    return <span>{value}</span>;
};


    const getStatusStyle = (status) => {  // ← was 'renderStatus' but called as 'getStatusStyle'
        switch (status) {
            case 'submitted': return { backgroundColor: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' };
            case 'pending': return { backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' };
            case 'rejected': return { backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' };
            default: return { backgroundColor: '#e5e7eb', color: '#374151', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' };
        }
    };

    return (
        <div className="dashboard-container user-theme">

            {/* Background decoration */}
            <div className="bg-decoration">
                <div className="bg-circle circle-1"></div>
                <div className="bg-circle circle-2"></div>
                <div className="bg-circle circle-3"></div>
            </div>

            {/* Navbar */}
            <nav className="dashboard-nav">
                <div className="nav-brand">
                    <span className="brand-icon">⚡</span>
                    <span className="brand-name">DataManager</span>
                </div>
                <div className="nav-info">
                    <span className="nav-role user-badge">USER</span>
                    <span className="nav-username">{userName}</span>
                    <button className="signout-btn" onClick={() => navigate('/user-home')}>← Back</button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="dashboard-main">
                <section className="welcome-section">
                    <div className="welcome-text">
                        <h1 className="welcome-heading">My Submissions</h1>
                        <p className="welcome-subtitle">{totalElements>0 ?`${totalElements} total submission${totalElements !== 1?'s':''}`:'View all your submitted form data'}</p>
                    </div>
                </section>

                <section className="menu-section">
                    {loading && <p>Loading submissions...</p>}
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    {!loading && !error && submissions.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                            <p style={{ fontSize: '48px' }}>📭</p>
                            <p>No submissions yet. Fill in a form to get started!</p>
                            <button
                                onClick={() => navigate('/user/form')}
                                style={{ marginTop: '12px', padding: '10px 20px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                Go to Forms
                            </button>
                        </div>
                    )}

                    {/* Submissions List */}
                    {!loading && submissions.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {submissions.map(submission => (
                                <div
                                    key={submission.submissionId}
                                    style={{
                                        background: 'white',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                        border: '1px solid #e5e7eb'
                                    }}
                                >
                                    {/* Submission Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>
                                                {submission.templateName}
                                            </h3>
                                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                                                Submitted: {formatDate(submission.submittedAt)}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={getStatusStyle(submission.status)}>
                                                {submission.status}
                                            </span>
                                            <button
                                                onClick={() => setSelectedSubmission(
                                                    selectedSubmission?.submissionId === submission.submissionId ? null : submission
                                                )}
                                                style={{
                                                    padding: '6px 14px',
                                                    backgroundColor: '#7c3aed',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                {selectedSubmission?.submissionId === submission.submissionId ? 'Hide' : 'View Details'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Submission Details — expand on click */}
                                    {selectedSubmission?.submissionId === submission.submissionId && (
                                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#f9fafb' }}>
                                                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>
                                                            Field
                                                        </th>
                                                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '13px', color: '#6b7280', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>
                                                            Answer
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {submission.answers.map((answer, index) => (
                                                        <tr key={answer.answerId}
                                                            style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                                                            <td style={{ padding: '10px 12px', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>
                                                                {answer.fieldLabel}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', fontSize: '14px', color: '#4b5563', borderBottom: '1px solid #f3f4f6' }}>
                                                                {renderAnswerValue(answer.answerValue)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
                {totalPages > 1 && (
                <div className="pagination-container">
                    <button
                        className={`pagination-btn ${currentPage === 0 ? 'disabled' : ''}`}
                        onClick={() => fetchSubmissions(currentPage - 1)}
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
                                    onClick={() => fetchSubmissions(i)}>
                                    {i + 1}
                                </button>
                            </React.Fragment>
                        ))
                    }

                    <button
                        className={`pagination-btn ${currentPage >= totalPages - 1 ? 'disabled' : ''}`}
                        onClick={() => fetchSubmissions(currentPage + 1)}
                        disabled={currentPage >= totalPages - 1}>
                        Next →
                    </button>
                </div>
            )}
            </main>
        </div>
    );  
}       
