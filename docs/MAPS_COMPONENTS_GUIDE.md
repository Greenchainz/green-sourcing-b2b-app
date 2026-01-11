# Azure Maps Supplier Location Components Guide

## Overview

React components for displaying supplier locations on Azure Maps with markers, distance calculations, and service radius visualization.

## Components

### 1. SupplierMap

Main component for displaying suppliers on an interactive Azure Maps map.

**Location:** `app/components/maps/SupplierMap.tsx`

**Props:**

```typescript
interface SupplierMapProps {
  suppliers: SupplierLocation[];          // Suppliers to display
  center?: { latitude: number; longitude: number }; // Map center (optional)
  zoom?: number;                          // Zoom level (default: 10)
  showDistance?: boolean;                 // Show distance labels (default: true)
  height?: string;                        // Map height (default: "500px")
  onSupplierClick?: (supplier: SupplierLocation) => void; // Click handler
  showServiceRadius?: boolean;            // Show service radius circles (default: false)
  markerColor?: string;                   // Marker color (default: "#10b981")
}
```

**Example Usage:**

```tsx
import SupplierMap, { SupplierLocation } from "@/components/maps/SupplierMap";

const suppliers: SupplierLocation[] = [
  {
    id: 1,
    name: "Eco Materials Inc",
    city: "San Francisco",
    state: "CA",
    latitude: 37.7749,
    longitude: -122.4194,
    distance_miles: 5.2,
    service_radius: 50,
    certifications: ["LEED", "EPD"],
  },
];

function MyComponent() {
  return (
    <SupplierMap
      suppliers={suppliers}
      showDistance={true}
      showServiceRadius={true}
      height="600px"
      onSupplierClick={(supplier) => {
        console.log("Selected supplier:", supplier);
      }}
    />
  );
}
```

### 2. SupplierMarker

Standalone marker component for displaying supplier locations in custom map implementations or lists.

**Location:** `app/components/maps/SupplierMarker.tsx`

**Props:**

```typescript
interface SupplierMarkerProps {
  supplier: SupplierLocation;             // Supplier data
  size?: "small" | "medium" | "large";    // Marker size (default: "medium")
  showDistance?: boolean;                 // Show distance badge (default: true)
  showCertifications?: boolean;           // Show certifications badge (default: false)
  color?: string;                         // Custom marker color
  onClick?: () => void;                   // Click handler
}
```

**Example Usage:**

```tsx
import SupplierMarker from "@/components/maps/SupplierMarker";

function SupplierCard({ supplier }) {
  return (
    <div>
      <SupplierMarker
        supplier={supplier}
        size="medium"
        showDistance={true}
        showCertifications={true}
        onClick={() => console.log("Clicked", supplier.name)}
      />
    </div>
  );
}
```

### 3. SupplierMapList

Combined map and list view for displaying suppliers with toggle between map and list views.

**Location:** `app/components/maps/SupplierMapList.tsx`

**Props:**

```typescript
interface SupplierMapListProps {
  suppliers: SupplierLocation[];          // Suppliers to display
  defaultView?: "map" | "list";           // Default view (default: "map")
  showDistance?: boolean;                 // Show distance in list view (default: true)
  showCertifications?: boolean;           // Show certifications in list view (default: true)
  onSupplierSelect?: (supplier: SupplierLocation) => void; // Selection handler
  mapHeight?: string;                     // Map height (default: "500px")
  showServiceRadius?: boolean;            // Show service radius on map (default: false)
}
```

**Example Usage:**

```tsx
import SupplierMapList from "@/components/maps/SupplierMapList";

function SuppliersPage() {
  const suppliers = [...]; // Your supplier data

  return (
    <SupplierMapList
      suppliers={suppliers}
      defaultView="map"
      showDistance={true}
      showCertifications={true}
      mapHeight="600px"
      showServiceRadius={true}
      onSupplierSelect={(supplier) => {
        // Handle supplier selection
        router.push(`/suppliers/${supplier.id}`);
      }}
    />
  );
}
```

## Data Types

### SupplierLocation

```typescript
interface SupplierLocation {
  id: number;                             // Unique supplier ID
  name: string;                           // Supplier name
  email?: string;                         // Supplier email (optional)
  city?: string;                          // City (optional)
  state?: string;                         // State (optional)
  latitude: number;                       // Latitude (required)
  longitude: number;                      // Longitude (required)
  distance_miles?: number;                // Distance in miles (optional)
  service_radius?: number;                // Service radius in miles (optional)
  certifications?: string[];              // Certifications array (optional)
}
```

## Setup

### 1. Environment Variables

Add Azure Maps subscription key to your environment variables:

```bash
# .env.local
NEXT_PUBLIC_AZURE_MAPS_KEY=your_azure_maps_key_here
```

### 2. Get Azure Maps Key

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Azure Maps account (or create one)
3. Go to "Authentication" → "Subscription keys"
4. Copy the "Primary key" or "Secondary key"
5. Add it to your `.env.local` file

