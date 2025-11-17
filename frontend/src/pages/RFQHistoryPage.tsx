// frontend/src/pages/RFQHistoryPage.tsx
import { useState } from 'react';
import type { RFQ } from '../types';

const mockRfqs: RFQ[] = [
  {
    id: 'rfq_001',
    product_name: 'EcoTherm Insulation',
    buyer: 'Jane Doe',
    company: 'GreenBuild Architects',
    quantity: 1000,
    deadline: '2025-12-15',
    status: 'Pending',
  },
  {
    id: 'rfq_002',
    product_name: 'Solar Panel XL',
    buyer: 'John Smith',
    company: 'Sustainable Homes Inc.',
    quantity: 50,
    deadline: '2025-11-30',
    status: 'Quoted',
  },
  {
    id: 'rfq_003',
    product_name: 'Recycled Steel Beams',
    buyer: 'Jane Doe',
    company: 'GreenBuild Architects',
    quantity: 200,
    deadline: '2025-10-20',
    status: 'Won',
  },
];

export default function RFQHistoryPage() {
  const [rfqs] = useState<RFQ[]>(mockRfqs);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My RFQ History</h1>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Sent</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rfqs.map(rfq => (
                <tr key={rfq.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rfq.product_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rfq.company}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(rfq.deadline).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      rfq.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      rfq.status === 'Quoted' ? 'bg-blue-100 text-blue-800' :
                      rfq.status === 'Won' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {rfq.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
