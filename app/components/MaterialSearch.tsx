"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  X,
  CheckCircle,
  MapPin,
  Info,
} from "lucide-react";

interface Material {
  id: number;
  assembly_code: string;
  assembly_name: string;
  material_type: string;
  manufacturer: string;
  product_name: string;
  epd_number: string | null;
  gwp: number;
  gwp_units: string;
  dimension: string;
  embodied_carbon_per_1000sf: number;
  is_verified: boolean;
  notes: string;
  distance_miles?: number;
}

interface SearchFilters {
  query: string;
  manufacturer: string;
  assemblyCode: string;
  materialType: string;
  maxGWP: string;
  hasEPD: boolean;
  isVerified: boolean;
}

interface ManufacturerItem {
  manufacturer: string;
}

interface AssemblyItem {
  assembly_code: string;
  assembly_name: string;
}

export default function MaterialSearch() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [assemblies, setAssemblies] = useState<AssemblyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    manufacturer: "",
    assemblyCode: "",
    materialType: "",
    maxGWP: "",
    hasEPD: false,
    isVerified: false,
  });

  // Fetch manufacturers and assemblies on mount
  useEffect(() => {
    fetchMetadata();
  }, []);

  // Search when filters change
  useEffect(() => {
    const debounce = setTimeout(() => {
      searchMaterials();
    }, 500);

    return () => clearTimeout(debounce);
  }, [filters, pagination.page]);

  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem("token");

      const [mfgResponse, asmResponse] = await Promise.all([
        fetch("/api/v1/materials/meta/manufacturers", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/v1/materials/meta/assemblies", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const mfgData = await mfgResponse.json();
      const asmData = await asmResponse.json();

      if (mfgData.success) {
        setManufacturers(
          mfgData.data.manufacturers.map(
            (m: ManufacturerItem) => m.manufacturer
          )
        );
      }

      if (asmData.success) {
        setAssemblies(asmData.data.assemblies);
      }
    } catch (error) {
      console.error("Failed to fetch metadata:", error);
    }
  };

  const searchMaterials = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.query) params.append("query", filters.query);
      if (filters.manufacturer)
        params.append("manufacturer", filters.manufacturer);
      if (filters.assemblyCode)
        params.append("assemblyCode", filters.assemblyCode);
      if (filters.materialType)
        params.append("materialType", filters.materialType);
      if (filters.maxGWP) params.append("maxGWP", filters.maxGWP);
      if (filters.hasEPD) params.append("hasEPD", "true");
      if (filters.isVerified) params.append("isVerified", "true");

      const response = await fetch(`/api/v1/materials/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        setMaterials(data.data.materials);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      manufacturer: "",
      assemblyCode: "",
      materialType: "",
      maxGWP: "",
      hasEPD: false,
      isVerified: false,
    });
  };

  const getGWPBadgeColor = (gwp: number) => {
    if (gwp < 50) return "bg-green-100 text-green-800 border-green-300";
    if (gwp < 100) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const getGWPLabel = (gwp: number) => {
    if (gwp < 50) return "Low Carbon Impact";
    if (gwp < 100) return "Medium Carbon Impact";
    return "High Carbon Impact";
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Sustainable Material Search
        </h1>
        <p className="text-gray-600">
          Search verified sustainable building materials with EPD data
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <label htmlFor="material-search" className="sr-only">
              Search materials
            </label>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"
              aria-hidden="true"
            />
            <input
              id="material-search"
              type="text"
              placeholder="Search materials, manufacturers, or products..."
              value={filters.query}
              onChange={(e) =>
                setFilters({ ...filters, query: e.target.value })
              }
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            aria-expanded={showFilters}
            aria-controls="filters-panel"
          >
            <Filter className="w-5 h-5" aria-hidden="true" />
            Filters
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div
            id="filters-panel"
            className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div>
              <label
                htmlFor="manufacturer-filter"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Manufacturer
              </label>
              <select
                id="manufacturer-filter"
                value={filters.manufacturer}
                onChange={(e) =>
                  setFilters({ ...filters, manufacturer: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Manufacturers</option>
                {manufacturers.map((mfg) => (
                  <option key={mfg} value={mfg}>
                    {mfg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="assembly-filter"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Assembly Type
              </label>
              <select
                id="assembly-filter"
                value={filters.assemblyCode}
                onChange={(e) =>
                  setFilters({ ...filters, assemblyCode: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Assemblies</option>
                {assemblies.map((asm) => (
                  <option key={asm.assembly_code} value={asm.assembly_code}>
                    {asm.assembly_code} - {asm.assembly_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label
                  htmlFor="gwp-filter"
                  className="block text-sm font-medium text-gray-700"
                >
                  Max Carbon (GWP)
                </label>
                <div className="group relative flex items-center">
                  <Info className="w-4 h-4 text-gray-400 cursor-help" aria-hidden="true" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-gray-900 text-white text-xs p-2 rounded z-10 text-center shadow-lg">
                    Global Warming Potential (kg CO₂e). Lower values indicate smaller carbon footprint.
                  </div>
                </div>
              </div>
              <input
                id="gwp-filter"
                type="number"
                placeholder="e.g. 100"
                value={filters.maxGWP}
                onChange={(e) =>
                  setFilters({ ...filters, maxGWP: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.hasEPD}
                    onChange={(e) =>
                      setFilters({ ...filters, hasEPD: e.target.checked })
                    }
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Has EPD</span>
                </label>
                <div className="group relative flex items-center">
                  <Info className="w-4 h-4 text-gray-400 cursor-help" aria-hidden="true" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-gray-900 text-white text-xs p-2 rounded z-10 text-center shadow-lg">
                    Environmental Product Declaration. Verified document reporting environmental data.
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.isVerified}
                  onChange={(e) =>
                    setFilters({ ...filters, isVerified: e.target.checked })
                  }
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Verified Only</span>
              </label>

              <button
                onClick={clearFilters}
                className="ml-auto text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <X className="w-4 h-4" aria-hidden="true" />
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600" aria-live="polite">
        {loading ? "Searching..." : `Found ${pagination.total} materials`}
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">
            No materials found. Try adjusting your filters.
          </p>
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium"
            aria-label="Clear all filters and search query"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials.map((material) => (
              <div
                key={material.id}
                className="bg-white rounded-lg border border-gray-200 hover:border-green-500 hover:shadow-lg transition p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {material.product_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {material.manufacturer}
                    </p>
                    {material.distance_miles && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <MapPin className="w-3 h-3" aria-hidden="true" />
                        {material.distance_miles} miles away
                      </div>
                    )}
                  </div>
                  {material.is_verified && (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" aria-label="Verified Material" />
                  )}
                </div>

                {/* Material Type */}
                {material.material_type && (
                  <div className="text-sm text-gray-600 mb-3">
                    {material.material_type}
                  </div>
                )}

                {/* GWP Badge */}
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border mb-4 cursor-help ${getGWPBadgeColor(material.gwp)}`}
                  aria-label={`GWP: ${material.gwp} ${material.gwp_units} - ${getGWPLabel(material.gwp)}`}
                  title={getGWPLabel(material.gwp)}
                >
                  {material.gwp} {material.gwp_units}
                </div>

                {/* EPD */}
                {material.epd_number && (
                  <div className="text-xs text-gray-500 mb-4">
                    EPD: {material.epd_number}
                  </div>
                )}

                {/* Assembly */}
                {material.assembly_code && (
                  <div className="text-xs text-gray-500 mb-4">
                    {material.assembly_code}: {material.assembly_name}
                  </div>
                )}

                {/* Actions */}
                <button
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition font-medium"
                  aria-label={`Request Quote for ${material.product_name}`}
                >
                  Request Quote
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <button
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page - 1 })
                }
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page + 1 })
                }
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
