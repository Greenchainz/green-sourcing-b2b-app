import React from 'react';
import { Supplier } from '../../mocks/supplierData';

interface ProfileHeaderProps {
  supplier: Supplier;
  onContactClick: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ supplier, onContactClick }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col md:flex-row items-center">
        {/* Logo */}
        <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
          <img
            src={supplier.logo}
            alt={`${supplier.name} logo`}
            className="w-32 h-32 rounded-full object-cover border-4 border-gray-100"
          />
        </div>

        {/* Supplier Info */}
        <div className="flex-grow text-center md:text-left">
          <h1 className="text-4xl font-bold text-gray-900">{supplier.name}</h1>
          <div className="text-gray-600 mt-2 space-y-1 md:space-y-0 md:flex md:space-x-4">
            <span>{supplier.location}</span>
            <span className="hidden md:inline">|</span>
            <span>Established: {supplier.established}</span>
            <span className="hidden md:inline">|</span>
            <a
              href={supplier.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Visit Website
            </a>
          </div>
        </div>

        {/* Contact Button */}
        <div className="mt-4 md:mt-0 md:ml-6">
          <button
            onClick={onContactClick}
            className="w-full md:w-auto bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-300"
          >
            Contact Supplier
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
