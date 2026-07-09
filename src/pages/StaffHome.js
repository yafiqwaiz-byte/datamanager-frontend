import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffLayout from '../components/StaffLayout';
import { authService } from '../services/authService';

const API = "http://localhost:8080/api";

var FEATURE_CARDS = [
  { id: 'fetch-data', icon: '📋', iconColor: 'blue',   name: 'Fetch User Data',    desc: 'View and manage data submitted by users via forms or OCR input', path: '/staff/fetch-data' },
  { id: 'templates',  icon: '📝', iconColor: 'amber',  name: 'Form Templates',     desc: 'Create and manage form templates for users to fill in',           path: '/staff/templates'  },
  { id: 'po-aging',   icon: '📈', iconColor: 'blue',   name: 'PO Aging Dashboard', desc: 'Track and monitor PO outstanding aging by station and subzone',   path: '/staff/po-aging'   },
];

// ── Fixed: both subtools point to pages that don't need a mappingId upfront ──
var LETTER_SUBTOOLS = [
  {
    id:   'letter-queue',
    icon: '📬',
    name: 'Letter Queue',
    desc: 'View pending submissions, trigger auto-map and review fields',
    path: '/staff/letter/queue',            // ← entry point for full letter flow
  },
  {
    id:   'letter-upload',
    icon: '📤',
    name: 'Upload Template',
    desc: 'Upload Word templates with placeholders for letter generation',
    path: '/staff/letter/upload-template',  // ← template management
  },
];

function StatusText(props) {
  var status = props.status;
  var labels = { active: 'Active', pending: 'Pending', error: 'Error', reboot: 'Reboot' };
  return (
    <span className={'sl-status ' + status}>
      <span className="dot" />
      {labels[status] || status}
    </span>
  );
}

export default function StaffHome() {
  var navigate = useNavigate();
  var [staffName, setStaffName] = useState('');
  var [staffData, setStaffData] = useState(null);

  // ── Dashboard stats (dynamic) ──
  var [stats, setStats] = useState({
    userRecords: '—',
    pendingReviews: '—',
    lettersGenerated: '—',
  });

  // ── Recent activity (dynamic) ──
  var [activity, setActivity] = useState([]);
  var [activityLoading, setActivityLoading] = useState(true);

  useEffect(function () {
    var user     = JSON.parse(localStorage.getItem('user') || '{}');
    var username = localStorage.getItem('username') || 'Staff';
    setStaffName(user && user.fullName ? user.fullName : username);
    setStaffData(user);
  }, []);

  useEffect(() => {
    authService.fetchWithAuth(`${API}/staff/dashboard/stats`)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(setStats)
      .catch(() => {
        // stats stay at '—' placeholders on failure
      });
  }, []);

  useEffect(() => {
    setActivityLoading(true);
    authService.fetchWithAuth(`${API}/staff/dashboard/activity?limit=10`)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(setActivity)
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  }, []);

  var STAT_CARDS = [
    { icon: '👥', iconColor: 'blue',  value: stats.userRecords,      label: 'User records'      },
    { icon: '⏳', iconColor: 'amber', value: stats.pendingReviews,   label: 'Pending reviews'   },
    { icon: '✉️', iconColor: 'green', value: stats.lettersGenerated, label: 'Letters generated' },
  ];

  return (
    <StaffLayout title="Dashboard" staffName={staffName} staffData={staffData}>

      {/* ── Stats ── */}
      <div className="sl-stats-row">
        {STAT_CARDS.map(function (s, i) {
          return (
            <div key={i} className="sl-stat-card">
              <div className={'sl-stat-icon ' + s.iconColor}>{s.icon}</div>
              <div>
                <div className="sl-stat-value">{s.value}</div>
                <div className="sl-stat-label">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Feature Grid ── */}
      <div className="sl-feat-grid">

        {/* Regular cards */}
        {FEATURE_CARDS.map(function (card) {
          return (
            <button
              key={card.id}
              className="sl-feat-card"
              onClick={() => navigate(card.path)}
            >
              <div className="sl-feat-top">
                <div className={'sl-feat-icon ' + card.iconColor}>{card.icon}</div>
                <div className="sl-feat-arrow">→</div>
              </div>
              <div className="sl-feat-name">{card.name}</div>
              <div className="sl-feat-desc">{card.desc}</div>
            </button>
          );
        })}

        {/* Letter Template dark card — clicks to queue (main workflow entry) */}
        <div
          className="sl-feat-card dark"
          onClick={() => navigate('/staff/letter/queue')}
          style={{ cursor: 'pointer' }}
        >
          <div className="sl-feat-top">
            <div className="sl-feat-icon dark">✉️</div>
            <div className="sl-feat-arrow">→</div>
          </div>
          <div className="sl-feat-name">Letter Management</div>
          <div className="sl-feat-desc">
            Process user letter requests — review OCR mappings and generate letters
          </div>
          <div className="sl-subtool-row" onClick={(e) => e.stopPropagation()}>
            {LETTER_SUBTOOLS.map(function (sub) {
              return (
                <button
                  key={sub.id}
                  className="sl-subtool"
                  onClick={(e) => { e.stopPropagation(); navigate(sub.path); }}
                >
                  <span className="sl-subtool-icon">{sub.icon}</span>
                  <div className="sl-subtool-info">
                    <div className="sl-subtool-name">{sub.name}</div>
                    <div className="sl-subtool-desc">{sub.desc}</div>
                  </div>
                  <span className="sl-subtool-caret">›</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TNB Map wide card */}
        <button
          className="sl-feat-card wide"
          onClick={() => navigate('/northern-tnb-station')}
        >
          <div className="sl-feat-icon-lg green">🗺️</div>
          <div className="sl-feat-body">
            <div className="sl-feat-name" style={{ fontSize: 14 }}>TNB Northern Map</div>
            <div className="sl-feat-desc">
              View the map of TNB Northern station with BA number and subzone information
            </div>
          </div>
          <div className="sl-feat-arrow" style={{ flexShrink: 0 }}>→</div>
        </button>
      </div>

      {/* ── Recent Activity ── */}
      <div className="sl-activity-card">
        <div className="sl-card-header">
          <span className="sl-card-title">Recent activity</span>
          <button className="sl-view-all">View all</button>
        </div>

        {activityLoading && (
          <p className="muted" style={{ padding: 16 }}>Loading...</p>
        )}

        {!activityLoading && activity.length === 0 && (
          <p className="muted" style={{ padding: 16 }}>No recent activity.</p>
        )}

        {!activityLoading && activity.length > 0 && (
          <table className="sl-table">
            <colgroup>
              <col style={{ width: '160px' }} />
              <col style={{ width: '72px' }} />
              <col />
              <col style={{ width: '120px' }} />
              <col style={{ width: '90px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Module</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activity.map(function (row, i) {
                return (
                  <tr key={row.activityId || i}>
                    <td className="muted">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString('en-MY')
                        : '—'}
                    </td>
                    <td><span className="sl-type-badge">{row.type}</span></td>
                    <td>{row.description}</td>
                    <td style={{ color: '#6b7280' }}>{row.module}</td>
                    <td><StatusText status={row.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </StaffLayout>
  );
}