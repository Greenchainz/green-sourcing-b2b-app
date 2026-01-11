"use client";

import React from "react";
import { SupplierLocation } from "./SupplierMap";

/**
 * SupplierMarker Component Props
 */
interface SupplierMarkerProps {
  /**
   * Supplier data
   */
  supplier: SupplierLocation;

  /**
   * Marker size (default: "medium")
   */
  size?: "small" | "medium" | "large";

  /**
   * Show distance badge
   */
  showDistance?: boolean;

  /**
   * Show certifications badge
   */
  showCertifications?: boolean;

  /**
   * Custom marker color
   */
  color?: string;

  /**
   * Click handler
   */
  onClick?: () => void;
}

/**
 * SupplierMarker Component
 *
 * Standalone marker component for displaying supplier locations
 * in custom map implementations or lists.
 */
export default function SupplierMarker({
  supplier,
  size = "medium",
  showDistance = true,
  showCertifications = false,
  color = "#10b981",
  onClick,
}: SupplierMarkerProps) {
  const sizeClasses = {
    small: "w-3 h-3",
    medium: "w-4 h-4",
    large: "w-5 h-5",
  };

  return (
    <div
      className="gc-supplier-marker"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      {/* Marker Pin */}
      <div
        className={`${sizeClasses[size]} relative`}
        style={{
          backgroundColor: color,
          borderRadius: "50% 50% 50% 0",
          transform: "rotate(-45deg)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(45deg)",
            width: "60%",
            height: "60%",
            backgroundColor: "white",
            borderRadius: "50%",
          }}
        />
      </div>

      {/* Supplier Info */}
      <div
        className="gc-supplier-marker-info"
        style={{ display: "flex", flexDirection: "column", gap: "2px" }}
      >
        <span
          style={{
            fontSize:
              size === "small" ? "12px" : size === "medium" ? "14px" : "16px",
            fontWeight: 600,
            color: "#111827",
          }}
        >
          {supplier.name}
        </span>

        {showDistance && supplier.distance_miles !== undefined && (
          <span
            style={{
              fontSize: "12px",
              color: "#059669",
              fontWeight: 600,
            }}
          >
            {supplier.distance_miles.toFixed(1)} mi
          </span>
        )}

        {showCertifications &&
          supplier.certifications &&
          supplier.certifications.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "4px",
                flexWrap: "wrap",
                marginTop: "4px",
              }}
            >
              {supplier.certifications.slice(0, 2).map((cert, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: "10px",
                    padding: "2px 6px",
                    backgroundColor: "#ecfdf5",
                    color: "#059669",
                    borderRadius: "4px",
                    fontWeight: 600,
                  }}
                >
                  {cert}
                </span>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
