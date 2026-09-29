import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { Dashboard } from './pages/Dashboard';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Reminders } from './pages/Reminders';
import { Calls } from './pages/Calls';
import { Chat } from './pages/Chat';
import { Profile } from './pages/Profile';
import { Appointments } from './pages/Appointments';
import { CallJoin } from './pages/CallJoin';
import { CaregiverConnect } from './pages/CaregiverConnect';
import { IncomingCallModal } from './components/calling/IncomingCallModal';
import { HospitalReceptionDesk } from './pages/HospitalReceptionDesk';
import { AuthProvider } from './context/AuthContext';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* WhatsApp-style Incoming Call Ringing Overlay */}
        <IncomingCallModal />

        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Public WebRTC Call Join (Zero Auth Required for Caregivers) */}
          <Route path="/call/join/:callId" element={<CallJoin />} />

          {/* WhatsApp-Style Caregiver One-Click Pairing & Notification Connect */}
          <Route path="/caregiver/connect/:contactId" element={<CaregiverConnect />} />

          {/* Hospital Reception Desk Receiver Terminal (Receiver Phone Endpoint) */}
          <Route path="/clinic-desk" element={<HospitalReceptionDesk />} />
          <Route path="/reception-desk" element={<HospitalReceptionDesk />} />

          {/* Main Shell Layout */}
          <Route element={<Shell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/calls" element={<Calls />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
          </Route>



          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
