import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CreateProfilePage from './pages/CreateProfilePage';
import FirstTimeRecommendationsPage from './pages/FirstTimeRecommendationsPage';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import ScholarshipsPage from './pages/dashboard/ScholarshipsPage';
import RoadmapPage from './pages/dashboard/RoadmapPage';
import ApplicationsPage from './pages/dashboard/ApplicationsPage';
import ProfilePage from './pages/dashboard/ProfilePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/create-profile" element={<CreateProfilePage />} />
      <Route path="/first-time-recommendations" element={<FirstTimeRecommendationsPage />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
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