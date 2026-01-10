"use client";

import { useState } from "react";
import type { CertificationType } from "./CertificationBadge";

export interface FilterState {
  categories: string[];
  certifications: CertificationType[];
  scoreRange: [number, number];
  priceRange: string[];
  manufacturers: string[];
}

export const DEFAULT_FILTERS: FilterState = {
  categories: [],
  certifications: [],
  scoreRange: [0, 100],
  priceRange: [],
  manufacturers: [],
};

export interface FilterSidebarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableCategories: {
    id: string;
    name: string;
    count: number;
    subcategories?: { id: string; name: string; count: number }[];
  }[];
  availableCertifications: {
    id: CertificationType;
    name: string;
    count: number;
  }[];
  availableManufacturers: { id: string; name: string; count: number }[];
  /** Is the sidebar collapsed (mobile) */
  isCollapsed?: boolean;
  /** Toggle collapse */
  onToggleCollapse?: () => void;
  /** Additional class names */
  className?: string;
}

export default function FilterSidebar({
  filters,
  onFiltersChange,
  availableCategories,
  availableCertifications,
  availableManufacturers,
  isCollapsed = false,
  className = "",
}: FilterSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter((id) => id !== categoryId)
      : [...filters.categories, categoryId];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const handleCertificationToggle = (certId: CertificationType) => {
    const newCerts = filters.certifications.includes(certId)
      ? filters.certifications.filter((id) => id !== certId)
      : [...filters.certifications, certId];
    onFiltersChange({ ...filters, certifications: newCerts });
  };

  const handleScoreChange = (value: [number, number]) => {
    onFiltersChange({ ...filters, scoreRange: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      certifications: [],
      scoreRange: [0, 100],
      priceRange: [],
      manufacturers: [],
    });
  };

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.certifications.length > 0 ||
    filters.scoreRange[0] > 0 ||
    filters.scoreRange[1] < 100 ||
    filters.manufacturers.length > 0;

  return (
    <aside
      className={`gc-filter-sidebar ${isCollapsed ? "gc-filter-sidebar--collapsed" : "gc-filter-sidebar--expanded"} ${className}`}
    >
      <div className="gc-filter-content">
        {/* Header */}
        <div className="gc-filter-header">
          <h2 className="gc-filter-title">Filters</h2>
          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="gc-filter-clear-btn">
              Clear all
            </button>
          )}
        </div>

        {/* Categories Accordion */}
        <FilterSection title="Categories">
          {availableCategories.map((category) => (
            <div key={category.id}>
              <div className="gc-filter-category-row">
                <FilterCheckbox
                  id={`cat-${category.id}`}
                  checked={filters.categories.includes(category.id)}
                  onChange={() => handleCategoryToggle(category.id)}
                  label={category.name}
                  count={category.count}
                />
                {category.subcategories &&
                  category.subcategories.length > 0 && (
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className={`gc-filter-expand-btn ${expandedCategories.includes(category.id) ? "gc-filter-expand-btn--expanded" : ""}`}
                      aria-label={
                        expandedCategories.includes(category.id)
                          ? "Collapse subcategories"
                          : "Expand subcategories"
                      }
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="gc-filter-expand-icon"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  )}
              </div>
              {/* Subcategories */}
              {category.subcategories &&
                expandedCategories.includes(category.id) && (
                  <div className="gc-filter-subcategories">
                    {category.subcategories.map((sub) => (
                      <FilterCheckbox
                        key={sub.id}
                        id={`subcat-${sub.id}`}
                        checked={filters.categories.includes(sub.id)}
                        onChange={() => handleCategoryToggle(sub.id)}
                        label={sub.name}
                        count={sub.count}
                      />
                    ))}
                  </div>
                )}
            </div>
          ))}
        </FilterSection>

        <FilterDivider />

        {/* Certifications */}
        <FilterSection title="Certifications">
          {availableCertifications.map((cert) => (
            <FilterCheckbox
              key={cert.id}
              id={`cert-${cert.id}`}
              checked={filters.certifications.includes(cert.id)}
              onChange={() => handleCertificationToggle(cert.id)}
              label={cert.name}
              count={cert.count}
              verified
            />
          ))}
        </FilterSection>

        <FilterDivider />

        {/* Sustainability Score Slider */}
        <FilterSection title="Sustainability Score">
          <div className="gc-filter-slider-container">
            <div className="gc-filter-score-display">
              <span className="gc-filter-score-value">
                {filters.scoreRange[0]} - {filters.scoreRange[1]}
              </span>
            </div>
            <div style={{ position: "relative", height: 24 }}>
              {/* Track */}
              <div className="gc-filter-slider-track" />
              {/* Active Track */}
              <div
                className="gc-filter-slider-active"
                style={{
                  left: `${filters.scoreRange[0]}%`,
                  right: `${100 - filters.scoreRange[1]}%`,
                }}
              />
              {/* Min Slider */}
              <input
                type="range"
                min={0}
                max={100}
                value={filters.scoreRange[0]}
                onChange={(e) =>
                  handleScoreChange([
                    Math.min(Number(e.target.value), filters.scoreRange[1] - 5),
                    filters.scoreRange[1],
                  ])
                }
                className="gc-range-slider"
                aria-label="Minimum sustainability score"
              />
              {/* Max Slider */}
              <input
                type="range"
                min={0}
                max={100}
                value={filters.scoreRange[1]}
                onChange={(e) =>
                  handleScoreChange([
                    filters.scoreRange[0],
                    Math.max(Number(e.target.value), filters.scoreRange[0] + 5),
                  ])
                }
                className="gc-range-slider"
                aria-label="Maximum sustainability score"
              />
            </div>
            <div className="gc-filter-slider-labels">
              <span>0</span>
              <span>100</span>
            </div>
          </div>
        </FilterSection>

        <FilterDivider />

        {/* Manufacturers */}
        <FilterSection title="Manufacturers" defaultCollapsed>
          {availableManufacturers.slice(0, 10).map((mfr) => (
            <FilterCheckbox
              key={mfr.id}
              id={`mfr-${mfr.id}`}
              checked={filters.manufacturers.includes(mfr.id)}
              onChange={() => {
                const newMfrs = filters.manufacturers.includes(mfr.id)
                  ? filters.manufacturers.filter((id) => id !== mfr.id)
                  : [...filters.manufacturers, mfr.id];
                onFiltersChange({ ...filters, manufacturers: newMfrs });
              }}
              label={mfr.name}
              count={mfr.count}
            />
          ))}
          {availableManufacturers.length > 10 && (
            <button className="gc-filter-show-more-btn">
              Show {availableManufacturers.length - 10} more
            </button>
          )}
        </FilterSection>
      </div>
    </aside>
  );
}

