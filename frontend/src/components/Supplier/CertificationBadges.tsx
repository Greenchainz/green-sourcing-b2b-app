import React from 'react';
import { Certification } from '../../mocks/supplierData';

interface CertificationBadgesProps {
  certifications: Certification[];
}

const CertificationBadges: React.FC<CertificationBadgesProps> = ({ certifications }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Certifications</h2>
      <div className="flex flex-wrap gap-4">
        {certifications.map((cert) => (
          <div key={cert.name} className="relative group">
            <div className="bg-gray-100 text-gray-800 text-sm font-semibold px-3 py-1 rounded-full border border-gray-300 cursor-pointer">
              {cert.name}
            </div>
            <div className="absolute hidden group-hover:block bg-gray-900 text-white text-sm p-3 rounded-lg -top-24 left-0 w-64 z-10 shadow-lg">
              <p className="font-bold">{cert.name} ({cert.year})</p>
              <p className="text-xs mt-1">{cert.description}</p>
              <div className="flex items-center mt-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-green-400 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs">Verified</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CertificationBadges;
