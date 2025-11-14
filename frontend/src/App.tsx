import './App.css';
import { Routes, Route, Outlet } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
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
 feat/supplier-dashboard
import FilterSidebar, { FilterState } from './components/FilterSidebar';
import { useState } from 'react';

feat/rfq-protected-routes
import Unauthorized from './pages/Unauthorized';

 feat/filter-sidebar
import FilterSidebar, { FilterState } from './components/FilterSidebar';
import { useState } from 'react';

 feature/product-detail-page
import ProductDetailPage from './pages/ProductDetailPage';

 feature/search-bar
import Demo from './pages/Demo';
import Layout from './components/Layout';
 main
 main
main
 main

function App() {
  const [filterState, setFilterState] = useState<FilterState | null>(null);

  return (
    <Routes>
 feat/filter-sidebar
      {/* Public Routes */}
      <Route
        path="/filter-demo"
        element={
          <div style={{ display: 'flex' }}>
            <FilterSidebar onFilterChange={setFilterState} />
            <pre>{JSON.stringify(filterState, null, 2)}</pre>
          </div>
        }
      />
      <Route path="/" element={<LandingPage />} />

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
        <Route path="demo" element={<Demo />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
          <Route path="dashboard/architect" element={<ArchitectDashboard />} />
          <Route path="dashboard/supplier" element={<SupplierDashboard />} />
          <Route path="network" element={<NetworkBoard />} />
          <Route path="admin" element={<AdminConsole />} />
        </Route>

import ProductsPage from './pages/ProductsPage';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
 main
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/survey/architect" element={<ArchitectSurvey />} />
      <Route path="/features" element={<Features />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
 feat/rfq-protected-routes
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected Routes */}
 feat/supplier-dashboard
      <Route element={<ProtectedRoute />}>

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

feature/product-detail-page
      <Route path="/product/:id" element={<ProductDetailPage />} />

      {/* Protected Routes */}
feat/filter-sidebar
      <Route element={<ProtectedRoute />}>

      <Route element={<ProtectedRoute />}>

         route path="/products" element={<ProductsPage />} />

      {/* Protected Routes */}
feature/product-card-component
      <Route element={<ProtectedRoute />}>

      <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
 main
main
 main
 main
        <Route path="/dashboard/architect" element={<ArchitectDashboard />} />
        <Route path="/dashboard/supplier" element={<SupplierDashboard />} />
        <Route path="/network" element={<NetworkBoard />} />
        <Route path="/admin" element={<AdminConsole />} />
main
      </Route>
 main
    </Routes>
    </ErrorBoundary>
  );
}

feat/supplier-dashboard
export default App

 feat/rfq-protected-routes
export default App;

export default App
 main
 main
