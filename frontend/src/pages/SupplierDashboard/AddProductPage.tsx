import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/SupplierDashboard/Sidebar';

const MATERIAL_TYPES = ['Insulation', 'Flooring', 'Roofing', 'Lumber', 'Concrete', 'Paint & Coatings'];
const APPLICATIONS = ['Residential', 'Commercial', 'Both'];
const CERTIFICATION_OPTIONS = [
  'LEED', 'FSC', 'B Corp', 'Cradle to Cradle', 'Green Seal',
  'Energy Star', 'EPEAT', 'BREEAM', 'Living Building Challenge', 'Declare Label'
];

export default function AddProductPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    materialType: '',
    application: [],
    recycledContent: 0,
    vocLevel: '',
    certifications: [],
    technicalSpecs: '',
    imageUrl: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Phase 1: Submit to Supabase
    console.log('Product submitted:', formData);
    alert('Product added successfully! (MVP placeholder)');
    navigate('/dashboard/supplier/products');
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Add New Product</h1>

        <form onSubmit={handleSubmit} className="max-w-3xl bg-background border border-border rounded-lg p-8 space-y-6">

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Product Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Warmcel Cellulose Insulation"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Description *</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Describe your product, its benefits, and ideal use cases..."
            />
          </div>

          {/* Material Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Material Type *</label>
            <select
              required
              value={formData.materialType}
              onChange={(e) => setFormData({...formData, materialType: e.target.value})}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select material type</option>
              {MATERIAL_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Application */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">Application *</label>
            <div className="space-y-2">
              {APPLICATIONS.map(app => (
                <label key={app} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    value={app}
                    onChange={(e) => {
                      const newApplications = e.target.checked
                        ? [...formData.application, app]
                        : formData.application.filter(a => a !== app);
                      setFormData({ ...formData, application: newApplications });
                    }}
                    className="w-4 h-4 text-primary border-border rounded"
                  />
                  <span className="text-sm text-foreground">{app}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Recycled Content */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Recycled Content (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.recycledContent}
              onChange={(e) => setFormData({...formData, recycledContent: parseInt(e.target.value)})}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* VOC Level */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">VOC Level</label>
            <select
              value={formData.vocLevel}
              onChange={(e) => setFormData({...formData, vocLevel: e.target.value})}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select VOC level</option>
              <option value="Zero">Zero</option>
              <option value="Low">Low</option>
              <option value="Standard">Standard</option>
            </select>
          </div>

          {/* Certifications */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">Certifications</label>
            <div className="grid grid-cols-2 gap-2">
              {CERTIFICATION_OPTIONS.map(cert => (
                <label key={cert} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    value={cert}
                    onChange={(e) => {
                      const newCertifications = e.target.checked
                        ? [...formData.certifications, cert]
                        : formData.certifications.filter(c => c !== cert);
                      setFormData({ ...formData, certifications: newCertifications });
                    }}
                    className="w-4 h-4 text-primary border-border rounded"
                  />
                  <span className="text-sm text-foreground">{cert}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Technical Specs */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Technical Specifications</label>
            <textarea
              value={formData.technicalSpecs}
              onChange={(e) => setFormData({...formData, technicalSpecs: e.target.value})}
              rows={6}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="R-Value: 3.7&#10;Fire Rating: Class A&#10;Density: 3.5 lb/ft³"
            />
          </div>

          {/* Image URL (Placeholder for MVP) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Product Image URL</label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://example.com/product-image.jpg"
            />
            <p className="text-sm text-muted-foreground mt-1">Enter a URL to an existing image (file uploads coming in Phase 1)</p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
            >
              Publish Product
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/supplier/products')}
              className="px-6 py-3 border-2 border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>

        </form>

      </main>
    </div>
  );
}