// Filter Section Component
function FilterSection({
  title,
  children,
  defaultCollapsed = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className="gc-filter-section">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="gc-filter-section-btn"
        aria-expanded={!isCollapsed}
      >
        <span className="gc-filter-section-title">{title}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--gc-slate-400)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`gc-filter-section-icon ${isCollapsed ? "gc-filter-section-icon--collapsed" : "gc-filter-section-icon--expanded"}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        className={`gc-filter-section-content ${isCollapsed ? "gc-filter-section-content--collapsed" : "gc-filter-section-content--expanded"}`}
      >
        {children}
      </div>
    </div>
  );
}

// Checkbox Component
function FilterCheckbox({
  id,
  checked,
  onChange,
  label,
  count,
  verified,
}: {
  id: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
  verified?: boolean;
}) {
  return (
    <label htmlFor={id} className="gc-filter-checkbox-label">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        className="gc-filter-checkbox"
      />
      <span
        className={`gc-filter-checkbox-text ${checked ? "gc-filter-checkbox-text--checked" : "gc-filter-checkbox-text--unchecked"}`}
      >
        {label}
        {verified && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--gc-emerald-500)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="gc-filter-verified-icon"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        )}
      </span>
      {count !== undefined && <span className="gc-filter-count">{count}</span>}
    </label>
  );
}

// Divider
function FilterDivider() {
  return <hr className="gc-filter-divider" />;
}

// Mobile Filter Button
export function MobileFilterButton({
  filterCount,
  onClick,
}: {
  filterCount: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="gc-btn gc-btn-secondary gc-mobile-filter-btn"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="gc-mobile-filter-icon"
      >
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
      Filters
      {filterCount > 0 && (
        <span className="gc-filter-count-badge">{filterCount}</span>
      )}
    </button>
  );
}
