import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';


export default function UserHome() {
  const [userName, setUserName] = useState('');
  const [userData, setUserData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
   
   
    if (!localStorage.getItem('username')) {
      navigate('/signin');
      return;
    }
     // Get user info from localStorage (saved during signin)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const username = localStorage.getItem('username') || 'User';

    if (user && user.fullName) {
      setUserName(user.fullName);
    } else {
      setUserName(username);
    }
    setUserData(user);

    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleSignOut = () => {
    authService.logout();
    navigate('/signin');
  };

  const menuItems = [
    {
      id: 'form-input',
      icon: '📝',
      title: 'Form Field Input',
      description: 'Fill in structured forms to submit your data to the system',
      action: () => navigate('/user/form'),
      color: '#7c3aed'
    },
    {
      id: 'ocr-scan',
      icon: '🔍',
      title: 'OCR Service',
      description: 'Scan and upload documents for automatic data extraction',
      action: () => navigate('/user/ocr-services'),
      color: '#db2777'
    },
    {
      id: 'view-data',
      icon: '📊',
      title: 'View My Data',
      description: 'View your submitted data in a structured table format',
      action: () => navigate('/user/data'),
      color: '#0891b2'
    }
  ];

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
              Hi, Welcome! <span className="highlight-name">{userName}</span> 👋
            </h1>
            <p className="welcome-subtitle">
              {currentTime.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="welcome-stats">
            <div className="stat-chip">
              <span className="stat-icon">🏢</span>
              <span>{userData?.companyName || 'Company'}</span>
            </div>
            <div className="stat-chip">
              <span className="stat-icon">📍</span>
              <span>{userData?.companyAddress || 'Address'}</span>
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

