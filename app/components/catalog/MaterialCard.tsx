"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CertificationBadgeGroup,
  type CertificationType,
} from "./CertificationBadge";
import { ScoreBar } from "./SustainabilityScore";

export interface Material {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  manufacturer: string;
  image?: string;
  sustainabilityScore: number;
  certifications: CertificationType[];
  leedPoints?: number;
  carbonFootprint?: number;
  recycledContent?: number;
  verifiedSuppliers: number;
  shadowSuppliers?: number;
  priceRange?: string;
  featured?: boolean;
}

export interface MaterialCardProps {
  material: Material;
  /** Whether this card is selected for comparison */
  isSelected?: boolean;
  /** Callback when compare checkbox changes */
  onCompareToggle?: (materialId: string, selected: boolean) => void;
  /** Whether compare mode is enabled */
  compareEnabled?: boolean;
  /** Animation delay index for staggered animations */
  animationIndex?: number;
  /** Additional class names */
  className?: string;
}

export default function MaterialCard({
  material,
  isSelected = false,
  onCompareToggle,
  compareEnabled = false,
  animationIndex = 0,
  className = "",
}: MaterialCardProps) {
  const [isFocused, setIsFocused] = useState(false);
  const staggerClass = `gc-stagger-${Math.min((animationIndex % 5) + 1, 5)}`;

  return (
    <article
      className={`gc-card gc-card-hover gc-animate-fade-in gc-material-card ${staggerClass} ${className}`}
    >
      {/* Featured Badge */}
      {material.featured && <div className="gc-featured-badge">Featured</div>}

      {/* Compare Checkbox */}
      {compareEnabled && (
        <label
          className={`gc-compare-checkbox-label ${isSelected ? "gc-compare-checkbox-label--selected" : "gc-compare-checkbox-label--unselected"} ${isFocused ? "gc-compare-checkbox-label--focused" : ""}`}
          title={isSelected ? "Remove from comparison" : "Add to comparison"}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onCompareToggle?.(material.id, e.target.checked)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="gc-compare-checkbox-input"
          />
          {isSelected ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="gc-compare-icon"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--gc-slate-400)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="gc-compare-icon"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
        </label>
      )}

      {/* Image */}
      <Link href={`/catalog/${material.id}`} className="gc-material-image-link">
        <Image
          src={material.image || "/placeholder-material.png"}
          alt={material.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="gc-material-image"
        />
        {/* Score Badge Overlay */}
        <div className="gc-score-overlay">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--gc-emerald-600)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="gc-score-overlay-icon"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="gc-score-overlay-value">
            {material.sustainabilityScore}
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="gc-material-content">
        {/* Category */}
        <div className="gc-material-category">
          {material.category}
          {material.subcategory && ` · ${material.subcategory}`}
        </div>

        {/* Name */}
        <Link
          href={`/catalog/${material.id}`}
          className="gc-material-name-link"
        >
          {material.name}
        </Link>

        {/* Manufacturer */}
        <div className="gc-material-manufacturer">
          by {material.manufacturer}
        </div>

        {/* Sustainability Score Bar */}
        <ScoreBar score={material.sustainabilityScore} className="" />

        {/* Certifications */}
        <div className="gc-material-certifications">
          <CertificationBadgeGroup
            certifications={material.certifications}
            size="sm"
            maxVisible={3}
          />
        </div>

        {/* Footer */}
        <div className="gc-material-footer">
          {/* Suppliers */}
          <div className="gc-suppliers-count">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--gc-slate-500)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="gc-suppliers-icon"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>
              {material.verifiedSuppliers}
              {material.shadowSuppliers && material.shadowSuppliers > 0 && (
                <span className="gc-shadow-suppliers">
                  {" "}
                  +{material.shadowSuppliers}
                </span>
              )}
            </span>
          </div>

          {/* Quick Quote CTA */}
          <Link
            href={`/rfqs/new?material=${material.id}`}
            className="gc-btn gc-btn-primary gc-quote-btn"
          >
            Request Quote
          </Link>
        </div>
      </div>
    </article>
  );
}
