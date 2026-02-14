/**
 * EC3 (Building Transparency) API Service
 * 
 * Provides access to EPD (Environmental Product Declaration) data for material carbon footprints.
 * Uses OAuth2 Resource Owner Password Credentials grant type for authentication.
 */

import { ENV } from "./_core/env";

const EC3_BASE_URL = "https://buildingtransparency.org/api";

interface EC3AuthResponse {
  key: string; // Bearer token
  last_login: string;
}

export interface EC3EPD {
  id: string;
  open_xpd_uuid: string;
  name?: string;
  gwp: string; // e.g., "339 kgCO2e"
  gwp_z: number;
  conservative_estimate: string;
  best_practice: string;
  declared_unit?: string;
  mass_per_declared_unit?: string;
  date_of_issue: string;
  date_validity_ends: string;
  category: {
    id: string;
    name: string;
    display_name: string;
    masterformat?: string;
    declared_unit: string;
    pct50_gwp: string; // Industry median
  };
  manufacturer?: {
    name: string;
    id: string;
  };
  plant?: {
    name: string;
    id: string;
    address_line?: string;
    locality?: string;
    admin_district?: string;
    postal_code?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  impacts?: Record<string, any>;
  lca_discussion?: string;
  doc?: string; // URL to full EPD document
  externally_verified: boolean;
}

interface EC3EPDListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: EC3EPD[];
}

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Authenticate with EC3 using OAuth2 password grant
 * Returns a Bearer token for subsequent API requests
 */
async function authenticate(): Promise<string> {
  // Return cached token if still valid (tokens typically last 24 hours)
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch(`${EC3_BASE_URL}/rest-auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: ENV.ec3Username,
      password: ENV.ec3Password,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EC3 authentication failed (${response.status}): ${errorText}`);
  }

  const data: EC3AuthResponse = await response.json();
  cachedToken = data.key;
  // Cache token for 23 hours (tokens typically last 24 hours)
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;

  return cachedToken;
}

/**
 * Fetch EPDs from EC3 API
 * @param category Optional material category filter
 * @param limit Maximum number of results (default: 100)
 * @returns Array of EC3 EPDs
 */
export async function fetchEC3EPDs(
  category?: string,
  limit: number = 100
): Promise<EC3EPD[]> {
  const token = await authenticate();
  
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  params.append("page_size", limit.toString());

  const url = `${EC3_BASE_URL}/epds${params.toString() ? `?${params.toString()}` : ""}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EC3 API error (${response.status}): ${errorText}`);
  }

  const data: EC3EPDListResponse = await response.json();
  return data.results || [];
}

/**
 * Fetch a single EPD by ID from EC3 API
 * @param epdId The EPD ID or open_xpd_uuid to fetch
 * @returns EC3 EPD data
 */
export async function fetchEC3EPDById(epdId: string): Promise<EC3EPD | null> {
  const token = await authenticate();
  
  const url = `${EC3_BASE_URL}/epds/${epdId}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    if (response.status === 404) return null;
    const errorText = await response.text();
    throw new Error(`EC3 API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Search EC3 EPDs by keyword
 * @param query Search query
 * @param limit Maximum number of results (default: 100)
 * @returns Array of matching EPDs
 */
export async function searchEC3EPDs(
  query: string,
  limit: number = 100
): Promise<EC3EPD[]> {
  const token = await authenticate();
  
  const params = new URLSearchParams();
  params.append("q", query);
  params.append("page_size", limit.toString());

  const url = `${EC3_BASE_URL}/epds?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EC3 API error (${response.status}): ${errorText}`);
  }

  const data: EC3EPDListResponse = await response.json();
  return data.results || [];
}

/**
 * Get EC3 material categories
 * @returns Array of category objects
 */
export async function fetchEC3Categories(): Promise<Array<{
  id: string;
  name: string;
  display_name: string;
  masterformat?: string;
  declared_unit: string;
}>> {
  const token = await authenticate();
  
  const url = `${EC3_BASE_URL}/categories`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EC3 API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Parse GWP string to number (e.g., "339 kgCO2e" -> 339)
 */
export function parseGWP(gwpString: string): number {
  const match = gwpString.match(/^([\d.]+)\s*kgCO2e$/);
  return match ? parseFloat(match[1]) : 0;
}
