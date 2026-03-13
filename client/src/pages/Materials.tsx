import { useState, useEffect } from 'react';
import { Search, Filter, TrendingDown, Award } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  description: string;
  category: string;
  gwp: number;
  gwp_unit: string;
  epd_url: string;
  manufacturer: string;
  certifications: string[];
  product_count: number;
  created_at: string;
}

interface MaterialsResponse {
  success: boolean;
  data: Material[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
}

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and filter state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [certification, setCertification] = useState('');
  const [minGWP, setMinGWP] = useState('');
  const [maxGWP, setMaxGWP] = useState('');
  const [sortBy, setSortBy] = useState('gwp');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const limit = 20;

  // Fetch materials
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setLoading(true);
        setError('');
        
        const params = new URLSearchParams({
          search,
          category,
          certification,
          sortBy,
          sortOrder,
          limit: limit.toString(),
          offset: (page * limit).toString(),
        });

        if (minGWP) params.append('minGWP', minGWP);
        if (maxGWP) params.append('maxGWP', maxGWP);

        const response = await fetch(
          `/api/materials?${params}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: MaterialsResponse = await response.json();
        setMaterials(data.data);
        setTotalPages(data.pagination.pages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch materials');
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [search, category, certification, minGWP, maxGWP, sortBy, sortOrder, page]);

  const certificationColors: Record<string, string> = {
    'EPD': 'bg-blue-100 text-blue-800',
    'FSC': 'bg-green-100 text-green-800',
    'C2C': 'bg-purple-100 text-purple-800',
    'LEED': 'bg-teal-100 text-teal-800',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Material Catalog</h1>
          <p className="text-green-100 text-lg">
            Discover verified sustainable materials with verified EPD data and carbon scores
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Search and Filters */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-green-200/30 p-8 mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 text-green-600" size={20} />
              <input
                type="text"
                placeholder="Search materials..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-10 pr-4 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white/50"
              />
            </div>

            {/* Category */}
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(0);
              }}
              className="px-4 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white/50"
            >
              <option value="">All Categories</option>
              <option value="Concrete">Concrete</option>
              <option value="Steel">Steel</option>
              <option value="Wood">Wood</option>
              <option value="Insulation">Insulation</option>
              <option value="Flooring">Flooring</option>
              <option value="Roofing">Roofing</option>
            </select>

            {/* Certification */}
            <select
              value={certification}
              onChange={(e) => {
                setCertification(e.target.value);
                setPage(0);
              }}
              className="px-4 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white/50"
            >
              <option value="">All Certifications</option>
              <option value="EPD">EPD</option>
              <option value="FSC">FSC</option>
              <option value="C2C">Cradle to Cradle</option>
              <option value="LEED">LEED</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(0);
              }}
              className="px-4 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white/50"
            >
              <option value="gwp">Sort by Carbon (GWP)</option>
              <option value="name">Sort by Name</option>
              <option value="created_at">Sort by Newest</option>
            </select>
          </div>

          {/* GWP Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min GWP (kg CO₂e)
              </label>
              <input
                type="number"
                placeholder="0"
                value={minGWP}
                onChange={(e) => {
                  setMinGWP(e.target.value);
                  setPage(0);
                }}
                className="w-full px-4 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max GWP (kg CO₂e)
              </label>
              <input
                type="number"
                placeholder="1000"
                value={maxGWP}
                onChange={(e) => {
                  setMaxGWP(e.target.value);
                  setPage(0);
                }}
                className="w-full px-4 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white/50"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
            <p className="text-gray-600 mt-4">Loading materials...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Materials Grid */}
        {!loading && materials.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className="bg-white/70 backdrop-blur-xl rounded-xl border border-green-200/30 p-6 hover:shadow-xl hover:border-green-400/50 transition-all duration-300 hover:scale-105"
                >
                  {/* Header */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {material.name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {material.description}
                    </p>
                  </div>

                  {/* Manufacturer */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Manufacturer
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {material.manufacturer || 'Unknown'}
                    </p>
                  </div>

                  {/* GWP */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown size={16} className="text-green-600" />
                      <span className="text-xs font-semibold text-green-700 uppercase">
                        Carbon Score
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      {material.gwp.toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600">
                      {material.gwp_unit}
                    </p>
                  </div>

                  {/* Certifications */}
                  {material.certifications && material.certifications.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1 mb-2">
                        <Award size={14} className="text-amber-600" />
                        <span className="text-xs font-semibold text-gray-700">
                          Certifications
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {material.certifications.map((cert) => (
                          <span
                            key={cert}
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              certificationColors[cert] ||
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex justify-between items-center pt-4 border-t border-green-100">
                    <span className="text-xs text-gray-500">
                      {material.product_count} products
                    </span>
                    {material.epd_url && (
                      <a
                        href={material.epd_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-green-600 hover:text-green-700 transition-colors"
                      >
                        View EPD →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
                >
                  Previous
                </button>
                <span className="text-gray-700 font-medium">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page === totalPages - 1}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && materials.length === 0 && !error && (
          <div className="text-center py-12">
            <Filter size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 text-lg">
              No materials found matching your filters
            </p>
            <button
              onClick={() => {
                setSearch('');
                setCategory('');
                setCertification('');
                setMinGWP('');
                setMaxGWP('');
                setPage(0);
              }}
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
