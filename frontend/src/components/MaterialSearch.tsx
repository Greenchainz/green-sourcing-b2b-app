"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { debounce } from "../lib/utils";

// Types
interface Material {
  id: string;
  name: string;
  manufacturer: string;
  assemblyType: string;
  gwp: number; // Global Warming Potential (kg CO2e)
  epdNumber?: string;
  category: string;
  certifications: string[];
  imageUrl?: string;
}

interface SearchFilters {
  manufacturer: string;
  assemblyType: string;
  maxGwp: number | null;
}

interface MaterialSearchProps {
  className?: string;
  onMaterialSelect?: (material: Material) => void;
}

// GWP Badge Component
const GWPBadge = ({ gwp }: { gwp: number }) => {
  const getGwpColor = () => {
    if (gwp < 50) return "gwp-badge-green";
    if (gwp <= 100) return "gwp-badge-yellow";
    return "gwp-badge-red";
  };

  return (
    <span className={`gwp-badge ${getGwpColor()}`}>
      {gwp.toFixed(1)} kg CO₂e
    </span>
  );
};

// Material Card Component
const MaterialCard = ({
  material,
  onRequestQuote,
}: {
  material: Material;
  onRequestQuote: (material: Material) => void;
}) => {
  return (
    <div className="material-card">
      {/* Image placeholder */}
      <div className="material-card-image">
        {material.imageUrl ? (
          <img src={material.imageUrl} alt={material.name} />
        ) : (
          <div className="material-card-image-placeholder">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="material-card-content">
        <div className="material-card-header">
          <h3 className="material-card-title">{material.name}</h3>
          <GWPBadge gwp={material.gwp} />
        </div>

        <p className="material-card-manufacturer">{material.manufacturer}</p>

        <div className="material-card-meta">
          <span className="material-card-category">{material.category}</span>
          {material.epdNumber && (
            <span className="material-card-epd">EPD: {material.epdNumber}</span>
          )}
        </div>

        {/* Certifications */}
        {material.certifications.length > 0 && (
          <div className="material-card-certifications">
            {material.certifications.slice(0, 3).map((cert) => (
              <span key={cert} className="certification-badge">
                {cert}
              </span>
            ))}
            {material.certifications.length > 3 && (
              <span className="certification-badge certification-badge-more">
                +{material.certifications.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="material-card-actions">
          <button
            onClick={() => onRequestQuote(material)}
            className="btn-request-quote"
          >
            Request Quote
          </button>
        </div>
      </div>
    </div>
  );
};

// Loading Skeleton
const MaterialCardSkeleton = () => (
  <div className="material-card skeleton">
    <div className="material-card-image skeleton-shimmer" />
    <div className="material-card-content">
      <div className="skeleton-line skeleton-line-title" />
      <div className="skeleton-line skeleton-line-short" />
      <div className="skeleton-line skeleton-line-medium" />
      <div className="skeleton-line skeleton-line-button" />
    </div>
  </div>
);

// Empty State
const EmptyState = ({ searchQuery }: { searchQuery: string }) => (
  <div className="empty-state">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="empty-state-icon"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
    <h3>No materials found</h3>
    <p>
      {searchQuery
        ? `No results for "${searchQuery}". Try adjusting your filters.`
        : "Start typing to search for materials."}
    </p>
  </div>
);

// Main Component
export default function MaterialSearch({
  className = "",
  onMaterialSelect,
}: MaterialSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    manufacturer: "",
    assemblyType: "",
    maxGwp: null,
  });
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter options (would come from API in production)
  const manufacturers = useMemo(
    () => [
      "All Manufacturers",
      "EcoTimber Inc.",
      "GreenConcrete Co.",
      "SustainaSteel",
      "RecycleMat Industries",
      "BioBuilders",
    ],
    []
  );

  const assemblyTypes = useMemo(
    () => [
      "All Types",
      "Flooring",
      "Wall Systems",
      "Roofing",
      "Structural",
      "Insulation",
      "Finishes",
    ],
    []
  );

  // Fetch materials from API
  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (
        filters.manufacturer &&
        filters.manufacturer !== "All Manufacturers"
      ) {
        params.append("manufacturer", filters.manufacturer);
      }
      if (filters.assemblyType && filters.assemblyType !== "All Types") {
        params.append("assemblyType", filters.assemblyType);
      }
      if (filters.maxGwp !== null) {
        params.append("maxGwp", filters.maxGwp.toString());
      }

      const response = await fetch(`/api/v1/materials/search?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch materials");
      }

      const data = await response.json();
      setMaterials(data.materials || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setMaterials([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filters]);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce(fetchMaterials, 300),
    [fetchMaterials]
  );

  useEffect(() => {
    debouncedSearch();
    return () => debouncedSearch.cancel?.();
  }, [debouncedSearch]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Show autocomplete suggestions
    if (value.length >= 2) {
      // Mock suggestions - in production, fetch from API
      const mockSuggestions = [
        `${value} flooring`,
        `${value} insulation`,
        `${value} panels`,
        `Recycled ${value}`,
        `Low-carbon ${value}`,
      ];
      setSuggestions(mockSuggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (
    key: keyof SearchFilters,
    value: string | number | null
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Handle quote request
  const handleRequestQuote = (material: Material) => {
    if (onMaterialSelect) {
      onMaterialSelect(material);
    } else {
      // Navigate to RFQ form with material pre-selected
      window.location.href = `/rfqs/create?materialId=${material.id}`;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className={`material-search ${className}`}>
      {/* Search Header */}
      <div className="material-search-header">
        <h2 className="material-search-title">Find Sustainable Materials</h2>
        <p className="material-search-subtitle">
          Search our verified catalog of EPD-certified building materials
        </p>
      </div>

      {/* Search Bar */}
      <div className="material-search-bar">
        <div className="search-input-wrapper">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="search-icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search materials, manufacturers, or EPD numbers..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="search-input"
            aria-label="Search materials"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="search-clear"
              aria-label="Clear search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          {/* Autocomplete suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="search-suggestions">
              {suggestions.map((suggestion, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="search-suggestion-item"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="suggestion-icon"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                      />
                    </svg>
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="material-filters">
        <div className="filter-group">
          <label htmlFor="manufacturer-filter" className="filter-label">
            Manufacturer
          </label>
          <select
            id="manufacturer-filter"
            value={filters.manufacturer}
            onChange={(e) => handleFilterChange("manufacturer", e.target.value)}
            className="filter-select"
          >
            {manufacturers.map((mfr) => (
              <option key={mfr} value={mfr}>
                {mfr}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="assembly-filter" className="filter-label">
            Assembly Type
          </label>
          <select
            id="assembly-filter"
            value={filters.assemblyType}
            onChange={(e) => handleFilterChange("assemblyType", e.target.value)}
            className="filter-select"
          >
            {assemblyTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="gwp-filter" className="filter-label">
            Max GWP (kg CO₂e)
          </label>
          <select
            id="gwp-filter"
            value={filters.maxGwp ?? ""}
            onChange={(e) =>
              handleFilterChange(
                "maxGwp",
                e.target.value ? Number(e.target.value) : null
              )
            }
            className="filter-select"
          >
            <option value="">Any</option>
            <option value="50">≤ 50 (Low)</option>
            <option value="100">≤ 100 (Medium)</option>
            <option value="200">≤ 200 (High)</option>
          </select>
        </div>

        {/* Active filters count */}
        {(filters.manufacturer !== "" ||
          filters.assemblyType !== "" ||
          filters.maxGwp !== null) && (
          <button
            onClick={() =>
              setFilters({ manufacturer: "", assemblyType: "", maxGwp: null })
            }
            className="filter-clear"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      <div className="material-results">
        {/* Results count */}
        {!isLoading && !error && materials.length > 0 && (
          <div className="results-count">
            Showing {materials.length} material
            {materials.length !== 1 ? "s" : ""}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={fetchMaterials} className="retry-button">
              Try again
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="material-grid">
            {[...Array(6)].map((_, i) => (
              <MaterialCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && materials.length === 0 && (
          <EmptyState searchQuery={searchQuery} />
        )}

        {/* Results grid */}
        {!isLoading && !error && materials.length > 0 && (
          <div className="material-grid">
            {materials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                onRequestQuote={handleRequestQuote}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