### 3. Install Dependencies

No additional npm packages required! The components use the Azure Maps web SDK loaded dynamically.

## Features

### ✅ Interactive Map
- Pan and zoom
- Click markers to view supplier details
- Responsive design

### ✅ Distance Display
- Shows distance in miles for each supplier
- Calculated from center point or RFQ location

### ✅ Service Radius Visualization
- Optional circles showing supplier service radius
- Helps visualize coverage areas

### ✅ List View
- Toggle between map and list views
- Sort by distance
- Display supplier details, certifications, and service radius

### ✅ Customizable
- Custom marker colors
- Configurable map height
- Optional distance/certification badges

## Integration Examples

### Example 1: RFQ Supplier Matching

Display suppliers matched to an RFQ:

```tsx
"use client";

import { useEffect, useState } from "react";
import SupplierMapList from "@/components/maps/SupplierMapList";
import { SupplierLocation } from "@/components/maps/SupplierMap";

export default function RFQSuppliersPage({ rfqId }: { rfqId: string }) {
  const [suppliers, setSuppliers] = useState<SupplierLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSuppliers() {
      try {
        const response = await fetch(`/api/v1/rfqs/${rfqId}/suppliers`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await response.json();
        setSuppliers(data.suppliers);
      } catch (error) {
        console.error("Failed to fetch suppliers:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSuppliers();
  }, [rfqId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Matched Suppliers</h1>
      <SupplierMapList
        suppliers={suppliers}
        defaultView="map"
        showDistance={true}
        showCertifications={true}
        showServiceRadius={true}
      />
    </div>
  );
}
```

### Example 2: Supplier Search with Map

Search suppliers and display on map:

```tsx
"use client";

import { useState } from "react";
import SupplierMap from "@/components/maps/SupplierMap";
import { SupplierLocation } from "@/components/maps/SupplierMap";

export default function SupplierSearchPage() {
  const [suppliers, setSuppliers] = useState<SupplierLocation[]>([]);
  const [searchLocation, setSearchLocation] = useState("");

  const handleSearch = async () => {
    try {
      const response = await fetch(
        `/api/v1/suppliers/nearby?address=${encodeURIComponent(searchLocation)}&radius=50`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();
      setSuppliers(data.data.suppliers);
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <input
          type="text"
          value={searchLocation}
          onChange={(e) => setSearchLocation(e.target.value)}
          placeholder="Enter location (e.g., San Francisco, CA)"
          className="px-4 py-2 border rounded-lg"
        />
        <button
          onClick={handleSearch}
          className="ml-4 px-6 py-2 bg-emerald-600 text-white rounded-lg"
        >
          Search
        </button>
      </div>

      {suppliers.length > 0 && (
        <SupplierMap
          suppliers={suppliers}
          showDistance={true}
          showServiceRadius={true}
          height="600px"
        />
      )}
    </div>
  );
}
```

## Styling

The components use inline styles for flexibility. To customize:

1. **Custom CSS Classes:** Add classes via `className` prop (if supported)
2. **Inline Styles:** Components accept style objects
3. **Global CSS:** Override default styles in `app/globals.css`

Example custom styling:

```css
/* app/globals.css */
.gc-supplier-map {
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.gc-supplier-marker {
  transition: transform 0.2s;
}

.gc-supplier-marker:hover {
  transform: scale(1.1);
}
```

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## Troubleshooting

### Map not loading

1. **Check Azure Maps Key:**
   ```bash
   echo $NEXT_PUBLIC_AZURE_MAPS_KEY
   ```

2. **Check Browser Console:**
   - Look for Azure Maps SDK loading errors
   - Check for authentication errors

3. **Verify Key Permissions:**
   - Ensure key has "Render" and "Search" permissions
   - Check key is not expired

### Markers not appearing

1. **Verify coordinates:**
   - Latitude: -90 to 90
   - Longitude: -180 to 180

2. **Check data format:**
   - Ensure `suppliers` array is not empty
   - Verify all suppliers have `latitude` and `longitude`

### Performance issues

1. **Limit suppliers:**
   - Display max 50-100 suppliers at once
   - Implement pagination for large datasets

2. **Optimize updates:**
   - Use React `useMemo` for expensive calculations
   - Debounce map updates

## API Integration

These components work with the following API endpoints:

- `GET /api/v1/suppliers/nearby` - Find suppliers near a location
- `GET /api/v1/rfqs/:id` - Get RFQ with matched suppliers
- `GET /api/v1/rfqs/list` - List RFQs with supplier matches

## Next Steps

1. ✅ Add components to your project
2. ✅ Configure Azure Maps key
3. ✅ Test with sample data
4. ✅ Integrate with API endpoints
5. ✅ Customize styling
6. ✅ Add error handling
7. ✅ Implement analytics tracking

---

**Last Updated:** January 8, 2025
