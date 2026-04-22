import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import StaffHome from './pages/StaffHome';
import UserHome from './pages/UserHome';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/staff-home" element={<StaffHome />} />
        <Route path="/user-home" element={<UserHome />} />
        <Route path="/" element={<Navigate to="/signin" replace />} />
        
        {/* Add your other routes here */}
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}
        {/* <Route path="/user-dashboard" element={<UserDashboard />} /> */}
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
