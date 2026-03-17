"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CertificationBadgeGroup,
  type CertificationType,
} from "./CertificationBadge";
import { calculateGCS } from "../../lib/scoring";

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
  // GreenChainz Score fields
  epd_number?: string;
  epd_expiry?: string;
  epd_program_operator?: string;
  hpd_available?: boolean;
  astm_standards?: string[];
  lead_time_days?: number;
  regional_availability?: string[];
  gwp_per_1000sf?: number;
  category_baseline_gwp?: number;
  voc_compliant?: boolean;
  not_on_red_list?: boolean;
  regional_within_500mi?: boolean;
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

function getGCSColor(gcs: number): string {
  if (gcs >= 80) return "var(--gc-emerald-600, #059669)";
  if (gcs >= 60) return "#22c55e";
  if (gcs >= 40) return "#eab308";
  return "#ef4444";
}

function getGCSLabel(gcs: number): string {
  if (gcs >= 80) return "Excellent";
  if (gcs >= 60) return "Good";
  if (gcs >= 40) return "Fair";
  return "Poor";
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

  // Compute GCS if the material has the required new fields; fall back gracefully
  const hasGCSData =
    material.gwp_per_1000sf !== undefined &&
    material.category_baseline_gwp !== undefined;

  const gcsResult = hasGCSData
    ? calculateGCS(material as Parameters<typeof calculateGCS>[0])
    : null;

  const gcs = gcsResult?.gcs ?? material.sustainabilityScore;
  const gcsColor = getGCSColor(gcs);
  const gcsLabel = getGCSLabel(gcs);
  const carbonSavingsPct = gcsResult?.carbonSavingsPct ?? null;
  const complianceStatus = gcsResult?.complianceStatus ?? false;
  const leadTimeDays = material.lead_time_days;
  const leadTimeWks =
    leadTimeDays !== undefined
      ? leadTimeDays >= 7
        ? `${Math.round(leadTimeDays / 7)} wks`
        : `${leadTimeDays}d`
      : null;

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

        {/* ── GCS Hero + Metrics Strip ── */}
        <div style={{ margin: "0.75rem 0 0.5rem" }}>
          {/* ROW 1: Hero GCS */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              marginBottom: "0.5rem",
            }}
          >
            <span
              style={{
                fontSize: "2rem",
                fontWeight: 900,
                lineHeight: 1,
                color: gcsColor,
              }}
            >
              {gcs}
            </span>
            <div>
              <div
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: "var(--gc-slate-500)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                GreenChainz Score
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: gcsColor,
                }}
              >
                {gcsLabel}
              </div>
            </div>
          </div>

          {/* ROW 2: 4-column metrics strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "0.25rem",
              background: "var(--gc-slate-50)",
              borderRadius: "var(--gc-radius)",
              padding: "0.4rem 0.25rem",
              fontSize: "0.6rem",
            }}
          >
            {/* Carbon Savings */}
            <div
              style={{ textAlign: "center", padding: "0.15rem 0" }}
            >
              <div style={{ fontSize: "0.75rem" }}>🌿</div>
              <div
                style={{
                  fontWeight: 800,
                  color:
                    carbonSavingsPct !== null && carbonSavingsPct > 0
                      ? "var(--gc-emerald-600, #059669)"
                      : "var(--gc-slate-700)",
                }}
              >
                {carbonSavingsPct !== null
                  ? `${carbonSavingsPct > 0 ? "-" : "+"}${Math.abs(carbonSavingsPct)}%`
                  : "—"}
              </div>
              <div style={{ color: "var(--gc-slate-500)" }}>Carbon</div>
            </div>

            {/* Cost Delta */}
            <div style={{ textAlign: "center", padding: "0.15rem 0" }}>
              <div style={{ fontSize: "0.75rem" }}>💰</div>
              <div style={{ fontWeight: 800, color: "var(--gc-slate-700)" }}>
                {gcsResult
                  ? gcsResult.costDeltaPct === 0
                    ? "Market"
                    : `${gcsResult.costDeltaPct > 0 ? "+" : ""}${gcsResult.costDeltaPct}%`
                  : "—"}
              </div>
              <div style={{ color: "var(--gc-slate-500)" }}>Cost</div>
            </div>

            {/* Lead Time */}
            <div style={{ textAlign: "center", padding: "0.15rem 0" }}>
              <div style={{ fontSize: "0.75rem" }}>⏱</div>
              <div style={{ fontWeight: 800, color: "var(--gc-slate-700)" }}>
                {leadTimeWks ?? "—"}
              </div>
              <div style={{ color: "var(--gc-slate-500)" }}>Lead</div>
            </div>

            {/* Compliance */}
            <div style={{ textAlign: "center", padding: "0.15rem 0" }}>
              <div style={{ fontSize: "0.75rem" }}>
                {complianceStatus ? "✅" : "❌"}
              </div>
              <div
                style={{
                  fontWeight: 800,
                  color: complianceStatus
                    ? "var(--gc-emerald-600, #059669)"
                    : "#ef4444",
                }}
              >
                {complianceStatus ? "✓" : "✗"}
              </div>
              <div style={{ color: "var(--gc-slate-500)" }}>
                {complianceStatus ? "EPD+ASTM" : "Pending"}
              </div>
            </div>
          </div>
        </div>

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
