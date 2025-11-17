// frontend/src/App.tsx
import './App.css';
import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import { LandingPage } from './pages/LandingPage';
import BuyerDashboard from './pages/BuyerDashboard';
import { ArchitectSurvey } from './components/ArchitectSurvey';
import Features from './pages/Features';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import SupplierAgreement from './pages/SupplierAgreement';
import Unauthorized from './pages/Unauthorized';
import RFQHistoryPage from './pages/RFQHistoryPage';
import Layout from './components/Layout';
import Charter175 from './pages/Charter175';
import SearchPage from './pages/SearchPage';
import SupplierDashboard from './pages/SupplierDashboard/index';
import ProductsPage from './pages/SupplierDashboard/ProductsPage';
import AddProductPage from './pages/SupplierDashboard/AddProductPage';
import EditProductPage from './pages/SupplierDashboard/EditProductPage';
import AdminDashboard from './pages/Admin';
import ContentModerationPage from './pages/Admin/ContentModerationPage';

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
          <Route path="privacy-policy" element={<Privacy />} />
          <Route path="terms-of-service" element={<Terms />} />
          <Route path="supplier-agreement" element={<SupplierAgreement />} />
          {/* <Route path="demo" element={<Demo />} /> */}
          <Route path="unauthorized" element={<Unauthorized />} />
          {/* <Route path="product/:id" element={<ProductDetailPage />} /> */}
          {/* <Route path="products" element={<ProductsPage />} /> */}
          <Route path="badges/charter175" element={<Charter175 />} />

          {/* Protected Routes - Temporarily disabled until demo pages are fixed */}
          {/* <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}> */}
            <Route
              path="dashboard"
              element={
                  <BuyerDashboard />
              }
            />
            {/* <Route
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
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminConsole />
                </ProtectedRoute>
              }
            />
          </Route> */}
        </Route>

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
        
        {/* Buyer Dashboard */}
        <Route path="/dashboard/buyer" element={<BuyerDashboard />} />
        <Route path="/rfq-history" element={<RFQHistoryPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/content" element={<ContentModerationPage />} />
 
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
