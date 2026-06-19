import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffLayout from '../components/StaffLayout';
import { getAllSubmissions } from '../services/templateService';
import '../styles/Stafffetchdata.css';
import ExcelJS from 'exceljs';

export default function StaffFetchData() {
  const navigate = useNavigate();

  /* ── Data state ── */
  const [submissions, setSubmissions]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [currentPage, setCurrentPage]   = useState(0);
  const [totalPages, setTotalPages]     = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  /* ── Filter / sort state ── */
  const [searchTerm, setSearchTerm]         = useState('');
  const [filterTemplate, setFilterTemplate] = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [sortBy, setSortBy]                 = useState('date');

  /* ── UI state ── */
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedIds, setExpandedIds] = useState(new Set());

  /* ── Fetch ── */
  useEffect(() => { fetchAll(0); }, []);

  const fetchAll = async (page = 0) => {
    setLoading(true);
    try {
      const data = await getAllSubmissions(page, 10);
      setSubmissions(data.content);
      setTotalPages(data.page.totalPages);
      setCurrentPage(data.page.number);
      setTotalElements(data.page.totalElements);
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /* ── Derived ── */
  const templateNames = [...new Set(submissions.map(s => s.templateName))];

  const filtered = submissions
    .filter(s => {
      const matchSearch   = !searchTerm || s.answers.some(a =>
        a.answerValue?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchTemplate = !filterTemplate || s.templateName === filterTemplate;
      const matchStatus   = !filterStatus   || s.status === filterStatus;
      return matchSearch && matchTemplate && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date')     return new Date(b.submittedAt) - new Date(a.submittedAt);
      if (sortBy === 'template') return a.templateName.localeCompare(b.templateName);
      if (sortBy === 'status')   return a.status.localeCompare(b.status);
      return 0;
    });

  /* ── Selection ── */
  const allSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.submissionId));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(s => s.submissionId)));
    }
  };

  const toggleOne = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  /* ── Expand ── */
  const toggleExpand = (id) => {
    const next = new Set(expandedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedIds(next);
  };

  /* ── Export ── */
  const handleExportExcel = async () => {
    const rows = someSelected
      ? filtered.filter(s => selectedIds.has(s.submissionId))
      : filtered;
    if (!rows.length) return;

    const workbook  = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Submissions');

    worksheet.columns = [
      { header: 'Template',     key: 'template',    width: 25 },
      { header: 'Submitted At', key: 'submittedAt', width: 23 },
      { header: 'Status',       key: 'status',      width: 14 },
      { header: 'Input Method', key: 'inputMethod', width: 14 },
      { header: 'Answers',      key: 'answers',     width: 60 },
    ];

    worksheet.getRow(1).eachCell(cell => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    worksheet.getRow(1).height = 30;

    rows.forEach(sub => {
      const row = worksheet.addRow({
        template:    sub.templateName,
        submittedAt: new Date(sub.submittedAt).toLocaleString('en-MY'),
        status:      sub.status,
        inputMethod: sub.inputMethod,
        answers:     sub.answers.map(a => `${a.fieldLabel}: ${a.answerValue || ''}`).join(' | '),
      });
      row.eachCell(cell => { cell.alignment = { vertical: 'middle', wrapText: true }; });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob   = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `submissions_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Render answer value ── */
  const renderAnswerValue = (value) => {
    if (!value) return <span style={{ color: '#9ca3af' }}>—</span>;
    const parts = value.split(',').map(v => v.trim()).filter(Boolean);
    const isFile = parts.some(p =>
      p.match(/\.(jpeg|jpg|png|gif|bmp|svg|pdf|doc|docx|xlsx|csv|txt)$/i)
    );
    if (isFile) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {parts.map((path, i) => (
            path.match(/\.(jpeg|jpg|png|gif|bmp|svg)$/i) ? (
              <a key={i} href={`http://localhost:8080/${path}`}
                target="_blank" rel="noreferrer" className="sfd-file-link">
                🖼 {parts.length > 1 ? `Image ${i + 1}` : 'View Image'}
              </a>
            ) : (
              <a key={i} href={`http://localhost:8080/${path}`}
                target="_blank" rel="noreferrer" className="sfd-file-link">
                📄 {parts.length > 1 ? `File ${i + 1}` : 'View File'}
              </a>
            )
          ))}
        </div>
      );
    }
    return <span className="sfd-answer-value">{value}</span>;
  };

  /* ── Staff name from localStorage (for StaffLayout) ── */
  const [staffName, setStaffName] = useState('');
  const [staffData, setStaffData] = useState(null);
  useEffect(() => {
    const user     = JSON.parse(localStorage.getItem('user') || '{}');
    const username = localStorage.getItem('username') || 'Staff';
    setStaffName(user?.fullName || username);
    setStaffData(user);
  }, []);

  /* ── Render ── */
  return (
    <StaffLayout title="User Submissions" staffName={staffName} staffData={staffData}>

      {/* ── Page header ── */}
      <div className="sfd-header">
        <div>
          <h1 className="sfd-heading">User Submissions</h1>
          <p className="sfd-subheading">{totalElements} total submission{totalElements !== 1 ? 's' : ''}</p>
        </div>
        <button className="sfd-export-btn" onClick={handleExportExcel}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export Excel
        </button>
      </div>

      {/* ── Selection action bar ── */}
      {someSelected && (
        <div className="sfd-selection-bar">
          <span><span className="sfd-sel-count">{selectedIds.size}</span> row{selectedIds.size > 1 ? 's' : ''} selected</span>
          <button onClick={handleExportExcel}>Export selected</button>
          <button onClick={() => setSelectedIds(new Set())}>Clear</button>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="sfd-toolbar">
        <div className="sfd-toolbar-left">
          {/* Select all */}
          <div className="sfd-select-all-row">
            <input
              type="checkbox"
              id="sfd-select-all"
              checked={allSelected}
              onChange={toggleAll}
            />
            <label htmlFor="sfd-select-all" className="sfd-select-all-label">
              Select All
            </label>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 4px' }} />

          {/* Filter button */}
          <button className="sfd-toolbar-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
          </button>

          {/* Sort select */}
          <button className="sfd-toolbar-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
              <line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/>
            </svg>
            Sort
          </button>

          {/* Fields */}
          <button className="sfd-toolbar-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Fields
          </button>

          {/* Actions */}
          <button className="sfd-toolbar-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
            Actions
          </button>
        </div>

        <div className="sfd-toolbar-right">
          {/* Search */}
          <div className="sfd-search-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="sfd-search"
              placeholder="Search answers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Template filter */}
          <select className="sfd-select" value={filterTemplate} onChange={e => setFilterTemplate(e.target.value)}>
            <option value="">All templates</option>
            {templateNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* Status filter */}
          <select className="sfd-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Sort */}
          <select className="sfd-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="date">Date</option>
            <option value="template">Template</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="sfd-table-card">
        {loading ? (
          <div className="sfd-loading">Loading submissions…</div>
        ) : filtered.length === 0 ? (
          <div className="sfd-empty">
            <div className="sfd-empty-icon">📭</div>
            <p>No submissions found.</p>
          </div>
        ) : (
          <table className="sfd-table">
            <thead>
              <tr>
                <th className="sfd-col-check">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    style={{ width: 16, height: 16, accentColor: '#4338ca', cursor: 'pointer' }}
                  />
                </th>
                <th>Template</th>
                <th className="sfd-col-date">Submitted At</th>
                <th className="sfd-col-status">Status</th>
                <th className="sfd-col-method">Input Method</th>
                <th className="sfd-col-expand" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(sub => {
                const isSelected = selectedIds.has(sub.submissionId);
                const isExpanded = expandedIds.has(sub.submissionId);
                const statusKey  = (sub.status || '').toLowerCase();

                return (
                  <React.Fragment key={sub.submissionId}>
                    {/* Main row */}
                    <tr className={isSelected ? 'sfd-row-selected' : ''}>
                      <td className="sfd-col-check">
                        <input
                          type="checkbox"
                          className="sfd-row-check"
                          checked={isSelected}
                          onChange={() => toggleOne(sub.submissionId)}
                        />
                      </td>
                      <td className="sfd-cell-template">{sub.templateName}</td>
                      <td className="sfd-cell-date">
                        {new Date(sub.submittedAt).toLocaleString('en-MY')}
                      </td>
                      <td>
                        <span className={`sfd-badge ${statusKey}`}>
                          <span className="sfd-badge-dot" />
                          {sub.status}
                        </span>
                      </td>
                      <td>
                        <span className="sfd-method-chip">{sub.inputMethod}</span>
                      </td>
                      <td>
                        <button
                          className="sfd-expand-btn"
                          onClick={() => toggleExpand(sub.submissionId)}
                          title={isExpanded ? 'Collapse' : 'Expand answers'}
                        >
                          {isExpanded ? '↑' : '↕'}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded answers row */}
                    {isExpanded && (
                      <tr className="sfd-answers-row">
                        <td colSpan={6}>
                          <div className="sfd-answers-inner">
                            {sub.answers.map(a => (
                              <div key={a.answerId} className="sfd-answer-item">
                                <span className="sfd-answer-label">{a.fieldLabel}</span>
                                {renderAnswerValue(a.answerValue)}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="sfd-pagination">
            <button
              className="sfd-page-btn"
              onClick={() => fetchAll(currentPage - 1)}
              disabled={currentPage === 0}
            >
              ← Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i)
              .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 2)
              .map((i, idx, arr) => (
                <React.Fragment key={i}>
                  {idx > 0 && arr[idx - 1] !== i - 1 && (
                    <span className="sfd-page-ellipsis">…</span>
                  )}
                  <button
                    className={`sfd-page-btn ${currentPage === i ? 'active' : ''}`}
                    onClick={() => fetchAll(i)}
                  >
                    {i + 1}
                  </button>
                </React.Fragment>
              ))}

            <button
              className="sfd-page-btn"
              onClick={() => fetchAll(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
            >
              Next →
            </button>
          </div>
        )}
      </div>

    </StaffLayout>
  );
}