// frontend/src/components/Projects/AddProductsModal.tsx
import React, { useState } from 'react';
import { MOCK_PRODUCTS } from '../../mocks/productData';
import { useProjects } from '../../context/ProjectContext';

interface AddProductsModalProps {
  projectId: number;
  onClose: () => void;
}

const AddProductsModal: React.FC<AddProductsModalProps> = ({ projectId, onClose }) => {
  const { addProductToProject } = useProjects();
  const [searchTerm, setSearchTerm] = useState('');

  const availableProducts = MOCK_PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddProduct = (productId: number) => {
    addProductToProject(projectId, productId);
    alert('Product added!');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl h-3/4 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Add Products to Project</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
        </div>
        <input
          type="text"
          placeholder="Search for products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg mb-4"
        />
        <div className="flex-grow overflow-y-auto">
          {availableProducts.map(product => (
            <div key={product.id} className="flex items-center justify-between p-4 border-b">
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-gray-600">{product.supplier}</p>
              </div>
              <button
                onClick={() => handleAddProduct(product.id)}
                className="px-4 py-2 bg-primary text-white rounded-lg"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddProductsModal;
