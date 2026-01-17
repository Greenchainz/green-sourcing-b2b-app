"use client";

import { useState, useMemo } from "react";
import FilterSidebar, {
  MobileFilterButton,
  DEFAULT_FILTERS,
  type FilterState,
} from "../components/catalog/FilterSidebar";
import MaterialCard from "../components/catalog/MaterialCard";
import CompareTray from "../components/catalog/CompareTray";
import {
  MOCK_MATERIALS,
  CATEGORIES,
  CERTIFICATIONS,
  MANUFACTURERS,
} from "./data";

const ITEMS_PER_PAGE = 24;

type SortOption =
  | "score-desc"
  | "score-asc"
  | "name-asc"
  | "name-desc"
  | "suppliers-desc";

export default function CatalogPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("score-desc");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter and sort materials
  const filteredMaterials = useMemo(() => {
    let result = [...MOCK_MATERIALS];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.manufacturer.toLowerCase().includes(query) ||
          m.category.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (filters.categories.length > 0) {
      result = result.filter((m) =>
        filters.categories.some(
          (cat) =>
            m.category.toLowerCase().replace(/\s+/g, "-") === cat ||
            m.subcategory?.toLowerCase().replace(/\s+/g, "-") === cat
        )
      );
    }

    // Certification filter
    if (filters.certifications.length > 0) {
      result = result.filter((m) =>
        filters.certifications.some((cert) => m.certifications.includes(cert))
      );
    }

    // Score range filter
    result = result.filter(
      (m) =>
        m.sustainabilityScore >= filters.scoreRange[0] &&
        m.sustainabilityScore <= filters.scoreRange[1]
    );

    // Manufacturer filter
    if (filters.manufacturers.length > 0) {
      result = result.filter((m) =>
        filters.manufacturers.some((mfr) =>
          m.manufacturer.toLowerCase().replace(/\s+/g, "-").includes(mfr)
        )
      );
    }

    // Sort
    switch (sortBy) {
      case "score-desc":
        result.sort((a, b) => b.sustainabilityScore - a.sustainabilityScore);
        break;
      case "score-asc":
        result.sort((a, b) => a.sustainabilityScore - b.sustainabilityScore);
        break;
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "suppliers-desc":
        result.sort((a, b) => b.verifiedSuppliers - a.verifiedSuppliers);
        break;
    }

    return result;
  }, [filters, sortBy, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE);
  const paginatedMaterials = filteredMaterials.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Compare functionality
  const handleCompareToggle = (materialId: string, selected: boolean) => {
    if (selected && compareList.length >= 5) return; // Max 5 items
    setCompareList((prev) =>
      selected ? [...prev, materialId] : prev.filter((id) => id !== materialId)
    );
  };

  const compareMaterials = MOCK_MATERIALS.filter((m) =>
    compareList.includes(m.id)
  );

  const activeFilterCount =
    filters.categories.length +
    filters.certifications.length +
    filters.manufacturers.length +
    (filters.scoreRange[0] > 0 || filters.scoreRange[1] < 100 ? 1 : 0);

  return (
    <div className="gc-page">
      {/* Premium Page Header with Glass Effect */}
      <div className="gc-catalog-header">
        <div className="gc-container gc-catalog-header-inner">
          <div className="gc-catalog-header-content">
            <div className="gc-animate-fade-in">
              <h1 className="gc-catalog-title">
                Material <span className="text-gradient">Catalog</span>
              </h1>
              <p className="gc-catalog-subtitle">
                Discover verified sustainable building materials from trusted
                suppliers
              </p>
            </div>

            {/* Search & Actions Bar */}
            <div className="gc-catalog-actions">
              {/* Search */}
              <div className="gc-search-container">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="gc-search-icon"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="search"
                  placeholder="Search materials, manufacturers..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="gc-input gc-search-input"
                />
              </div>

              {/* Mobile Filters Button */}
              <div className="gc-mobile-only">
                <MobileFilterButton
                  filterCount={activeFilterCount}
                  onClick={() => setShowMobileFilters(true)}
                />
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="gc-select gc-sort-select"
                aria-label="Sort materials"
              >
                <option value="score-desc">Highest Score</option>
                <option value="score-asc">Lowest Score</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="suppliers-desc">Most Suppliers</option>
              </select>

              {/* Results Count */}
              <div className="gc-results-count">
                {filteredMaterials.length} materials
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="gc-catalog-layout">
        {/* Sidebar */}
        <FilterSidebar
          filters={filters}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            setCurrentPage(1);
          }}
          availableCategories={CATEGORIES}
          availableCertifications={CERTIFICATIONS}
          availableManufacturers={MANUFACTURERS}
        />

        {/* Grid Content */}
        <div className="gc-catalog-content">
          {/* Materials Grid */}
          {paginatedMaterials.length > 0 ? (
            <div className="gc-materials-grid">
              {paginatedMaterials.map((material, index) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  isSelected={compareList.includes(material.id)}
                  onCompareToggle={handleCompareToggle}
                  compareEnabled={true}
                  animationIndex={index}
                />
              ))}
            </div>
          ) : (
            <div className="gc-card gc-animate-fade-in gc-empty-state-card">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="gc-empty-state-icon"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <h3 className="gc-empty-state-title">No materials found</h3>
              <p className="gc-empty-state-text">
                Try adjusting your filters or search query
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className={`gc-pagination ${compareList.length > 0 ? "gc-pagination--with-tray" : ""}`}
            >
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="gc-btn gc-btn-ghost gc-pagination-btn"
                aria-label="Previous page"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="gc-pagination-icon"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`gc-btn gc-pagination-page ${currentPage === pageNum ? "gc-btn-primary" : "gc-btn-ghost"}`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="gc-btn gc-btn-ghost gc-pagination-btn"
                aria-label="Next page"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="gc-pagination-icon"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Compare Tray */}
      <CompareTray
        materials={compareMaterials}
        maxItems={5}
        onRemove={(id) =>
          setCompareList((prev) => prev.filter((i) => i !== id))
        }
        onClearAll={() => setCompareList([])}
      />

      {/* Mobile Filter Overlay */}
      {showMobileFilters && (
        <div
          className="gc-filter-overlay"
          onClick={() => setShowMobileFilters(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="gc-filter-panel">
            <div className="gc-filter-panel-header">
              <h2 className="gc-filter-panel-title">Filters</h2>
              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="gc-filter-close-btn"
                aria-label="Close filters"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="gc-filter-close-icon"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <FilterSidebar
              filters={filters}
              onFiltersChange={(newFilters) => {
                setFilters(newFilters);
                setCurrentPage(1);
              }}
              availableCategories={CATEGORIES}
              availableCertifications={CERTIFICATIONS}
              availableManufacturers={MANUFACTURERS}
            />
          </div>
        </div>
      )}
    </div>
  );
}
