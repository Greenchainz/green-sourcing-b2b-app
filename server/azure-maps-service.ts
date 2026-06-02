import axios from "axios";
import { getAzureCredential, isCredentialConfigured } from "../lib/azure/credentials";

const AZURE_MAPS_SUBSCRIPTION_KEY = process.env.AZURE_MAPS_SUBSCRIPTION_KEY || "";
const AZURE_MAPS_CLIENT_ID = process.env.AZURE_MAPS_CLIENT_ID || "";
const AZURE_MAPS_BASE_URL = "https://atlas.microsoft.com";
const AZURE_MAPS_SCOPE = "https://atlas.microsoft.com/.default";
const ALLOW_MAPS_KEY_IN_PROD = process.env.ALLOW_AZURE_MAPS_SUBSCRIPTION_KEY_IN_PROD === "true";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DistanceResult {
  distanceMiles: number;
  durationMinutes: number;
}

interface AzureMapsAuth {
  headers: Record<string, string>;
  keyParam?: string;
}

async function getAzureMapsAuth(): Promise<AzureMapsAuth | null> {
  if (AZURE_MAPS_CLIENT_ID && isCredentialConfigured()) {
    try {
      const token = await getAzureCredential().getToken(AZURE_MAPS_SCOPE);
      if (token?.token) {
        return {
          headers: {
            Authorization: `Bearer ${token.token}`,
            "x-ms-client-id": AZURE_MAPS_CLIENT_ID,
          },
        };
      }
    } catch (error) {
      console.warn("[Azure Maps] Managed identity authentication failed:", error);
    }
  }

  if (AZURE_MAPS_SUBSCRIPTION_KEY) {
    if (!IS_PRODUCTION || ALLOW_MAPS_KEY_IN_PROD) {
      return {
        headers: {},
        keyParam: AZURE_MAPS_SUBSCRIPTION_KEY,
      };
    }

    console.error(
      "[Azure Maps] Subscription-key auth is blocked in production. " +
      "Use managed identity (AZURE_MAPS_CLIENT_ID + AZURE_MI_CLIENT_ID) or set " +
      "ALLOW_AZURE_MAPS_SUBSCRIPTION_KEY_IN_PROD=true as an emergency override."
    );
  }

  return null;
}

/**
 * Geocode an address to coordinates using Azure Maps Search API
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const auth = await getAzureMapsAuth();
  if (!auth) {
    console.warn("Azure Maps authentication is not configured");
    return null;
  }

  if (!address || address.trim() === "") {
    return null;
  }

  try {
    const response = await axios.get(`${AZURE_MAPS_BASE_URL}/search/address/json`, {
      params: {
        "api-version": "1.0",
        query: address,
        limit: 1,
        ...(auth.keyParam ? { "subscription-key": auth.keyParam } : {}),
      },
      headers: auth.headers,
    });

    const results = response.data?.results;
    if (!results || results.length === 0) {
      console.warn(`No geocoding results for address: ${address}`);
      return null;
    }

    const position = results[0].position;
    return {
      latitude: position.lat,
      longitude: position.lon,
    };
  } catch (error) {
    console.error("Azure Maps geocoding error:", error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates using Azure Maps Distance Matrix API
 */
