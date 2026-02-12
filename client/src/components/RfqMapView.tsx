import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { MapPin, Navigation } from "lucide-react";

interface RfqLocation {
  id: number;
  projectName: string;
  latitude: number;
  longitude: number;
  distanceMiles?: number | null;
}

interface RfqMapViewProps {
  rfqs: RfqLocation[];
  supplierLocation?: { latitude: number; longitude: number } | null;
  radiusFilter?: number | null; // In miles
  onRfqClick?: (rfqId: number) => void;
}

export function RfqMapView({ rfqs, supplierLocation, radiusFilter, onRfqClick }: RfqMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load Azure Maps SDK
    const loadAzureMaps = async () => {
      try {
        // Check if Azure Maps is already loaded
        if ((window as any).atlas) {
          initializeMap();
          return;
        }

        // Load Azure Maps CSS
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.css";
        document.head.appendChild(link);

        // Load Azure Maps JS
        const script = document.createElement("script");
        script.src = "https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.js";
        script.async = true;
        script.onload = () => {
          initializeMap();
        };
        script.onerror = () => {
          setError("Failed to load Azure Maps SDK");
          setIsLoading(false);
        };
        document.head.appendChild(script);
      } catch (err) {
        setError("Error initializing map");
        setIsLoading(false);
      }
    };

    const initializeMap = () => {
      if (!mapRef.current) return;

      const atlas = (window as any).atlas;
      
      // Get Azure Maps key from environment (injected via Manus proxy)
      const subscriptionKey = import.meta.env.VITE_AZURE_MAPS_KEY || "YOUR_AZURE_MAPS_KEY";

      // Calculate center point (supplier location or first RFQ)
      let center: [number, number] = [-98.5795, 39.8283]; // US center default
      if (supplierLocation) {
        center = [supplierLocation.longitude, supplierLocation.latitude];
      } else if (rfqs.length > 0 && rfqs[0].latitude && rfqs[0].longitude) {
        center = [rfqs[0].longitude, rfqs[0].latitude];
      }

      // Initialize map
      const newMap = new atlas.Map(mapRef.current, {
        center,
        zoom: 6,
        language: "en-US",
        authOptions: {
          authType: "subscriptionKey",
          subscriptionKey,
        },
        style: "road",
      });

      newMap.events.add("ready", () => {
        // Add data source for markers
        const dataSource = new atlas.source.DataSource();
        newMap.sources.add(dataSource);

        // Add supplier marker (if available)
        if (supplierLocation) {
          const supplierPoint = new atlas.data.Point([
            supplierLocation.longitude,
            supplierLocation.latitude,
          ]);
          const supplierMarker = new atlas.data.Feature(supplierPoint, {
            type: "supplier",
            title: "Your Location",
          });
          dataSource.add(supplierMarker);

          // Add radius circle if filter is active
          if (radiusFilter) {
            const radiusMeters = radiusFilter * 1609.34; // Convert miles to meters
            const circle = new atlas.data.Feature(
              new atlas.data.Point([supplierLocation.longitude, supplierLocation.latitude]),
              {
                subType: "Circle",
                radius: radiusMeters,
              }
            );
            dataSource.add(circle);

            // Add circle layer
            newMap.layers.add(
              new atlas.layer.PolygonLayer(dataSource, null, {
                filter: ["==", ["get", "subType"], "Circle"],
                fillColor: "rgba(34, 197, 94, 0.1)",
                fillOpacity: 0.5,
              })
            );
          }
        }

        // Add RFQ markers
        rfqs.forEach((rfq) => {
          if (rfq.latitude && rfq.longitude) {
            const rfqPoint = new atlas.data.Point([rfq.longitude, rfq.latitude]);
            const rfqMarker = new atlas.data.Feature(rfqPoint, {
              type: "rfq",
              rfqId: rfq.id,
              title: rfq.projectName,
              distance: rfq.distanceMiles,
            });
            dataSource.add(rfqMarker);
          }
        });

        // Add symbol layer for supplier
        newMap.layers.add(
          new atlas.layer.SymbolLayer(dataSource, null, {
            filter: ["==", ["get", "type"], "supplier"],
            iconOptions: {
              image: "pin-blue",
              size: 0.8,
              anchor: "center",
            },
            textOptions: {
              textField: ["get", "title"],
              offset: [0, 1.5],
              color: "#1e40af",
              size: 12,
            },
          })
        );

        // Add symbol layer for RFQs
        newMap.layers.add(
          new atlas.layer.SymbolLayer(dataSource, null, {
            filter: ["==", ["get", "type"], "rfq"],
            iconOptions: {
              image: "pin-red",
              size: 0.6,
              anchor: "center",
            },
            textOptions: {
              textField: [
                "concat",
                ["get", "title"],
                " (",
                ["to-string", ["get", "distance"]],
                " mi)",
              ],
              offset: [0, 1.2],
              color: "#dc2626",
              size: 11,
            },
          })
        );

        // Add click event for RFQ markers
        newMap.events.add("click", (e: any) => {
          const features = newMap.layers.getRenderedShapes(e.position, ["rfq-layer"]);
          if (features.length > 0) {
            const rfqId = features[0].properties.rfqId;
            if (onRfqClick) {
              onRfqClick(rfqId);
            }
          }
        });

        // Fit map to show all markers
        if (dataSource.getShapes().length > 0) {
          const bounds = atlas.data.BoundingBox.fromData(dataSource.toJson());
          newMap.setCamera({
            bounds,
            padding: 50,
          });
        }

        setIsLoading(false);
      });

      setMap(newMap);
    };

    loadAzureMaps();

    return () => {
      if (map) {
        map.dispose();
      }
    };
  }, [rfqs, supplierLocation, radiusFilter]);

  if (error) {
    return (
      <Card className="p-8 text-center">
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">{error}</p>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-[500px]" />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          <span className="text-gray-700">Your Location</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-600 rounded-full"></div>
          <span className="text-gray-700">RFQ Project Sites</span>
        </div>
        {radiusFilter && (
          <div className="flex items-center gap-2">
            <Navigation className="w-3 h-3 text-green-600" />
            <span className="text-gray-700">{radiusFilter} mile radius</span>
          </div>
        )}
      </div>
    </Card>
  );
}
