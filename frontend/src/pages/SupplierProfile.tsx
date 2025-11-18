import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MOCK_SUPPLIERS } from '../mocks/supplierData';
import ProfileHeader from '../components/Supplier/ProfileHeader';
import CertificationBadges from '../components/Supplier/CertificationBadges';
import SupplierProducts from '../components/Supplier/SupplierProducts';
import ContactModal from '../components/Supplier/ContactModal';

const SupplierProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const supplier = MOCK_SUPPLIERS.find(s => s.id === parseInt(id || ''));

  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!supplier) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold">Supplier not found</h1>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        {/* Header */}
        <ProfileHeader supplier={supplier} onContactClick={() => setIsModalOpen(true)} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (About & Certifications) */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About {supplier.name}</h2>
              <p className="text-gray-600 leading-relaxed">{supplier.description}</p>
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800">Specialties</h3>
                <p className="text-gray-600">{supplier.specialties.join(', ')}</p>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-800">Service Areas</h3>
                <p className="text-gray-600">{supplier.serviceAreas.join(', ')}</p>
              </div>
            </div>

            {/* Products Section */}
            <SupplierProducts products={supplier.products} supplierName={supplier.name} />
          </div>

          {/* Right Column (Certifications & Reviews) */}
          <div className="space-y-8">
            <CertificationBadges certifications={supplier.certifications} />

            {/* Reviews Placeholder */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Reviews</h2>
              <div className="text-center text-gray-500 py-8">
                <p className="font-semibold">Reviews coming soon!</p>
                <p className="text-sm mt-2">Average Rating: {supplier.stats.rating}/5 (mock)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        supplierName={supplier.name}
      />
    </div>
  );
};

export default SupplierProfile;
