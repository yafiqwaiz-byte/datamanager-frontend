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
import UserOcrLetterPage from './pages/UserOcrLetterPage';
import OcrSelectionPage from './pages/OcrSelectionPage';
import StaffTemplateLetterUpload from './pages/StaffTemplateLetterUpload';
import FieldMapperReview from './pages/FieldMapperReview';
import GeneratedLetter from './pages/GeneratedLetter';
import StaffUploadPage from './pages/StaffUploadPage';
import AdminDashboard from './pages/AdminDashboard';
import StaffPOAging from './pages/StaffPOAging';
// import Dashboard from './pages/Dashboard';
// import UserDashboard from './pages/UserDashboard';
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
        
        {/* Auth Route */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword/>}/>
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/" element={<Navigate to="/signin" replace />} />

        {/* Staff Routes */}
        <Route path="/staff-home" element={<StaffHome />} />
        <Route path="/staff/templates" element ={<StaffTemplates/>} />
        <Route path="/staff/fetch-data" element ={<StaffFetchData/>}/>
        <Route path="/staff/upload" element ={<StaffUploadPage/>}/>

        {/* Staff Letter Routes */}
        <Route path="/staff/letter/upload-template" element={<StaffTemplateLetterUpload/>} />
        <Route path="/staff/letter/review/:mappingId" element={<FieldMapperReview />} />
        <Route path="/staff/letter/generate/:mappingId" element={<GeneratedLetter />} />
        <Route path="/staff/po-aging" element={<StaffPOAging/>} />
        

        {/* User Routes */}
        <Route path="/user-home" element={<UserHome />} />
        <Route path="/user/form" element={<UserFormPage />} />
        <Route path="/user/form/:id" element={<FormRenderer/>} />
        <Route path="/user/data" element={<UserDataPage />} />
        <Route path="/user/ocr" element={<UserOcrPage/>}/>
        <Route path="/user/ocr-letter" element={<UserOcrLetterPage/>}/>
        <Route path="/user/ocr-services" element={<OcrSelectionPage/>}/>

        {/* TNB Station Map Route */}
         <Route path="/northern-tnb-station" element={<NorthenTNBStation />} />

        {/* Add your other routes here */}
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}
        {/* <Route path="/user-dashboard" element={<UserDashboard />} /> */}
        
      </Routes>
    </Router>
  );
}

export default App;
