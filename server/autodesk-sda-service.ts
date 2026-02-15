/**
 * Autodesk Sustainability Data (SDA) API Service
 * 
 * Provides EPD (Environmental Product Declaration) search and fetch capabilities.
 * Integrates with Autodesk's sustainability database for material environmental data.
 * 
 * Reference: https://aps.autodesk.com/en/docs/sustainability/v3/developers_guide
 */

import { getApsAccessToken } from './autodesk-oauth';

export interface EpdSearchResult {
  id: string;
  name: string;
  manufacturer: string;
  category: string;
  unit: string;
  gwp: number; // Global Warming Potential (kg CO2-eq)
  ap: number; // Acidification Potential
  ep: number; // Eutrophication Potential
  pocp: number; // Photochemical Ozone Creation Potential
  certifications: string[];
}

export interface EpdDetail extends EpdSearchResult {
  description: string;
  lifecycleStages: {
    a1_a3: number; // Product stage
    a4_a5: number; // Transport and construction
    b1_b7: number; // Use stage
    c1_c4: number; // End of life
    d: number; // Benefits beyond system boundary
  };
  dataQuality: string;
  publishDate: string;
  validUntil: string;
}

/**
 * Search for EPDs by product name, manufacturer, or category
 */
export async function searchEpds(
  query: string,
  category?: string,
  limit: number = 20
): Promise<EpdSearchResult[]> {
  try {
    const token = await getApsAccessToken();
    
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    if (category) {
      params.append('category', category);
    }

    const url = `https://api.autodesk.com/sustainability/v3/epds/search?${params}`;

    console.log('[SDA] Searching EPDs:', { query, category, limit });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SDA search failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const results: EpdSearchResult[] = (data.results || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      manufacturer: item.manufacturer,
      category: item.category,
      unit: item.unit || 'kg',
      gwp: item.lcaResults?.gwp || 0,
      ap: item.lcaResults?.ap || 0,
      ep: item.lcaResults?.ep || 0,
      pocp: item.lcaResults?.pocp || 0,
      certifications: item.certifications || [],
    }));

    console.log('[SDA] Found', results.length, 'EPDs');
    return results;
  } catch (error) {
    console.error('[SDA] Search error:', error);
    throw error;
  }
}

/**
 * Fetch detailed EPD data by ID
 */
export async function getEpdDetail(epdId: string): Promise<EpdDetail | null> {
  try {
    const token = await getApsAccessToken();

    const url = `https://api.autodesk.com/sustainability/v3/epds/${epdId}`;

    console.log('[SDA] Fetching EPD detail:', epdId);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn('[SDA] EPD not found:', epdId);
        return null;
      }
      const errorText = await response.text();
      throw new Error(`SDA fetch failed: ${response.status} - ${errorText}`);
    }

    const item = await response.json();

    const detail: EpdDetail = {
      id: item.id,
      name: item.name,
      manufacturer: item.manufacturer,
      category: item.category,
      unit: item.unit || 'kg',
      gwp: item.lcaResults?.gwp || 0,
      ap: item.lcaResults?.ap || 0,
      ep: item.lcaResults?.ep || 0,
      pocp: item.lcaResults?.pocp || 0,
      certifications: item.certifications || [],
      description: item.description || '',
      lifecycleStages: {
        a1_a3: item.lcaResults?.stages?.a1_a3 || 0,
        a4_a5: item.lcaResults?.stages?.a4_a5 || 0,
        b1_b7: item.lcaResults?.stages?.b1_b7 || 0,
        c1_c4: item.lcaResults?.stages?.c1_c4 || 0,
        d: item.lcaResults?.stages?.d || 0,
      },
      dataQuality: item.dataQuality || 'unknown',
      publishDate: item.publishDate || '',
      validUntil: item.validUntil || '',
    };

    console.log('[SDA] EPD detail retrieved:', detail.name);
    return detail;
  } catch (error) {
    console.error('[SDA] Fetch error:', error);
    throw error;
  }
}

/**
 * Search EPDs and return top result
 */
export async function findBestEpd(query: string, category?: string): Promise<EpdDetail | null> {
  try {
    const results = await searchEpds(query, category, 1);
    if (results.length === 0) {
      return null;
    }

    return await getEpdDetail(results[0].id);
  } catch (error) {
    console.error('[SDA] Find best EPD error:', error);
    return null;
  }
}
