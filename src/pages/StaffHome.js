import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

function StaffHome() {
  const [staffName, setStaffName] = useState('');
  const [staffData, setStaffData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    // Get staff info from localStorage (saved during signin)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const username = localStorage.getItem('username') || 'Staff';
    
    if (user && user.fullName) {
      setStaffName(user.fullName);
    } else {
      setStaffName(username);
    }
    setStaffData(user);

    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleSignOut = () => {
    localStorage.clear();
    navigate('/signin');
  };

  const menuItems = [
    {
      id: 'fetch-data',
      icon: '📋',
      title: 'Fetch User Data',
      description: 'View and manage data submitted by users via forms or OCR input',
      action: () => navigate('/staff/fetch-data'),
      color: '#4f46e5'
    },
    {
      id: 'upload-file',
      icon: '📂',
      title: 'Upload File',
      description: 'Insert CSV or XLSX files for data cleaning and processing',
      action: () => navigate('/staff/upload'),
      color: '#0891b2'
    },
    {
      id: 'dashboard',
      icon: '📊',
      title: 'Data Dashboard',
      description: 'Visualize processed data with charts and filters',
      action: () => navigate('/staff/data-dashboard'),
      color: '#059669'
    },
    {
      id: 'export',
      icon: '📤',
      title: 'Export Data',
      description: 'Export filtered and processed tables to various formats',
      action: () => navigate('/staff/export'),
      color: '#d97706'
    }
  ];

  return (
    <div className="dashboard-container staff-theme">
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
          <span className="nav-role staff-badge">STAFF</span>
          <span className="nav-username">{staffName}</span>
          <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Welcome Section */}
        <section className="welcome-section">
          <div className="welcome-text">
            <p className="greeting-label">{getGreeting()},</p>
            <h1 className="welcome-heading">
              Hi, Welcome! <span className="highlight-name">{staffName}</span> 👋
            </h1>
            <p className="welcome-subtitle">
              {currentTime.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="welcome-stats">
            <div className="stat-chip">
              <span className="stat-icon">🏢</span>
              <span>{staffData?.department || 'Department'}</span>
            </div>
            <div className="stat-chip">
              <span className="stat-icon">💼</span>
              <span>{staffData?.position || 'Position'}</span>
            </div>
          </div>
        </section>

        {/* Menu Grid */}
        <section className="menu-section">
          <h2 className="section-title">What would you like to do?</h2>
          <div className="menu-grid">
            {menuItems.map((item, index) => (
              <div
                key={item.id}
                className="menu-card"
                onClick={item.action}
                style={{ '--card-color': item.color, '--delay': `${index * 0.1}s` }}
              >
                <div className="card-icon-wrapper">
                  <span className="card-icon">{item.icon}</span>
                </div>
                <div className="card-content">
                  <h3 className="card-title">{item.title}</h3>
                  <p className="card-description">{item.description}</p>
                </div>
                <div className="card-arrow">→</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
export default StaffHome;
