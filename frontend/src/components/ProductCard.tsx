// frontend/src/components/ProductCard.tsx
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden group transition-shadow hover:shadow-lg">
      <div className="relative">
        <img
          src={product.image_url || 'https://via.placeholder.com/300'}
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Verified
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 truncate" title={product.name}>
          {product.name}
        </h3>
        <p className="text-sm text-gray-600 mb-2">by Supplier Name</p>

        {/* Sustainability Badges */}
        <div className="flex flex-wrap gap-1 my-2">
          {product.sustainability_data.certifications?.map((cert) => (
            <span
              key={cert}
              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
            >
              {cert}
            </span>
          ))}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-lg font-bold text-gray-900">$TBD</p>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                Request Quote
            </button>
        </div>
      </div>
    </div>
  );
}
