"use client";

import React, { useState } from "react";
import SupplierMap from "./SupplierMap";
import { SupplierLocation } from "./SupplierMap";
import SupplierMarker from "./SupplierMarker";

/**
 * SupplierMapList Component Props
 */
interface SupplierMapListProps {
  /**
   * Suppliers to display
   */
  suppliers: SupplierLocation[];

  /**
   * Default view mode (default: "map")
   */
  defaultView?: "map" | "list";

  /**
   * Show distance in list view
   */
  showDistance?: boolean;

  /**
   * Show certifications in list view
   */
  showCertifications?: boolean;

  /**
   * Callback when supplier is selected
   */
  onSupplierSelect?: (supplier: SupplierLocation) => void;

  /**
   * Map height (default: "500px")
   */
  mapHeight?: string;

  /**
   * Show service radius on map
   */
  showServiceRadius?: boolean;
}

/**
 * SupplierMapList Component
 *
 * Combined map and list view for displaying suppliers with
 * toggle between map and list views.
 */
export default function SupplierMapList({
  suppliers,
  defaultView = "map",
  showDistance = true,
  showCertifications = true,
  onSupplierSelect,
  mapHeight = "500px",
  showServiceRadius = false,
}: SupplierMapListProps) {
  const [viewMode, setViewMode] = useState<"map" | "list">(defaultView);
  const [selectedSupplier, setSelectedSupplier] =
    useState<SupplierLocation | null>(null);

  const handleSupplierClick = (supplier: SupplierLocation) => {
    setSelectedSupplier(supplier);
    if (onSupplierSelect) {
      onSupplierSelect(supplier);
    }
  };

  // Sort suppliers by distance if available
  const sortedSuppliers = [...suppliers].sort((a, b) => {
    if (a.distance_miles === undefined && b.distance_miles === undefined)
      return 0;
    if (a.distance_miles === undefined) return 1;
    if (b.distance_miles === undefined) return -1;
    return a.distance_miles - b.distance_miles;
  });

  return (
    <div className="gc-supplier-map-list" style={{ width: "100%" }}>
      {/* View Toggle */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <button
          type="button"
          onClick={() => setViewMode("map")}
          style={{
            padding: "8px 16px",
            backgroundColor: viewMode === "map" ? "#10b981" : "transparent",
            color: viewMode === "map" ? "white" : "#6b7280",
            border: "none",
            borderBottom:
              viewMode === "map"
                ? "2px solid #10b981"
                : "2px solid transparent",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "14px",
            transition: "all 0.2s",
          }}
        >
          Map View
        </button>
        <button
          type="button"
          onClick={() => setViewMode("list")}
          style={{
            padding: "8px 16px",
            backgroundColor: viewMode === "list" ? "#10b981" : "transparent",
            color: viewMode === "list" ? "white" : "#6b7280",
            border: "none",
            borderBottom:
              viewMode === "list"
                ? "2px solid #10b981"
                : "2px solid transparent",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "14px",
            transition: "all 0.2s",
          }}
        >
          List View ({suppliers.length})
        </button>
      </div>

      {/* Map View */}
      {viewMode === "map" && (
        <div style={{ marginBottom: "16px" }}>
          <SupplierMap
            suppliers={suppliers}
            showDistance={showDistance}
            height={mapHeight}
            onSupplierClick={handleSupplierClick}
            showServiceRadius={showServiceRadius}
          />
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div
          className="gc-supplier-list"
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          {sortedSuppliers.length === 0 ? (
            <div
              style={{
                padding: "32px",
                textAlign: "center",
                color: "#6b7280",
                backgroundColor: "#f9fafb",
                borderRadius: "8px",
              }}
            >
              <p style={{ margin: 0, fontSize: "14px" }}>No suppliers found</p>
            </div>
          ) : (
            sortedSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                onClick={() => handleSupplierClick(supplier)}
                style={{
                  padding: "16px",
                  backgroundColor:
                    selectedSupplier?.id === supplier.id ? "#ecfdf5" : "white",
                  border:
                    selectedSupplier?.id === supplier.id
                      ? "2px solid #10b981"
                      : "1px solid #e5e7eb",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => {
                  if (selectedSupplier?.id !== supplier.id) {
                    e.currentTarget.style.borderColor = "#10b981";
                    e.currentTarget.style.backgroundColor = "#f0fdf4";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedSupplier?.id !== supplier.id) {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.backgroundColor = "white";
                  }
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "8px",
                    }}
                  >
                    <SupplierMarker
                      supplier={supplier}
                      size="small"
                      showDistance={false}
                      showCertifications={false}
                    />
                    {showDistance && supplier.distance_miles !== undefined && (
                      <span
                        style={{
                          fontSize: "14px",
                          color: "#059669",
                          fontWeight: 600,
                        }}
                      >
                        {supplier.distance_miles.toFixed(1)} miles away
                      </span>
                    )}
                  </div>

                  {(supplier.city || supplier.state) && (
                    <p
                      style={{
                        margin: "4px 0",
                        fontSize: "14px",
                        color: "#6b7280",
                      }}
                    >
                      {supplier.city && supplier.state
                        ? `${supplier.city}, ${supplier.state}`
                        : supplier.city || supplier.state}
                    </p>
                  )}

                  {supplier.email && (
                    <p
                      style={{
                        margin: "4px 0 0 0",
                        fontSize: "13px",
                        color: "#9ca3af",
                      }}
                    >
                      {supplier.email}
                    </p>
                  )}

                  {showCertifications &&
                    supplier.certifications &&
                    supplier.certifications.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                          marginTop: "8px",
                        }}
                      >
                        {supplier.certifications.map((cert, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: "12px",
                              padding: "4px 8px",
                              backgroundColor: "#ecfdf5",
                              color: "#059669",
                              borderRadius: "6px",
                              fontWeight: 600,
                            }}
                          >
                            {cert}
                          </span>
                        ))}
                      </div>
                    )}
                </div>

                {supplier.service_radius && (
                  <div
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#f0fdf4",
                      borderRadius: "6px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginBottom: "2px",
                      }}
                    >
                      Service Radius
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "#059669",
                      }}
                    >
                      {supplier.service_radius} mi
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
