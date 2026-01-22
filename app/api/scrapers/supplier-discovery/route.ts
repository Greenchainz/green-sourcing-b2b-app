import { NextRequest, NextResponse } from 'next/server';
import {
  scrapeAzureMaps,
  scrapeEPDManufacturers,
  saveSuppliers,
} from '@/lib/scrapers/supplier-scraper';
import {
  createScraperJob,
  completeScraperJob,
  failScraperJob,
} from '@/lib/scrapers/database';

export async function POST(_request: NextRequest) {
  let jobId: string | null = null;

  try {
    jobId = await createScraperJob('supplier_discovery');

    const [azureSuppliers, epdSuppliers] = await Promise.all([
      scrapeAzureMaps('sustainable building materials supplier', 'US'),
      scrapeEPDManufacturers(),
    ]);

    const allSuppliers = [...azureSuppliers, ...epdSuppliers];

    const { saved, duplicates } = await saveSuppliers(allSuppliers, jobId);

    await completeScraperJob(jobId, {
      recordsFound: allSuppliers.length,
      recordsProcessed: saved,
      recordsFailed: duplicates,
    });

    return NextResponse.json({
      success: true,
      jobId,
      recordsFound: allSuppliers.length,
      recordsSaved: saved,
      duplicates,
    });
  } catch (error) {
    console.error('Supplier scraper failed:', error);

    if (jobId) {
      await failScraperJob(jobId, String(error));
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Scraper failed',
      },
      { status: 500 }
    );
  }
}
