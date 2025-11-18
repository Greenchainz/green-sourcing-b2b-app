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

import ProductDetailPage from './pages/ProductDetailPage';
import SupplierProfilePage from './pages/SupplierProfilePage';

import SupplierProfile from './pages/SupplierProfile';

import SupplierDashboard from './pages/SupplierDashboard/index';
import ProductsPage from './pages/SupplierDashboard/ProductsPage';
import AddProductPage from './pages/SupplierDashboard/AddProductPage';
import EditProductPage from './pages/SupplierDashboard/EditProductPage';
import AdminDashboard from './pages/Admin';
import ContentModerationPage from './pages/Admin/ContentModerationPage';
import { ProjectProvider } from './context/ProjectContext';
import Projects from './pages/BuyerDashboard/Projects';
import ProjectDetail from './pages/BuyerDashboard/ProjectDetail';

function App() {
  return (
    <ErrorBoundary>

      <ProjectProvider>
        <Routes>

          <Route path="/" element={<Layout />}>
          {/* Public Routes */}

      <Routes>

        {/* Routes with the main Layout (Header, Footer, etc.) */}


        <Route path="/" element={<Layout />}>

          <Route index element={<LandingPage />} />
          <Route path="features" element={<Features />} />
          <Route path="contact" element={<Contact />} />
          <Route path="privacy-policy" element={<Privacy />} />
          <Route path="terms-of-service" element={<Terms />} />
          <Route path="supplier-agreement" element={<SupplierAgreement />} />
          <Route path="unauthorized" element={<Unauthorized />} />

          <Route path="survey/architect" element={<ArchitectSurvey />} />
          <Route path="badges/charter175" element={<Charter175 />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="product/:id" element={<ProductDetailPage />} />
          <Route path="supplier/:id" element={<SupplierProfilePage />} />
        </Route>

        {/* Standalone Routes (no main Layout) */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

          <Route path="badges/charter175" element={<Charter175 />} />
          <Route path="search" element={<Search
        
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
        <Route path="/suppliers/:id" element={<Layout><SupplierProfile /></Layout>} />


        {/* Supplier Dashboard Routes */}
        <Route path="/dashboard/supplier" element={<SupplierDashboard />} />
        <Route path="/dashboard/supplier/products" element={<ProductsPage />} />
        <Route path="/dashboard/supplier/products/new" element={<AddProductPage />} />
        <Route path="/dashboard/supplier/products/:id/edit" element={<EditProductPage />} />
        
        {/* Buyer Dashboard */}
        <Route path="/dashboard/buyer" element={<BuyerDashboard />} />
        <Route path="/dashboard/buyer/projects" element={<Layout><Projects /></Layout>} />
        <Route path="/dashboard/buyer/projects/:projectId" element={<Layout><ProjectDetail /></Layout>} />
        <Route path="/rfq-history" element={<RFQHistoryPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/content" element={<ContentModerationPage />} />

 
        </Routes>
      {/* </ProjectProvider> */}

      </Routes>

    </ErrorBoundary>
  );
}

export default App;
