import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffLayout from '../components/StaffLayout';

/* ── Mock recent activity — swap with real API later ─────────────────────── */
var RECENT_ACTIVITY = [
  { date: 'Today, 09:42',     type: 'Upload', desc: 'sales_data_june.xlsx processed',          module: 'Upload File',     status: 'active'  },
  { date: 'Today, 08:15',     type: 'Letter', desc: 'Field mapping review for Batch #14',      module: 'Letter Template', status: 'pending' },
  { date: 'Yesterday, 16:30', type: 'Export', desc: 'Q2 report exported as PDF',               module: 'Export Data',     status: 'active'  },
  { date: 'Yesterday, 14:00', type: 'Form',   desc: 'New template "KL District Form" created', module: 'Form Templates',  status: 'reboot'  },
  { date: '3 Jun, 11:20',     type: 'Map',    desc: 'TNB subzone layer refreshed',             module: 'TNB Map',         status: 'error'   },
];

/* ── Feature cards — Data Dashboard and Export Data removed ──────────────── */
var FEATURE_CARDS = [
  { id: 'fetch-data', icon: '📋', iconColor: 'blue',   name: 'Fetch User Data',     desc: 'View and manage data submitted by users via forms or OCR input', path: '/staff/fetch-data' },
  { id: 'templates',  icon: '📝', iconColor: 'amber',  name: 'Form Templates',      desc: 'Create and manage form templates for users to fill in',           path: '/staff/templates'  },
  { id: 'upload',     icon: '📂', iconColor: 'teal',   name: 'Upload File',         desc: 'Insert CSV or XLSX files for data cleaning and processing',       path: '/staff/upload'     },
  { id: 'po-aging',   icon: '📈', iconColor: 'blue',   name: 'PO Aging Dashboard',  desc: 'Track and monitor PO outstanding aging by station and subzone',   path: '/staff/po-aging'   },
];

var LETTER_SUBTOOLS = [
  { id: 'letter-review',   icon: '🗂️', name: 'Review Field Mapping', desc: 'Confirm OCR field mappings before generating letters', path: '/staff/letter/review'   },
  { id: 'letter-generate', icon: '📨', name: 'Generated Letters',    desc: 'Download completed letters in DOCX or PDF format',     path: '/staff/letter/generate' },
];

var STAT_CARDS = [
  { icon: '👥', iconColor: 'blue',   value: '—', label: 'User records'      },
  { icon: '⏳', iconColor: 'amber',  value: '—', label: 'Pending reviews'   },
  { icon: '✉️', iconColor: 'green',  value: '—', label: 'Letters generated' },
  { icon: '📁', iconColor: 'purple', value: '—', label: 'Files uploaded'    },
];

/* ── Status dot + label ──────────────────────────────────────────────────── */
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

/* ── Main component ──────────────────────────────────────────────────────── */
export default function StaffHome() {
  var navigate = useNavigate();
  var [staffName, setStaffName] = useState('');
  var [staffData, setStaffData] = useState(null);

  useEffect(function() {
    var user     = JSON.parse(localStorage.getItem('user') || '{}');
    var username = localStorage.getItem('username') || 'Staff';
    setStaffName(user && user.fullName ? user.fullName : username);
    setStaffData(user);
  }, []);

  return (
    <StaffLayout title="Dashboard" staffName={staffName} staffData={staffData}>

      {/* ── Stats ── */}
      <div className="sl-stats-row">
        {STAT_CARDS.map(function(s, i) {
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
        {FEATURE_CARDS.map(function(card) {
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

        {/* Letter Template dark card */}
        <div
          className="sl-feat-card dark"
          onClick={() => navigate('/staff/letter/upload-template')}
          style={{ cursor: 'pointer' }}
        >
          <div className="sl-feat-top">
            <div className="sl-feat-icon dark">✉️</div>
            <div className="sl-feat-arrow">→</div>
          </div>
          <div className="sl-feat-name">Letter Template</div>
          <div className="sl-feat-desc">
            Upload Word templates with placeholders for auto letter generation
          </div>
          <div className="sl-subtool-row" onClick={(e) => e.stopPropagation()}>
            {LETTER_SUBTOOLS.map(function(sub) {
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
            {RECENT_ACTIVITY.map(function(row, i) {
              return (
                <tr key={i}>
                  <td className="muted">{row.date}</td>
                  <td><span className="sl-type-badge">{row.type}</span></td>
                  <td>{row.desc}</td>
                  <td style={{ color: '#6b7280' }}>{row.module}</td>
                  <td><StatusText status={row.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </StaffLayout>
  );
}
