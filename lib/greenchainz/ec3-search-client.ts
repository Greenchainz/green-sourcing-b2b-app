/**
 * lib/greenchainz/ec3-search-client.ts
 *
 * Full-featured EC3 (Building Transparency) API client.
 * Supports material search, spec-constrained queries (category, strength, GWP, fire rating),
 * and single-material lookup.
 *
 * This is the rich search client; the simpler `ec3-client.ts` handles single-EPD lookups.
 *
 * Required env / secrets:
 *   EC3_API_KEY — Bearer token for the Building Transparency API
 */

import { getSecret } from '../secrets';

const EC3_BASE = 'https://buildingtransparency.org/api';

export interface EC3Material {
  id: string;
  name: string;
  category: string;
  manufacturer?: string;
  gwp: number;
  gwpUnit: string;
  declaredUnit: string;
  strength?: number;
  strengthUnit?: string;
  fireRating?: string;
  plantLocation?: string;
  epdUrl?: string;
}

class EC3SearchClient {
  private getHeaders(): Record<string, string> {
    const apiKey = getSecret('EC3_API_KEY') || process.env.EC3_API_KEY || '';
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Searches EC3 materials with optional text query, category, and max GWP filters.
   */
  async searchMaterials(
    q?: string,
    category?: string,
    maxGwp?: number,
    page: number = 1,
    pageSize: number = 25
  ): Promise<{ materials: EC3Material[]; total: number }> {
    const params = new URLSearchParams();
    params.set('page_number', String(page));
    params.set('page_size', String(pageSize));

    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (maxGwp !== undefined && maxGwp !== null) params.set('max_gwp', String(maxGwp));

    const res = await fetch(`${EC3_BASE}/epds?${params.toString()}`, {
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`EC3 searchMaterials failed (${res.status})`);
    }

    const data = await res.json() as any;
    const materials: EC3Material[] = (data?.results || data || []).map(
      (item: any) => this.mapToEC3Material(item)
    );

    return {
      materials,
      total: data?.count ?? materials.length,
    };
  }

  /**
   * Searches EC3 for materials matching spec constraints.
   * Results are sorted by GWP ascending (lowest carbon first).
   *
   * @param category    - EC3 category slug (e.g. "ReadyMix", "Steel")
   * @param minStrength - Minimum compressive strength in MPa
   * @param maxGwp      - Maximum GWP in kgCO2e per declared unit
   * @param fireRating  - Optional fire class filter (e.g. "A1", "A2", "B")
   */
  async searchWithSpecs(
    category: string,
    minStrength: number,
    maxGwp: number,
    fireRating?: string
  ): Promise<EC3Material[]> {
    const cqfd: Record<string, any> = {
      category,
      gwp: { '$lte': maxGwp },
      compressive_strength: { '$gte': minStrength },
    };
    if (fireRating) cqfd.fire_rating = fireRating;

    const params = new URLSearchParams({
      category,
      max_gwp: String(maxGwp),
      min_strength: String(minStrength),
      sort_by: 'gwp',
      sort_order: 'asc',
      page_size: '50',
    });
    if (fireRating) params.set('fire_rating', fireRating);

    const res = await fetch(`${EC3_BASE}/epds?${params.toString()}`, {
      headers: {
        ...this.getHeaders(),
        'X-EC3-CQFD': JSON.stringify(cqfd),
      },
    });

    if (!res.ok) {
      throw new Error(`EC3 searchWithSpecs failed (${res.status})`);
    }

    const data = await res.json() as any;
    const materials: EC3Material[] = (data?.results || data || []).map(
      (item: any) => this.mapToEC3Material(item)
    );

    // Client-side sort as backup
    materials.sort((a, b) => a.gwp - b.gwp);
    return materials;
  }

  /**
   * Fetches a single material by its EC3 ID.
   */
  async getMaterial(materialId: string): Promise<EC3Material | null> {
    const res = await fetch(`${EC3_BASE}/epds/${encodeURIComponent(materialId)}`, {
      headers: this.getHeaders(),
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`EC3 getMaterial failed (${res.status})`);
    }

    const data = await res.json() as any;
    return this.mapToEC3Material(data);
  }

  private mapToEC3Material(item: any): EC3Material {
    return {
      id: item.id || item.open_xpd_uuid || '',
      name: item.name || item.product_name || '',
      category: item.category?.name || item.category || '',
      manufacturer: item.manufacturer?.name || item.manufacturer || undefined,
      gwp: item.gwp?.value ?? item.gwp_per_declared_unit ?? item.gwp ?? 0,
      gwpUnit: item.gwp?.unit || 'kgCO2e',
      declaredUnit: item.declared_unit?.unit || item.declared_unit || 'kg',
      strength: item.compressive_strength?.value ?? item.strength ?? undefined,
      strengthUnit: item.compressive_strength?.unit || 'MPa',
      fireRating: item.fire_rating || item.fire_class || undefined,
      plantLocation: item.plant?.country || item.plant_location || undefined,
      epdUrl: item.url || item.epd_url || undefined,
    };
  }
}

/** Singleton EC3 search client */
export const ec3SearchClient = new EC3SearchClient();
export default ec3SearchClient;
