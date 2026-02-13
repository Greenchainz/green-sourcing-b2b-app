/**
 * Azure Maps Client with Managed Identity Authentication
 * 
 * Uses DefaultAzureCredential to get access tokens for Azure Maps API
 * Eliminates the need for AZURE_MAPS_SUBSCRIPTION_KEY in environment variables
 */
import { DefaultAzureCredential } from '@azure/identity';

// ============================================================================
// CONFIGURATION
// ============================================================================

const AZURE_MAPS_CLIENT_ID = process.env.AZURE_MAPS_CLIENT_ID || 'greencahinz-maps';
const AZURE_MAPS_SCOPE = 'https://atlas.microsoft.com/.default';

// ============================================================================
// MANAGED IDENTITY AUTHENTICATION
// ============================================================================

/**
 * Get Azure Maps access token using managed identity
 * Tokens are valid for 1 hour
 */
export async function getAzureMapsAccessToken(): Promise<string> {
  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken(AZURE_MAPS_SCOPE);
  return tokenResponse.token;
}

/**
 * Make authenticated request to Azure Maps REST API
 * 
 * @param endpoint - Azure Maps API endpoint (e.g., '/search/address/json')
 * @param params - Query parameters
 * @returns API response
 */
export async function makeAzureMapsRequest<T = any>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const token = await getAzureMapsAccessToken();
  
  const url = new URL(`https://atlas.microsoft.com${endpoint}`);
  url.searchParams.append('api-version', '1.0');
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-ms-client-id': AZURE_MAPS_CLIENT_ID,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Azure Maps API error: ${response.statusText}`);
  }
  
  return response.json();
}

// ============================================================================
// COMMON AZURE MAPS OPERATIONS
// ============================================================================

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(address: string): Promise<{
  latitude: number;
  longitude: number;
  formattedAddress: string;
}> {
  const result = await makeAzureMapsRequest('/search/address/json', {
    query: address,
  });
  
  const firstResult = result.results?.[0];
  if (!firstResult) {
    throw new Error('No results found for address');
  }
  
  return {
    latitude: firstResult.position.lat,
    longitude: firstResult.position.lon,
    formattedAddress: firstResult.address.freeformAddress,
  };
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<{
  formattedAddress: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}> {
  const result = await makeAzureMapsRequest('/search/address/reverse/json', {
    query: `${latitude},${longitude}`,
  });
  
  const address = result.addresses?.[0]?.address;
  if (!address) {
    throw new Error('No address found for coordinates');
  }
  
  return {
    formattedAddress: address.freeformAddress,
    city: address.municipality,
    state: address.countrySubdivision,
    country: address.country,
    postalCode: address.postalCode,
  };
}

/**
 * Calculate distance and route between two points
 */
export async function calculateRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<{
  distanceMeters: number;
  durationSeconds: number;
  coordinates: Array<{ latitude: number; longitude: number }>;
}> {
  const result = await makeAzureMapsRequest('/route/directions/json', {
    query: `${origin.latitude},${origin.longitude}:${destination.latitude},${destination.longitude}`,
  });
  
  const route = result.routes?.[0];
  if (!route) {
    throw new Error('No route found');
  }
  
  return {
    distanceMeters: route.summary.lengthInMeters,
    durationSeconds: route.summary.travelTimeInSeconds,
    coordinates: route.legs[0].points.map((p: any) => ({
      latitude: p.latitude,
      longitude: p.longitude,
    })),
  };
}

/**
 * Search for nearby places
 */
export async function searchNearby(
  latitude: number,
  longitude: number,
  query: string,
  radiusMeters: number = 5000
): Promise<Array<{
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
}>> {
  const result = await makeAzureMapsRequest('/search/nearby/json', {
    lat: latitude.toString(),
    lon: longitude.toString(),
    query,
    radius: radiusMeters.toString(),
  });
  
  return (result.results || []).map((r: any) => ({
    name: r.poi?.name || r.address.freeformAddress,
    address: r.address.freeformAddress,
    latitude: r.position.lat,
    longitude: r.position.lon,
    distanceMeters: r.dist,
  }));
}
