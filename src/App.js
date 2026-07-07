import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import StaffHome from './pages/StaffHome';
import UserHome from './pages/UserHome';
import StaffTemplates from './pages/StaffTemplates';
import CompleteProfile from './pages/CompleteProfile';
import UserFormPage from './pages/UserFormPage';
import FormRenderer from './pages/FormRenderer';
import UserDataPage from './pages/UserDataPage';
import NorthenTNBStation from './pages/NorthenTNBStation';
import StaffFetchData from './pages/StaffFetchData';
import ForgotPassword from './pages/ForgotPassword';
import UserOcrPage from './pages/UserOcrPage';
import UserOcrLetterPage from './pages/UserOcrLetterPage';   // ← user letter request
import OcrSelectionPage from './pages/OcrSelectionPage';
import StaffTemplateLetterUpload from './pages/StaffTemplateLetterUpload';
import FieldMapperReview from './pages/FieldMapperReview';
import GeneratedLetter from './pages/GeneratedLetter';
import AdminDashboard from './pages/AdminDashboard';
import StaffPOAging from './pages/StaffPOAging';
import StaffLetterQueue from './pages/StaffLetterQueue';
import UserLetterStatus from './pages/UserLetterStatus';
import StaffLetterReview from './pages/StaffLetterReview';
import 'leaflet/dist/leaflet.css';

function App() {
  return (
    <Router future={{ 
      v7_startTransition: true,
      v7_relativeSplatPath: true 
    }}>
      <Routes>
        {/* Admin route */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        {/* Auth Routes */}
        <Route path="/signin"           element={<SignIn />} />
        <Route path="/signup"           element={<SignUp />} />
        <Route path="/forgot-password"  element={<ForgotPassword />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/"                 element={<Navigate to="/signin" replace />} />

        {/* Staff Routes */}
        <Route path="/staff-home"       element={<StaffHome />} />
        <Route path="/staff/templates"  element={<StaffTemplates />} />
        <Route path="/staff/fetch-data" element={<StaffFetchData />} />
        <Route path="/staff/po-aging"   element={<StaffPOAging />} />

        {/* Staff Letter Routes */}
        <Route path="/staff/letter/queue"               element={<StaffLetterQueue />} />
        <Route path="/staff/letter/upload-template"     element={<StaffTemplateLetterUpload />} />
        <Route path="/staff/letter/mapping/:mappingId"  element={<FieldMapperReview />} />
        <Route path="/staff/letter/generate/:mappingId" element={<GeneratedLetter />} />
        <Route path="/staff/letter/review/:ocrId" element={<StaffLetterReview />} />

        {/* User Routes */}
        <Route path="/user-home"          element={<UserHome />} />
        <Route path="/user/form"          element={<UserFormPage />} />
        <Route path="/user/form/:id"      element={<FormRenderer />} />
        <Route path="/user/data"          element={<UserDataPage />} />
        <Route path="/user/ocr"           element={<UserOcrPage />} />
        <Route path="/user/ocr-services"  element={<OcrSelectionPage />} />
        <Route path="/user/ocr-letter"    element={<UserOcrLetterPage />} />  {/* letter request */}
        <Route path="/letter/status/:ocrId" element={<UserLetterStatus />} />

        {/* TNB Station Map */}
        <Route path="/northern-tnb-station" element={<NorthenTNBStation />} />
      </Routes>
    </Router>
  );
}

export default App;