export async function calculateDistance(
  origin: Coordinates,
  destination: Coordinates
): Promise<DistanceResult | null> {
  const auth = await getAzureMapsAuth();
  if (!auth) {
    console.warn("Azure Maps authentication is not configured");
    return calculateHaversineDistance(origin, destination);
  }

  try {
    const response = await axios.post(
      `${AZURE_MAPS_BASE_URL}/route/matrix/json`,
      {
        origins: {
          type: "MultiPoint",
          coordinates: [[origin.longitude, origin.latitude]],
        },
        destinations: {
          type: "MultiPoint",
          coordinates: [[destination.longitude, destination.latitude]],
        },
      },
      {
        params: {
          "api-version": "1.0",
          ...(auth.keyParam ? { "subscription-key": auth.keyParam } : {}),
        },
        headers: auth.headers,
      }
    );

    const matrix = response.data?.matrix;
    if (!matrix || matrix.length === 0 || !matrix[0] || matrix[0].length === 0) {
      console.warn("No distance matrix results, falling back to haversine");
      return calculateHaversineDistance(origin, destination);
    }

    const result = matrix[0][0].response;
    const distanceMeters = result.routeSummary.lengthInMeters;
    const durationSeconds = result.routeSummary.travelTimeInSeconds;

    return {
      distanceMiles: metersToMiles(distanceMeters),
      durationMinutes: Math.round(durationSeconds / 60),
    };
  } catch (error) {
    console.error("Azure Maps distance calculation error:", error);
    return calculateHaversineDistance(origin, destination);
  }
}

/**
 * Fallback: Calculate straight-line distance using Haversine formula
 */
function calculateHaversineDistance(
  origin: Coordinates,
  destination: Coordinates
): DistanceResult {
  const R = 3958.8; // Earth radius in miles
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);
  const deltaLat = toRadians(destination.latitude - origin.latitude);
  const deltaLon = toRadians(destination.longitude - origin.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMiles = R * c;

  // Estimate duration: assume average speed of 45 mph
  const durationMinutes = Math.round((distanceMiles / 45) * 60);

  return {
    distanceMiles: Math.round(distanceMiles * 10) / 10, // Round to 1 decimal
    durationMinutes,
  };
}

/**
 * Helper: Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Helper: Convert meters to miles
 */
function metersToMiles(meters: number): number {
  return Math.round((meters * 0.000621371) * 10) / 10; // Round to 1 decimal
}

/**
 * Get distance-based match score (0-20 points)
 * - 0-25 miles: 20 points
 * - 25-50 miles: 15 points
 * - 50-100 miles: 10 points
 * - 100-250 miles: 5 points
 * - 250+ miles: 2 points
 */
export function getDistanceScore(distanceMiles: number): number {
  if (distanceMiles <= 25) return 20;
  if (distanceMiles <= 50) return 15;
  if (distanceMiles <= 100) return 10;
  if (distanceMiles <= 250) return 5;
  return 2;
}


export interface RouteResult {
  distanceMiles: number;
  durationMinutes: number;
  polyline: string; // Encoded polyline for map visualization
}

/**
 * Calculate route with polyline for visualization
 */
export async function calculateRoute(
  origin: Coordinates,
  destination: Coordinates
): Promise<RouteResult | null> {
  const auth = await getAzureMapsAuth();
  if (!auth) {
    console.warn("Azure Maps authentication is not configured");
    return null;
  }

  try {
    const response = await axios.get(`${AZURE_MAPS_BASE_URL}/route/directions/json`, {
      params: {
        "api-version": "1.0",
        query: `${origin.latitude},${origin.longitude}:${destination.latitude},${destination.longitude}`,
        ...(auth.keyParam ? { "subscription-key": auth.keyParam } : {}),
      },
      headers: auth.headers,
    });

    const routes = response.data?.routes;
    if (!routes || routes.length === 0) {
      console.warn("No route found");
      return null;
    }

    const route = routes[0];
    const summary = route.summary;
    const legs = route.legs;

    // Extract polyline points from route legs
    const points: [number, number][] = [];
    for (const leg of legs) {
      for (const point of leg.points) {
        points.push([point.longitude, point.latitude]);
      }
    }

    // Simple polyline encoding (Azure Maps uses GeoJSON LineString format)
    const polyline = JSON.stringify({
      type: "LineString",
      coordinates: points,
    });

    return {
      distanceMiles: metersToMiles(summary.lengthInMeters),
      durationMinutes: Math.round(summary.travelTimeInSeconds / 60),
      polyline,
    };
  } catch (error) {
    console.error("Azure Maps route calculation error:", error);
    return null;
  }
}
