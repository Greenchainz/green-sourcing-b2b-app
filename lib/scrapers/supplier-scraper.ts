import axios from 'axios';
import { db } from '../../server/db';
import { scrapedSuppliers } from '../../drizzle/schema';

export interface ScrapedSupplier {
  companyName: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  materialTypes?: string[];
  source: string;
}

const MATERIAL_QUERIES: Array<{ query: string; materialTypes: string[] }> = [
  { query: 'concrete supplier', materialTypes: ['Concrete', 'Masonry'] },
  { query: 'structural steel supplier', materialTypes: ['Steel', 'Rebar'] },
  { query: 'insulation manufacturer', materialTypes: ['Insulation'] },
  { query: 'glass manufacturer building', materialTypes: ['Glass'] },
  { query: 'aluminum building products', materialTypes: ['Aluminum'] },
  { query: 'roofing materials supplier', materialTypes: ['Roofing'] },
  { query: 'gypsum wallboard manufacturer', materialTypes: ['Gypsum Board'] },
  { query: 'lumber wood products supplier', materialTypes: ['Wood'] },
  { query: 'sustainable building materials', materialTypes: ['Concrete', 'Steel', 'Wood', 'Insulation'] },
  { query: 'green building products supplier', materialTypes: ['Concrete', 'Steel', 'Glass', 'Aluminum'] },
];

const STATES = ['TX', 'CA', 'FL', 'NY', 'IL', 'GA', 'NC', 'AZ', 'CO', 'WA'];

export async function scrapeAzureMaps(
  searchQuery: string,
  materialTypes: string[],
  state?: string
): Promise<ScrapedSupplier[]> {
  const subscriptionKey = process.env.AZURE_MAPS_SUBSCRIPTION_KEY;
  if (!subscriptionKey) throw new Error('AZURE_MAPS_SUBSCRIPTION_KEY not configured');

  const suppliers: ScrapedSupplier[] = [];
  try {
    const fullQuery = state ? `${searchQuery} ${state}` : searchQuery;
    const url =
      `https://atlas.microsoft.com/search/poi/json` +
      `?api-version=1.0` +
      `&subscription-key=${encodeURIComponent(subscriptionKey)}` +
      `&query=${encodeURIComponent(fullQuery)}` +
      `&countrySet=US` +
      `&limit=20`;

    const response = await axios.get(url, { timeout: 10000 });
    for (const result of response.data.results || []) {
      const poi = result.poi || {};
      const address = result.address || {};
      const name = (poi.name || '').trim();
      if (!name) continue;
      suppliers.push({
        companyName: name,
        website: poi.url || undefined,
        phone: poi.phone || undefined,
        address: address.freeformAddress || undefined,
        city: address.municipality || undefined,
        state: address.countrySubdivision || undefined,
        zipCode: address.postalCode || undefined,
        materialTypes,
        source: 'azure_maps',
      });
    }
  } catch (error) {
    console.error(`Azure Maps scrape failed for '${searchQuery}':`, error);
  }
  return suppliers;
}

export async function scrapeEPDManufacturers(): Promise<ScrapedSupplier[]> {
  const suppliers: ScrapedSupplier[] = [];
  try {
    const response = await axios.get(
      'https://api.environdec.com/api/v1/EPDLibrary/SearchEPD?PageNumber=1&PageSize=200',
      { headers: { Accept: 'application/json' }, timeout: 15000 }
    );
    const seen = new Set<string>();
    for (const epd of response.data.Data || []) {
      const manufacturer = epd.ManufacturerName || epd.Owner;
      if (!manufacturer || seen.has(manufacturer)) continue;
      seen.add(manufacturer);
      suppliers.push({
        companyName: manufacturer.trim(),
        website: epd.ManufacturerWebsite || undefined,
        materialTypes: [epd.ProductCategoryName || epd.SubCategoryName || 'Building Materials'],
        source: 'epd_international',
      });
    }
  } catch (error) {
    console.error('EPD International scrape failed:', error);
  }
  return suppliers;
}

export async function saveSuppliers(
  suppliers: ScrapedSupplier[]
): Promise<{ saved: number; duplicates: number }> {
  let saved = 0;
  let duplicates = 0;
  for (const supplier of suppliers) {
    try {
      const result = await db
        .insert(scrapedSuppliers)
        .values({
          companyName: supplier.companyName,
          email: supplier.email || null,
          phone: supplier.phone || null,
          website: supplier.website || null,
          address: supplier.address || null,
          city: supplier.city || null,
          state: supplier.state || null,
          zipCode: supplier.zipCode || null,
          materialTypes: supplier.materialTypes || [],
          source: supplier.source,
          emailStatus: 'pending',
        })
        .onConflictDoNothing()
        .returning({ id: scrapedSuppliers.id });
      if (result.length > 0) saved++;
      else duplicates++;
    } catch (err) {
      console.error(`Failed to save supplier ${supplier.companyName}:`, err);
    }
  }
  return { saved, duplicates };
}

export async function runSupplierScraper(): Promise<{
  totalSaved: number;
  totalDuplicates: number;
  azureMaps: number;
  epdInternational: number;
}> {
  let totalSaved = 0;
  let totalDuplicates = 0;
  let azureMapsSaved = 0;
  let epdSaved = 0;

  console.log('[supplier-scraper] Starting Azure Maps scrape...');
  for (const { query, materialTypes } of MATERIAL_QUERIES) {
    for (const state of STATES) {
      try {
        const results = await scrapeAzureMaps(query, materialTypes, state);
        if (results.length > 0) {
          const { saved, duplicates } = await saveSuppliers(results);
          totalSaved += saved;
          totalDuplicates += duplicates;
          azureMapsSaved += saved;
          console.log(`[supplier-scraper] '${query}' ${state}: ${results.length} found, ${saved} new`);
        }
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(`[supplier-scraper] Error for '${query}' in ${state}:`, err);
      }
    }
  }

  console.log('[supplier-scraper] Starting EPD International scrape...');
  try {
    const epdResults = await scrapeEPDManufacturers();
    if (epdResults.length > 0) {
      const { saved, duplicates } = await saveSuppliers(epdResults);
      totalSaved += saved;
      totalDuplicates += duplicates;
      epdSaved += saved;
      console.log(`[supplier-scraper] EPD International: ${epdResults.length} found, ${saved} new`);
    }
  } catch (err) {
    console.error('[supplier-scraper] EPD International error:', err);
  }

  console.log(`[supplier-scraper] Done. Saved: ${totalSaved}, Duplicates: ${totalDuplicates}`);
  return { totalSaved, totalDuplicates, azureMaps: azureMapsSaved, epdInternational: epdSaved };
}
