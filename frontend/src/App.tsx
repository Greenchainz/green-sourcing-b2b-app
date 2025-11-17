// frontend/src/App.tsx
import './App.css';
import { Routes, Route, Outlet } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
 feat/admin-content-moderation
import ProtectedRoute from './components/ProtectedRoute';

main
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import { LandingPage } from './pages/LandingPage';
import BuyerDashboard from './pages/BuyerDashboard';
 feat/admin-content-moderation
import { SupplierDashboard } from './pages/SupplierDashboard';
import { NetworkBoard } from './pages/NetworkBoard';
import AdminDashboard from './pages/Admin';
import ContentModerationPage from './pages/Admin/ContentModerationPage';

 main
import { ArchitectSurvey } from './components/ArchitectSurvey';
import Features from './pages/Features';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Unauthorized from './pages/Unauthorized';
import RFQHistoryPage from './pages/RFQHistoryPage';
import Layout from './components/Layout';
import Charter175 from './pages/Charter175';
import SearchPage from './pages/SearchPage';
import SupplierDashboard from './pages/SupplierDashboard/index';
import ProductsPage from './pages/SupplierDashboard/ProductsPage';
import AddProductPage from './pages/SupplierDashboard/AddProductPage';
import EditProductPage from './pages/SupplierDashboard/EditProductPage';

// Placeholder components for other admin pages referenced in sidebar
const AdminUsers = () => <h1>User Management</h1>;
const AdminAnalytics = () => <h1>Analytics</h1>;

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout><LandingPage /></Layout>} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/features" element={<Layout><Features /></Layout>} />
        <Route path="/contact" element={<Layout><Contact /></Layout>} />
        <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
        <Route path="/terms" element={<Layout><Terms /></Layout>} />
        <Route path="/unauthorized" element={<Layout><Unauthorized /></Layout>} />
        <Route path="/architect-survey" element={<Layout><ArchitectSurvey /></Layout>} />
        <Route path="/charter175" element={<Layout><Charter175 /></Layout>} />
        
        {/* Search & Product Routes */}
        <Route path="/search" element={<Layout><SearchPage /></Layout>} />
        
        {/* Supplier Dashboard Routes */}
        <Route path="/dashboard/supplier" element={<SupplierDashboard />} />
        <Route path="/dashboard/supplier/products" element={<ProductsPage />} />
        <Route path="/dashboard/supplier/products/new" element={<AddProductPage />} />
        <Route path="/dashboard/supplier/products/:id/edit" element={<EditProductPage />} />
 feat/admin-content-moderation
 main

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
feat/admin-content-moderation
          </Route>
        </Route>

          </Route> */}
main
        
        {/* Buyer Dashboard */}
        <Route path="/dashboard/buyer" element={<BuyerDashboard />} />
        <Route path="/rfq-history" element={<RFQHistoryPage />} />
main
      </Routes>
    </ErrorBoundary>
  );
}

export default App;

