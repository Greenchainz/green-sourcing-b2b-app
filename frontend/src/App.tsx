// frontend/src/App.tsx
import './App.css';
import { Routes, Route, Outlet } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import { LandingPage } from './pages/LandingPage';
import BuyerDashboard from './pages/BuyerDashboard';
import { SupplierDashboard } from './pages/SupplierDashboard';
import { NetworkBoard } from './pages/NetworkBoard';
import AdminDashboard from './pages/Admin';
import ContentModerationPage from './pages/Admin/ContentModerationPage';
import { ArchitectSurvey } from './components/ArchitectSurvey';
import Features from './pages/Features';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Unauthorized from './pages/Unauthorized';
// import ProductDetailPage from './pages/ProductDetailPage';
// import ProductsPage from './pages/ProductsPage';
// import Demo from './pages/Demo';
import Layout from './components/Layout';
import Charter175 from './pages/Charter175';

// Placeholder components for other admin pages referenced in sidebar
const AdminUsers = () => <h1>User Management</h1>;
const AdminAnalytics = () => <h1>Analytics</h1>;

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Public Routes */}
          <Route index element={<LandingPage />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route path="survey/architect" element={<ArchitectSurvey />} />
          <Route path="features" element={<Features />} />
          <Route path="contact" element={<Contact />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          {/* <Route path="demo" element={<Demo />} /> */}
          <Route path="unauthorized" element={<Unauthorized />} />
          {/* <Route path="product/:id" element={<ProductDetailPage />} /> */}
          {/* <Route path="products" element={<ProductsPage />} /> */}
          <Route path="badges/charter175" element={<Charter175 />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
            <Route
              path="dashboard"
              element={
                  <BuyerDashboard />
              }
            />
            <Route
              path="dashboard/supplier"
              element={
                <ProtectedRoute allowedRoles={['supplier']}>
                  <SupplierDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="network"
              element={
                <ProtectedRoute allowedRoles={['buyer', 'supplier']}>
                  <NetworkBoard />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/content"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ContentModerationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/analytics"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminAnalytics />
                </ProtectedRoute>
              }
            />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
