import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './context/AppContext';
import LandingPage from './pages/LandingPage';
import CreateProfilePage from './pages/CreateProfilePage';
import FirstTimePage from './pages/FirstTimePage';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import ScholarshipsPage from './pages/dashboard/ScholarshipsPage';
import RoadmapPage from './pages/dashboard/RoadmapPage';
import ApplicationsPage from './pages/dashboard/ApplicationsPage';
import ProfilePage from './pages/dashboard/ProfilePage';

function ProtectedRoute({ children }) {
  const { state } = useApp();
  if (!state.isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/create-profile" element={<CreateProfilePage />} />
      <Route path="/first-time" element={<ProtectedRoute><FirstTimePage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<DashboardHome />} />
        <Route path="scholarships" element={<ScholarshipsPage />} />
        <Route path="roadmap" element={<RoadmapPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;