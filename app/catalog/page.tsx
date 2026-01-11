"use client";

import { useState, useMemo } from "react";
import FilterSidebar, {
  MobileFilterButton,
  DEFAULT_FILTERS,
  type FilterState,
} from "../components/catalog/FilterSidebar";
import MaterialCard, {
  type Material,
} from "../components/catalog/MaterialCard";
import CompareTray from "../components/catalog/CompareTray";
import type { CertificationType } from "../components/catalog/CertificationBadge";

// Mock data - would come from API in production
const MOCK_MATERIALS: Material[] = [
  {
    id: "mat-001",
    name: "EcoTimber Premium Hardwood Flooring",
    category: "Flooring",
    subcategory: "Hardwood",
    manufacturer: "EcoTimber Inc.",
    image: "/placeholder-material.png",
    sustainabilityScore: 92,
    certifications: ["fsc", "leed", "epd"],
    leedPoints: 8,
    carbonFootprint: 12.4,
    recycledContent: 35,
    verifiedSuppliers: 8,
    shadowSuppliers: 12,
    featured: true,
  },
  {
    id: "mat-002",
    name: "GreenCore Recycled Steel Beams",
    category: "Structural",
    subcategory: "Steel",
    manufacturer: "GreenCore Steel",
    image: "/placeholder-material.png",
    sustainabilityScore: 88,
    certifications: ["epd", "leed"],
    leedPoints: 6,
    carbonFootprint: 45.2,
    recycledContent: 95,
    verifiedSuppliers: 5,
    shadowSuppliers: 8,
  },
  {
    id: "mat-003",
    name: "BioFiber Insulation Panels",
    category: "Insulation",
    subcategory: "Natural Fiber",
    manufacturer: "BioFiber Solutions",
    image: "/placeholder-material.png",
    sustainabilityScore: 95,
    certifications: ["greenguard", "declare", "epd"],
    leedPoints: 10,
    carbonFootprint: 3.2,
    recycledContent: 80,
    verifiedSuppliers: 3,
    shadowSuppliers: 5,
    featured: true,
  },
  {
    id: "mat-004",
    name: "ClearVue Low-E Triple Glazing",
    category: "Windows",
    subcategory: "Glazing",
    manufacturer: "ClearVue Glass",
    image: "/placeholder-material.png",
    sustainabilityScore: 78,
    certifications: ["energy-star", "epd"],
    leedPoints: 5,
    carbonFootprint: 28.5,
    recycledContent: 20,
    verifiedSuppliers: 6,
    shadowSuppliers: 4,
  },
  {
    id: "mat-005",
    name: "TerraCotta Rain Screen Panels",
    category: "Cladding",
    subcategory: "Terracotta",
    manufacturer: "TerraCotta Systems",
    image: "/placeholder-material.png",
    sustainabilityScore: 72,
    certifications: ["leed", "breeam"],
    leedPoints: 4,
    carbonFootprint: 18.9,
    recycledContent: 15,
    verifiedSuppliers: 4,
    shadowSuppliers: 7,
  },
  {
    id: "mat-006",
    name: "SolarShade Dynamic Glass",
    category: "Windows",
    subcategory: "Smart Glass",
    manufacturer: "SolarShade Tech",
    image: "/placeholder-material.png",
    sustainabilityScore: 85,
    certifications: ["energy-star", "leed", "epd"],
    leedPoints: 7,
    carbonFootprint: 32.1,
    recycledContent: 25,
    verifiedSuppliers: 2,
    shadowSuppliers: 3,
  },
  {
    id: "mat-007",
    name: "HempCrete Building Blocks",
    category: "Masonry",
    subcategory: "Bio-Based",
    manufacturer: "HempBuild Co.",
    image: "/placeholder-material.png",
    sustainabilityScore: 98,
    certifications: ["declare", "cradle-to-cradle", "epd"],
    leedPoints: 12,
    carbonFootprint: -5.2,
    recycledContent: 0,
    verifiedSuppliers: 2,
    shadowSuppliers: 6,
    featured: true,
  },
  {
    id: "mat-008",
    name: "RecycleRoof Metal Panels",
    category: "Roofing",
    subcategory: "Metal",
    manufacturer: "RecycleRoof Industries",
    image: "/placeholder-material.png",
    sustainabilityScore: 82,
    certifications: ["leed", "epd"],
    leedPoints: 5,
    carbonFootprint: 22.8,
    recycledContent: 70,
    verifiedSuppliers: 7,
    shadowSuppliers: 9,
  },
  {
    id: "mat-009",
    name: "AquaGuard Permeable Pavers",
    category: "Hardscape",
    subcategory: "Pavers",
    manufacturer: "AquaGuard Outdoor",
    image: "/placeholder-material.png",
    sustainabilityScore: 76,
    certifications: ["leed", "breeam"],
    leedPoints: 4,
    carbonFootprint: 15.3,
    recycledContent: 40,
    verifiedSuppliers: 5,
    shadowSuppliers: 11,
  },
  {
    id: "mat-010",
    name: "EcoWall Bamboo Panels",
    category: "Wall Finishes",
    subcategory: "Wood Panels",
    manufacturer: "EcoWall Designs",
    image: "/placeholder-material.png",
    sustainabilityScore: 89,
    certifications: ["fsc", "greenguard", "leed"],
    leedPoints: 7,
    carbonFootprint: 8.7,
    recycledContent: 10,
    verifiedSuppliers: 4,
    shadowSuppliers: 6,
  },
  {
    id: "mat-011",
    name: "ZeroVOC Interior Paint",
    category: "Coatings",
    subcategory: "Paint",
    manufacturer: "PureCoat Labs",
    image: "/placeholder-material.png",
    sustainabilityScore: 94,
    certifications: ["greenguard", "declare", "leed"],
    leedPoints: 8,
    carbonFootprint: 2.1,
    recycledContent: 5,
    verifiedSuppliers: 9,
    shadowSuppliers: 14,
  },
  {
    id: "mat-012",
    name: "CorkTech Acoustic Flooring",
    category: "Flooring",
    subcategory: "Cork",
    manufacturer: "CorkTech International",
    image: "/placeholder-material.png",
    sustainabilityScore: 91,
    certifications: ["fsc", "epd", "cradle-to-cradle"],
    leedPoints: 9,
    carbonFootprint: 6.4,
    recycledContent: 65,
    verifiedSuppliers: 3,
    shadowSuppliers: 5,
  },
];

