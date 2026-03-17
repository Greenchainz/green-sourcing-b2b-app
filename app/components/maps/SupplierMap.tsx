"use client";

import React, { useEffect, useRef, useState } from "react";

// Azure Maps type definitions
interface AzureMapEvent {
  shapes?: { getProperties: () => Record<string, unknown> }[];
  position?: [number, number];
}

// Minimal Azure Maps types to satisfy TS without the SDK typings installed
interface AzureMapsNamespace {
  Map: new (
    container: HTMLDivElement,
    options: {
      authOptions: { authType: string; subscriptionKey: string };
      center: [number, number];
      zoom: number;
      style: string;
      language: string;
      view: string;
    }
  ) => AzureMap;
  AuthenticationType: { subscriptionKey: string };
  source: { DataSource: new () => AzureDataSource };
  layer: { SymbolLayer: new (source: AzureDataSource, id: string | null, opts: unknown) => unknown };
  data: {
    Point: new (coords: [number, number]) => unknown;
    Feature: new (geom: unknown, properties?: Record<string, unknown>) => unknown;
    Polygon: new (rings: unknown) => unknown;
    BoundingBox: { fromData: (source: AzureDataSource) => unknown };
  };
  math: { getCircleCoordinates: (center: [number, number], radiusKm: number, points: number) => unknown };
  Popup: new (opts: unknown) => { setOptions: (opts: unknown) => void; open: (map: AzureMap) => void };
}

interface AzureMap {
  dispose?: () => void;
  layers: {
    add: (layer: unknown) => void;
  };
  sources: {
    add: (source: AzureDataSource) => void;
  };
  events: {
    add: (event: string, layerOrHandler: unknown, handler?: (e: AzureMapEvent) => void) => void;
  };
  setCamera: (options: { center?: [number, number]; zoom?: number; bounds?: unknown; padding?: number }) => void;
}

interface AzureDataSource {
  clear: () => void;
  add: (feature: unknown) => void;
}

/**
 * Supplier Location Data
 */
export interface SupplierLocation {
  id: number;
  name: string;
  email?: string;
  city?: string;
  state?: string;
  latitude: number;
  longitude: number;
  distance_miles?: number;
  service_radius?: number;
  certifications?: string[];
}

/**
 * SupplierMap Component Props
 */
interface SupplierMapProps {
  /**
   * Suppliers to display on the map
   */
  suppliers: SupplierLocation[];

  /**
   * Center point of the map (defaults to first supplier or San Francisco)
   */
  center?: {
    latitude: number;
    longitude: number;
  };

  /**
   * Zoom level (default: 10)
   */
  zoom?: number;

  /**
   * Show distance labels
   */
  showDistance?: boolean;

  /**
   * Height of the map (default: "500px")
   */
  height?: string;

  /**
   * Callback when a supplier marker is clicked
   */
  onSupplierClick?: (supplier: SupplierLocation) => void;

  /**
   * Show supplier service radius circles
   */
  showServiceRadius?: boolean;

  /**
   * Custom marker color (default: "#10b981" - emerald)
   */
  markerColor?: string;
}

/**
 * SupplierMap Component
 *
 * Displays suppliers on an Azure Maps interactive map with markers,
 * distance calculations, and service radius visualization.
 */
