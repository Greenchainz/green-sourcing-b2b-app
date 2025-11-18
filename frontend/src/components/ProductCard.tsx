// frontend/src/components/ProductCard.tsx
import React, { useState } from 'react';
import { Product } from '../mocks/productData'; // Using the mock data type for now
import { useProjects } from '../context/ProjectContext';
import CreateProjectModal from './Projects/CreateProjectModal';

type ProductCardProps = {
  product: Product;


  supplierName?: string; // Make optional
  onRequestQuote?: (productId: string) => void; // Make optional

};

const CertificationIcon: React.FC<{ name: string }> = ({ name }) => (
  <div className="bg-gray-200 text-gray-700 text-xs font-semibold mr-2 mb-2 px-2.5 py-0.5 rounded-full">
    {name}
  </div>
);


const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { name, imageUrl, supplier, certifications, epd, recycledContent } = product;
  const { projects, addProductToProject } = useProjects();

  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleAddToProject = (projectId: number) => {
    addProductToProject(projectId, product.id);
    setShowProjectMenu(false);
    // Maybe show a toast notification here in the future
    alert(`Product added to project!`);
  };

const ProductCard: React.FC<ProductCardProps> = ({ product, supplierName, onRequestQuote }) => {
  const {
    name,
    image_url,
    recycled_content, // Use top-level property
    certifications,
    epd_link
  } = product;

  // gwp_fossil does not exist on the Product type, so we'll remove it for now.
  const isVerified = !!epd_link;


  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden flex flex-col h-full">
        <div className="relative">
          <img
            className="w-full h-48 object-cover"
            src={imageUrl || 'https://via.placeholder.com/400x300.png?text=No+Image'}
            alt={name}
          />
        </div>
        <div className="p-4 flex-grow flex flex-col">
          <h3 className="text-sm text-gray-500 uppercase tracking-wide">{supplier}</h3>
          <h2 className="text-lg font-bold text-gray-800 truncate" title={name}>{name}</h2>

          <div className="mt-4 flex-grow">
            <p className="text-sm text-gray-600 font-semibold">Sustainability</p>
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              {recycledContent !== undefined && (
                <p><span className="font-bold">{recycledContent}%</span> Recycled Content</p>
              )}
              {epd?.gwp !== undefined && (
                <p><span className="font-bold">{epd.gwp}</span> kg CO₂e/unit (GWP)</p>
              )}
            </div>
          </div>


          <div className="mt-4">
            <p className="text-sm text-gray-600 font-semibold mb-2">Certifications</p>
            <div className="flex flex-wrap items-center">
              {certifications?.length ? (
                certifications.map(cert => <CertificationIcon key={cert} name={cert} />)
              ) : (
                <p className="text-xs text-gray-400">No certifications.</p>
              )}
            </div>

        <div className="mt-4 flex-grow">
          <p className="text-sm text-gray-600 font-semibold">Sustainability</p>
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            {recycled_content !== undefined && (
              <p>
                <span className="font-bold">{recycled_content}%</span> Recycled Content
              </p>
            )}

          </div>
        </div>
        <div className="p-4 pt-0 relative">
          <button
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            className="w-full px-4 py-2 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary/5"
          >
            + Add to Project
          </button>

          {showProjectMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
              <div className="p-4 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Add to project:</p>
              </div>

              <div className="max-h-48 overflow-y-auto">
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => handleAddToProject(project.id)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <span className="text-xl">📁</span>
                    <div>
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <p className="text-xs text-gray-500">{project.productIds.length} products</p>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setShowProjectMenu(false);
                  setShowCreateModal(true);
                }}
                className="w-full text-left px-4 py-3 border-t border-gray-200 hover:bg-gray-50 flex items-center gap-3 text-primary font-medium"
              >
                <span className="text-xl">+ </span>
                Create New Project
              </button>
            </div>
          )}
        </div>
      </div>


      {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} />}
    </>

      {onRequestQuote && (
        <div className="p-4 pt-0">
          <button
            onClick={() => onRequestQuote(product.id.toString())}
            className="w-full bg-green-700 text-white py-2 px-4 rounded-lg hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-opacity-50 transition-colors"
          >
            Request Quote
          </button>
        </div>
      )}
    </div>

  );
};

export default ProductCard;
