/**
 * Autodesk SDA (Sustainable Design API) Scraper
 * 
 * Integrates with Autodesk's Sustainable Design API to fetch material carbon data,
 * EPD information, and sustainability metrics for construction materials.
 * 
 * API Documentation: https://aps.autodesk.com/en/docs/construction/v1/reference/http/carbon-materials-GET/
 */

import axios from 'axios';
import { getForgeToken } from '../autodesk-interceptor';

/**
 * Autodesk SDA Material Response
 */
export interface AutodeskSDAmaterial {
  id: string;
  name: string;
  category: string;
  manufacturer?: string;
  productName?: string;
  /** Global Warming Potential (kg CO2e per unit) */
  gwp: number;
  unit: string;
  /** EPD URL if available */
  epdUrl?: string;
  /** EPD certification body */
  epdCertifier?: string;
  /** Additional certifications (FSC, C2C, etc.) */
  certifications?: string[];
  /** Material specifications */
  specifications?: {
    density?: number;
    strength?: number;
    [key: string]: number | string | undefined;
  };
}

/**
 * Search materials in Autodesk SDA
 * 
 * @param query - Material name or category to search
 * @param options - Search options
 * @returns Array of matching materials
 */
export async function searchAutodeskSDAmaterials(
  query: string,
  options?: {
    category?: string;
    maxResults?: number;
  }
): Promise<AutodeskSDAmaterial[]> {
  try {
    const token = await getForgeToken();
    
    const response = await axios.get(
      'https://developer.api.autodesk.com/construction/carbon/v1/materials',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: {
          query,
          category: options?.category,
          limit: options?.maxResults || 50,
        },
      }
    );

    const materials: AutodeskSDAmaterial[] = response.data.results.map((item: any) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      manufacturer: item.manufacturer,
      productName: item.productName,
      gwp: item.gwp || item.carbonFootprint,
      unit: item.unit || 'kg',
      epdUrl: item.epdUrl,
      epdCertifier: item.epdCertifier,
      certifications: item.certifications || [],
      specifications: item.specifications || {},
    }));

    console.log(`✅ Found ${materials.length} materials in Autodesk SDA for: ${query}`);
    return materials;

  } catch (error) {
    console.error(`❌ Autodesk SDA search failed for "${query}":`, error);
    
    // If API fails, return empty array instead of throwing
    // This allows the scraper to continue with other sources
    return [];
  }
}

/**
 * Get material details by ID from Autodesk SDA
 * 
 * @param materialId - Autodesk material ID
 * @returns Material details
 */
export async function getAutodeskSDAmaterialById(
  materialId: string
): Promise<AutodeskSDAmaterial | null> {
  try {
    const token = await getForgeToken();
    
    const response = await axios.get(
      `https://developer.api.autodesk.com/construction/carbon/v1/materials/${materialId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const item = response.data;
    
    const material: AutodeskSDAmaterial = {
      id: item.id,
      name: item.name,
      category: item.category,
      manufacturer: item.manufacturer,
      productName: item.productName,
      gwp: item.gwp || item.carbonFootprint,
      unit: item.unit || 'kg',
      epdUrl: item.epdUrl,
      epdCertifier: item.epdCertifier,
      certifications: item.certifications || [],
      specifications: item.specifications || {},
    };

    console.log(`✅ Retrieved material from Autodesk SDA: ${material.name}`);
    return material;

  } catch (error) {
    console.error(`❌ Failed to get Autodesk SDA material ${materialId}:`, error);
    return null;
  }
}

/**
 * Sync all materials from Autodesk SDA for a given category
 * 
 * @param category - Material category (e.g., "Concrete", "Steel", "Insulation")
 * @returns Array of materials
 */
export async function syncAutodeskSDAcategory(
  category: string
): Promise<AutodeskSDAmaterial[]> {
  console.log(`🔄 Syncing Autodesk SDA category: ${category}`);
  
  try {
    const materials = await searchAutodeskSDAmaterials('', {
      category,
      maxResults: 100,
    });

    console.log(`✅ Synced ${materials.length} materials from Autodesk SDA category: ${category}`);
    return materials;

  } catch (error) {
    console.error(`❌ Failed to sync Autodesk SDA category ${category}:`, error);
    return [];
  }
}

/**
 * Batch search materials from Autodesk SDA
 * 
 * @param queries - Array of material names to search
 * @returns Map of query to materials
 */
export async function batchSearchAutodeskSDA(
  queries: string[]
): Promise<Map<string, AutodeskSDAmaterial[]>> {
  console.log(`🔍 Batch searching ${queries.length} materials in Autodesk SDA`);
  
  const results = new Map<string, AutodeskSDAmaterial[]>();
  
  for (const query of queries) {
    const materials = await searchAutodeskSDAmaterials(query);
    results.set(query, materials);
    
    // Rate limiting: 2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  const totalMaterials = Array.from(results.values()).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`✅ Batch search complete: ${totalMaterials} total materials found`);
  
  return results;
}
