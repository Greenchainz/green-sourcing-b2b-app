import './App.css'
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
 feature/product-detail-page
import ProductDetailPage from './pages/ProductDetailPage';

 feature/search-bar
import Demo from './pages/Demo';
import Layout from './components/Layout';
 main

function App() {
  return (
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
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/survey/architect" element={<ArchitectSurvey />} />
      <Route path="/features" element={<Features />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
feature/product-detail-page
      <Route path="/product/:id" element={<ProductDetailPage />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>

         route path="/products" element={<ProductsPage />} />

      {/* Protected Routes */}
feature/product-card-component
      <Route element={<ProtectedRoute />}>

      <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
 main
main
        <Route path="/dashboard/architect" element={<ArchitectDashboard />} />
        <Route path="/dashboard/supplier" element={<SupplierDashboard />} />
        <Route path="/network" element={<NetworkBoard />} />
        <Route path="/admin" element={<AdminConsole />} />
main
      </Route>
    </Routes>
    </ErrorBoundary>
  );
}

export default App