export default function SupplierMap({
  suppliers,
  center,
  zoom = 10,
  showDistance = true,
  height = "500px",
  onSupplierClick,
  showServiceRadius = false,
  markerColor = "#10b981",
}: SupplierMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AzureMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<unknown[]>([]);
  const datasourceRef = useRef<AzureDataSource | null>(null);

  useEffect(() => {
    // Load Azure Maps SDK
    const script = document.createElement("script");
    script.src =
      "https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.js";
    script.async = true;
    script.onload = initializeMap;
    script.onerror = () => setError("Failed to load Azure Maps SDK");

    // Load CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.css";

    document.head.appendChild(link);
    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (mapRef.current?.dispose) {
        mapRef.current.dispose();
      }
      document.body.removeChild(script);
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && suppliers.length > 0) {
      updateMarkers();
    }
  }, [suppliers, showDistance, showServiceRadius, markerColor]);

  const initializeMap = () => {
    if (!mapContainerRef.current) return;

    try {
      const azureMaps = (window as Window & { atlas?: AzureMapsNamespace }).atlas;
      if (!azureMaps) {
        setError("Azure Maps SDK not loaded");
        return;
      }

      // Get Azure Maps key from environment or API
      const subscriptionKey = process.env.NEXT_PUBLIC_AZURE_MAPS_KEY || "";

      if (!subscriptionKey) {
        setError("Azure Maps subscription key not configured");
        setIsLoading(false);
        return;
      }

      // Calculate center point
      const mapCenter = center || calculateCenter(suppliers);

      // Initialize map
      mapRef.current = new azureMaps.Map(mapContainerRef.current, {
        authOptions: {
          authType: azureMaps.AuthenticationType.subscriptionKey,
          subscriptionKey: subscriptionKey,
        },
        center: [mapCenter.longitude, mapCenter.latitude],
        zoom: zoom,
        style: "road",
        language: "en-US",
        view: "Auto",
      });

      const mapInstance = mapRef.current;

      // Wait for map to be ready
      mapInstance.events.add("ready", () => {
        // Create data source for markers
        datasourceRef.current = new azureMaps.source.DataSource();
        mapInstance.sources.add(datasourceRef.current);

        // Add markers layer
        const markerLayer = new azureMaps.layer.SymbolLayer(
          datasourceRef.current,
          null,
          {
            iconOptions: {
              image: "pin-round-blue",
              size: 0.5,
            },
            textOptions: {
              textField: ["get", "name"],
              offset: [0, 1.2],
              color: "#333",
              fontSize: 12,
            },
          }
        );

        mapInstance.layers.add(markerLayer);

        // Add popup
        const popup = new azureMaps.Popup({
          pixelOffset: [0, -18],
          closeButton: false,
        });

        // Handle marker click
        mapInstance.events.add("click", markerLayer, (e: AzureMapEvent) => {
          if (e.shapes && e.shapes.length > 0) {
            const shape = e.shapes[0];
            const supplier = shape.getProperties() as unknown as SupplierLocation;

            popup.setOptions({
              position: e.position,
              content: createPopupContent(supplier),
            });
            popup.open(mapInstance);

            if (onSupplierClick) {
              onSupplierClick(supplier);
            }
          }
        });

        updateMarkers();
        setIsLoading(false);
      });
    } catch (err: unknown) {
      console.error("Map initialization error:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize map");
      setIsLoading(false);
    }
  };

  const calculateCenter = (suppliers: SupplierLocation[]) => {
    if (suppliers.length === 0) {
      return { latitude: 37.7749, longitude: -122.4194 }; // San Francisco default
    }

    if (suppliers.length === 1) {
      return {
        latitude: suppliers[0].latitude,
        longitude: suppliers[0].longitude,
      };
    }

    // Calculate average center
    const sum = suppliers.reduce(
      (acc, supplier) => ({
        latitude: acc.latitude + supplier.latitude,
        longitude: acc.longitude + supplier.longitude,
      }),
      { latitude: 0, longitude: 0 }
    );

    return {
      latitude: sum.latitude / suppliers.length,
      longitude: sum.longitude / suppliers.length,
    };
  };

  const updateMarkers = () => {
    if (!mapRef.current || !datasourceRef.current) return;

    const mapInstance = mapRef.current;
    const datasource = datasourceRef.current;

    const azureMaps = (window as Window & { atlas?: AzureMapsNamespace }).atlas;
    if (!azureMaps) return;

    // Clear existing markers
    datasourceRef.current.clear();
    markersRef.current = [];

    // Add suppliers as markers
    suppliers.forEach((supplier) => {
      const point = new azureMaps.data.Point([
        supplier.longitude,
        supplier.latitude,
      ]);

      const properties: Record<string, unknown> = {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        city: supplier.city,
        state: supplier.state,
        distance_miles: supplier.distance_miles,
        service_radius: supplier.service_radius,
        certifications: supplier.certifications,
      };

      const feature = new azureMaps.data.Feature(point, properties);
      datasource.add(feature);

      // Add service radius circle if enabled
      if (showServiceRadius && supplier.service_radius) {
        const radiusKm = supplier.service_radius * 1.60934; // Convert miles to km
        const circle = azureMaps.math.getCircleCoordinates(
          [supplier.longitude, supplier.latitude],
          radiusKm,
          64
        );
        const circleFeature = new azureMaps.data.Feature(
          new azureMaps.data.Polygon([circle]),
          { supplierId: supplier.id, type: "serviceRadius" }
        );
        datasource.add(circleFeature);
      }
    });

    // Fit map to bounds if multiple suppliers
    if (suppliers.length > 1) {
      const bounds = azureMaps.data.BoundingBox.fromData(datasource);
      mapInstance.setCamera({
        bounds: bounds,
        padding: 50,
      });
    }
  };

  const createPopupContent = (supplier: SupplierLocation) => {
    return `
      <div style="padding: 12px; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827;">
          ${supplier.name}
        </h3>
        ${supplier.city && supplier.state
        ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
              ${supplier.city}, ${supplier.state}
            </p>`
        : ""
      }
        ${supplier.distance_miles !== undefined && showDistance
        ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #059669; font-weight: 600;">
              ${supplier.distance_miles.toFixed(1)} miles away
            </p>`
        : ""
      }
        ${supplier.service_radius
        ? `<p style="margin: 0; font-size: 12px; color: #6b7280;">
              Service radius: ${supplier.service_radius} miles
            </p>`
        : ""
      }
      </div>
    `;
  };

  if (error) {
    return (
      <div
        className="gc-map-error"
        style={{ height }}
      >
        <div className="gc-map-error-content">
          <p className="gc-map-error-title">Map Error</p>
          <p className="gc-map-error-message">{error}</p>
        </div>
        <style jsx>{`
          .gc-map-error {
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            color: #dc2626;
          }
          .gc-map-error-content {
            text-align: center;
          }
          .gc-map-error-title {
            margin: 0;
            font-weight: 600;
          }
          .gc-map-error-message {
            margin: 4px 0 0 0;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="gc-supplier-map" style={{ height }}>
      {isLoading && (
        <div className="gc-map-loading">
          <div className="gc-map-loading-content">
            <div className="gc-map-spinner" />
            <p className="gc-map-loading-text">Loading map...</p>
          </div>
        </div>
      )}
      <div
        ref={mapContainerRef}
        className="gc-map-container"
      />
      <style jsx>{`
        .gc-supplier-map {
          position: relative;
        }
        .gc-map-container {
          width: 100%;
          height: 100%;
          border-radius: 8px;
          overflow: hidden;
        }
        .gc-map-loading {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f9fafb;
          z-index: 1000;
        }
        .gc-map-loading-content {
          text-align: center;
        }
        .gc-map-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #10b981;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 8px;
        }
        .gc-map-loading-text {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
