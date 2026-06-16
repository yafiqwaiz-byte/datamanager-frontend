import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import '../styles/StaffLayout.css';

const NAV_ITEMS = [
  {
    group: 'Main',
    items: [
      { label: 'Dashboard',       icon: '⬡',  path: '/staff-home' },
      { label: 'Fetch User Data', icon: '📋', path: '/staff/fetch-data' },
      { label: 'Form Templates',  icon: '📝', path: '/staff/templates' },
      { label: 'Upload File',     icon: '📂', path: '/staff/upload' },
      { label: 'PO Aging', icon: '📈', path: '/staff/po-aging' },
    ],
  },
  {
    group: 'Tools',
    items: [
      { label: 'Data Dashboard',  icon: '📊', path: '/staff/data-dashboard' },
      { label: 'Export Data',     icon: '📤', path: '/staff/export' },
      { label: 'Letter Template', icon: '✉️', path: '/staff/letter/upload-template' },
      { label: 'TNB Map',         icon: '🗺️', path: '/northern-tnb-station' },
    ],
  },
];

function getInitials(name) {
  if (!name) return 'ST';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function StaffLayout({ title, staffName, staffData, children }) {
  const navigate  = useNavigate();
  const location  = useLocation();

  const safeTitle     = title     || 'Dashboard';
  const safeStaffName = staffName || '';
  const initials      = getInitials(safeStaffName);
  const roleLabel     = (staffData && staffData.department) ? staffData.department : 'Staff';

  function handleSignOut() {
    authService.logout();
    navigate('/signin');
  }

  return (
    <div className="sl-root">

      {/* ── Sidebar ── */}
      <aside className="sl-sidebar">

        {/* Logo */}
        <div
          className="sl-logo"
          onClick={() => navigate('/staff-home')}
          style={{ cursor: 'pointer' }}
        >
          <div className="sl-logo-icon">⚡</div>
          <span className="sl-logo-text">DataManager</span>
        </div>

        {/* Nav */}
        <nav className="sl-nav">
          {NAV_ITEMS.map(function(group) {
            return (
              <React.Fragment key={group.group}>
                <span className="sl-nav-label">{group.group}</span>
                {group.items.map(function(item) {
                  var isActive =
                    location.pathname === item.path ||
                    (item.path !== '/staff-home' &&
                      location.pathname.startsWith(item.path));
                  return (
                    <button
                      key={item.path}
                      className={'sl-nav-item' + (isActive ? ' active' : '')}
                      onClick={() => navigate(item.path)}
                    >
                      <span className="sl-nav-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="sl-sidebar-footer">
          <div className="sl-user-pill">
            <div className="sl-avatar-sm">{initials}</div>
            <div className="sl-user-info">
              <div className="sl-user-name">{safeStaffName || 'Staff'}</div>
              <div className="sl-user-role">{roleLabel}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="sl-main">

        {/* Topbar */}
        <header className="sl-topbar">
          <span className="sl-page-title">{safeTitle}</span>

          <div className="sl-topbar-right">
            <button className="sl-notif-btn" aria-label="Notifications">
              🔔
              <span className="sl-notif-dot" />
            </button>

            <span className="sl-role-badge">STAFF</span>

            <div
              className="sl-user-chip"
              onClick={handleSignOut}
              title="Click to sign out"
              style={{ cursor: 'pointer' }}
            >
              <div className="sl-avatar-md">{initials}</div>
              <span className="sl-chip-name">{safeStaffName || 'Staff'}</span>
              <span className="sl-chip-caret">⌄</span>
            </div>
          </div>
        </header>

        {/* Page content slot */}
        <div className="sl-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default StaffLayout;