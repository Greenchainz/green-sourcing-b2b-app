// frontend/src/App.tsx
import './App.css';
import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
// import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import { LandingPage } from './pages/LandingPage';
import BuyerDashboard from './pages/BuyerDashboard';
// import { SupplierDashboard } from './pages/SupplierDashboard';
// import { NetworkBoard } from './pages/NetworkBoard';
// import { AdminConsole } from './pages/AdminConsole';
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
import SupplierDashboard from './pages/SupplierDashboard/index';
import ProductsPage from './pages/SupplierDashboard/ProductsPage';
import AddProductPage from './pages/SupplierDashboard/AddProductPage';
import EditProductPage from './pages/SupplierDashboard/EditProductPage';

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
        </Route>

        {/* Supplier Dashboard Routes */}
        <Route path="/dashboard/supplier" element={<SupplierDashboard />} />
        <Route path="/dashboard/supplier/products" element={<ProductsPage />} />
        <Route path="/dashboard/supplier/products/new" element={<AddProductPage />} />
        <Route path="/dashboard/supplier/products/:id/edit" element={<EditProductPage />} />

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
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
