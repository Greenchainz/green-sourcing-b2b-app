import './App.css';
import { Routes, Route, Outlet } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import { LandingPage } from './pages/LandingPage';
import { ArchitectDashboard } from './pages/ArchitectDashboard';
import { SupplierDashboard } from './pages/SupplierDashboard';
import { NetworkBoard } from './pages/NetworkBoard';
import { AdminConsole } from './pages/AdminConsole';
import { ArchitectSurvey } from './components/ArchitectSurvey';
import Features from './pages/Features';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Unauthorized from './pages/Unauthorized';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/survey/architect" element={<ArchitectSurvey />} />
      <Route path="/features" element={<Features />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard/architect"
        element={
          <ProtectedRoute allowedRoles={['buyer']}>
            <ArchitectDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/supplier"
        element={
          <ProtectedRoute allowedRoles={['supplier']}>
            <SupplierDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/network"
        element={
          <ProtectedRoute allowedRoles={['buyer', 'supplier']}>
            <NetworkBoard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminConsole />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
