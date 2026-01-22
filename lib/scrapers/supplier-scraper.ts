import axios from 'axios';
import crypto from 'crypto';
import { getPool } from './database';

export interface ScrapedSupplier {
  companyName: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  source: string;
  sourceUrl?: string;
  confidenceScore: number;
}

export async function scrapeAzureMaps(
  searchQuery: string,
  countryCode: string = 'US'
): Promise<ScrapedSupplier[]> {
  const subscriptionKey = process.env.AZURE_MAPS_SUBSCRIPTION_KEY;
  if (!subscriptionKey) {
    throw new Error('AZURE_MAPS_SUBSCRIPTION_KEY not configured');
  }

  const suppliers: ScrapedSupplier[] = [];

  try {
    const url = `https://atlas.microsoft.com/search/poi/json?api-version=1.0&subscription-key=${encodeURIComponent(
      subscriptionKey
    )}&query=${encodeURIComponent(searchQuery)}&countrySet=${encodeURIComponent(
      countryCode
    )}&limit=50`;

    const response = await axios.get(url);
    const results = response.data.results || [];

    for (const result of results) {
      const poi = result.poi || {};
      const address = result.address || {};

      suppliers.push({
        companyName: poi.name,
        website: poi.url,
        phone: poi.phone,
        address: address.freeformAddress,
        city: address.municipality,
        state: address.countrySubdivision,
        zip: address.postalCode,
        source: 'azure_maps',
        sourceUrl: undefined,
        confidenceScore: 0.7,
      });

      // Light rate limiting between POI records to avoid burst traffic
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  } catch (error) {
    // Do not throw so one failing source does not crash whole job
    console.error('Azure Maps scrape failed:', error);
  }

  return suppliers;
}

export async function scrapeEPDManufacturers(): Promise<ScrapedSupplier[]> {
  const suppliers: ScrapedSupplier[] = [];

  try {
    const epdUrl =
      'https://api.environdec.com/api/v1/EPDLibrary/SearchEPD?PageNumber=1&PageSize=100';
    const response = await axios.get(epdUrl, {
      headers: { Accept: 'application/json' },
    });

    const epds = response.data.Data || [];
    const manufacturerSet = new Set<string>();

    for (const epd of epds) {
      const manufacturer = epd.ManufacturerName || epd.Owner;
      if (manufacturer && !manufacturerSet.has(manufacturer)) {
        manufacturerSet.add(manufacturer);

        suppliers.push({
          companyName: manufacturer,
          source: 'epd_international',
          sourceUrl: 'https://www.environdec.com/library',
          confidenceScore: 0.9,
        });
      }
    }
  } catch (error) {
    console.error('EPD scrape failed:', error);
  }

  return suppliers;
}

function generateHashKey(supplier: ScrapedSupplier): string {
  const normalizedName = supplier.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedAddress = (supplier.address || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const hashInput = `${normalizedName}|${normalizedAddress}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

export async function saveSuppliers(
  suppliers: ScrapedSupplier[],
  jobId: string
): Promise<{ saved: number; duplicates: number }> {
  const client = await getPool().connect();
  let saved = 0;
  let duplicates = 0;

  try {
    for (const supplier of suppliers) {
      const hashKey = generateHashKey(supplier);

      const checkResult = await client.query(
        'SELECT id FROM scraped_suppliers WHERE hash_key = $1',
        [hashKey]
      );

      if (checkResult.rows.length > 0) {
        duplicates++;
        continue;
      }

      await client.query(
        `INSERT INTO scraped_suppliers 
         (company_name, website, phone, email, address, city, state, zip, source, source_url, confidence_score, hash_key, scraper_job_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          supplier.companyName,
          supplier.website || null,
          supplier.phone || null,
          supplier.email || null,
          supplier.address || null,
          supplier.city || null,
          supplier.state || null,
          supplier.zip || null,
          supplier.source,
          supplier.sourceUrl || null,
          supplier.confidenceScore,
          hashKey,
          jobId,
        ]
      );

      saved++;
    }
  } finally {
    client.release();
  }

  return { saved, duplicates };
}
