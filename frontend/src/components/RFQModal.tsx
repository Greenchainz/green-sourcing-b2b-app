// src/components/RFQModal.tsx
import { useState, useEffect, useRef } from 'react';
import type { RFQData } from '../types';

interface RFQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rfqData: RFQData) => void;
  productName: string;
}

export default function RFQModal({ isOpen, onClose, onSubmit, productName }: RFQModalProps) {
  const [formData, setFormData] = useState<RFQData>({
    buyer_email: '',
    project_name: '',
    message: '',
    quantity: undefined,
    timeline: '1-3 months',
    contact_preference: 'email',
  });

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Quote for {productName}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="buyer_email" className="block text-sm font-medium text-gray-700">Buyer Email</label>
            <input
              type="email"
              name="buyer_email"
              id="buyer_email"
              value={formData.buyer_email}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="project_name" className="block text-sm font-medium text-gray-700">Project Name</label>
            <input
              type="text"
              name="project_name"
              id="project_name"
              value={formData.project_name}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">Project Details / Message</label>
            <textarea
              name="message"
              id="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={4}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
            ></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity Needed</label>
              <input
                type="number"
                name="quantity"
                id="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="timeline" className="block text-sm font-medium text-gray-700">Timeline</label>
              <select
                name="timeline"
                id="timeline"
                value={formData.timeline}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              >
                <option>ASAP</option>
                <option>1-3 months</option>
                <option>3-6 months</option>
                <option>6+ months</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Contact Preference</label>
            <div className="mt-2 flex gap-4">
              <label className="inline-flex items-center">
                <input type="radio" name="contact_preference" value="email" checked={formData.contact_preference === 'email'} onChange={handleChange} className="form-radio" />
                <span className="ml-2">Email</span>
              </label>
              <label className="inline-flex items-center">
                <input type="radio" name="contact_preference" value="phone" checked={formData.contact_preference === 'phone'} onChange={handleChange} className="form-radio" />
                <span className="ml-2">Phone</span>
              </label>
              <label className="inline-flex items-center">
                <input type="radio" name="contact_preference" value="text" checked={formData.contact_preference === 'text'} onChange={handleChange} className="form-radio" />
                <span className="ml-2">Text</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Submit Request</button>
          </div>
        </form>
      </div>
    </div>
  );
}