const CATEGORIES = [
  {
    id: "flooring",
    name: "Flooring",
    count: 24,
    subcategories: [
      { id: "hardwood", name: "Hardwood", count: 8 },
      { id: "cork", name: "Cork", count: 4 },
      { id: "tile", name: "Tile", count: 7 },
      { id: "carpet", name: "Carpet", count: 5 },
    ],
  },
  {
    id: "structural",
    name: "Structural",
    count: 18,
    subcategories: [
      { id: "steel", name: "Steel", count: 6 },
      { id: "timber", name: "Timber", count: 8 },
      { id: "concrete", name: "Concrete", count: 4 },
    ],
  },
  {
    id: "insulation",
    name: "Insulation",
    count: 15,
    subcategories: [
      { id: "natural-fiber", name: "Natural Fiber", count: 5 },
      { id: "foam", name: "Foam", count: 6 },
      { id: "mineral-wool", name: "Mineral Wool", count: 4 },
    ],
  },
  { id: "windows", name: "Windows", count: 12 },
  { id: "cladding", name: "Cladding", count: 10 },
  { id: "roofing", name: "Roofing", count: 14 },
  { id: "masonry", name: "Masonry", count: 9 },
  { id: "wall-finishes", name: "Wall Finishes", count: 16 },
  { id: "coatings", name: "Coatings", count: 11 },
  { id: "hardscape", name: "Hardscape", count: 8 },
];

const CERTIFICATIONS: { id: CertificationType; name: string; count: number }[] =
  [
    { id: "leed", name: "LEED Certified", count: 156 },
    { id: "fsc", name: "FSC Certified", count: 89 },
    { id: "epd", name: "EPD Verified", count: 124 },
    { id: "breeam", name: "BREEAM", count: 67 },
    { id: "greenguard", name: "GREENGUARD Gold", count: 45 },
    { id: "cradle-to-cradle", name: "Cradle to Cradle", count: 32 },
    { id: "energy-star", name: "ENERGY STAR", count: 28 },
    { id: "declare", name: "Declare Label", count: 41 },
  ];

const MANUFACTURERS = [
  { id: "ecotimber", name: "EcoTimber Inc.", count: 12 },
  { id: "greencore", name: "GreenCore Steel", count: 8 },
  { id: "biofiber", name: "BioFiber Solutions", count: 6 },
  { id: "clearvue", name: "ClearVue Glass", count: 9 },
  { id: "terracotta", name: "TerraCotta Systems", count: 5 },
  { id: "solarshade", name: "SolarShade Tech", count: 4 },
  { id: "hempbuild", name: "HempBuild Co.", count: 3 },
  { id: "recycleroof", name: "RecycleRoof Industries", count: 7 },
  { id: "aquaguard", name: "AquaGuard Outdoor", count: 5 },
  { id: "ecowall", name: "EcoWall Designs", count: 8 },
  { id: "purecoat", name: "PureCoat Labs", count: 6 },
  { id: "corktech", name: "CorkTech International", count: 4 },
];

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
