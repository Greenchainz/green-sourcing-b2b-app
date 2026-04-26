/**
 * Admin REST endpoints — all require authenticated admin user.
 * Registered under /api/admin/* with a shared rate limiter.
 */
import express from 'express';
import { sdk } from '../_core/sdk';
import { requireAdminUser } from '../_core/route-auth-guards';
import { fetchSDAMaterialsForSeed, type SDAProductEpd } from "../autodesk-sda-service";

function createErrorResponse(
  message: string,
  requestId: string,
  detail?: string
): Record<string, unknown> {
  return {
    error: message,
    request_id: requestId,
    ...(detail ? { detail } : {}),
  };
}

export function registerAdminRoutes(
  app: express.Express,
  adminRateLimit: express.RequestHandler
): void {
  // Trigger scraper outreach pipeline
  app.post('/api/admin/trigger-outreach', adminRateLimit, async (req, res) => {
    try {
      const user = await requireAdminUser(req, res, sdk.authenticateRequest.bind(sdk));
      if (!user) return;
      const { runScraperOutreachPipeline } = await import('../scraper-outreach-pipeline');
      const result = await runScraperOutreachPipeline();
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[admin] Outreach pipeline error:', err);
      res.status(500).json(createErrorResponse('Pipeline failed', (req as any).id, err instanceof Error ? err.message : String(err)));
    }
  });

  // Seed materials catalog from EC3
  app.post('/api/admin/seed-materials', adminRateLimit, async (req, res) => {
    try {
      const user = await requireAdminUser(req, res, sdk.authenticateRequest.bind(sdk));
      if (!user) return;
      const { seedMaterialsFromEC3 } = await import('../seed-materials');
      const categories = req.query.categories
        ? String(req.query.categories).split(',').map((c) => c.trim())
        : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit)) : undefined;
      const result = await seedMaterialsFromEC3(categories, limit);
      res.json(result);
    } catch (err) {
      console.error('[admin] Seed materials error:', err);
      res.status(500).json(createErrorResponse('Seed failed', (req as any).id, err instanceof Error ? err.message : String(err)));
    }
  });

  // Seed materials from Autodesk SDA
  app.post('/api/admin/seed-materials-autodesk', adminRateLimit, async (req, res) => {
    try {
      const user = await requireAdminUser(req, res, sdk.authenticateRequest.bind(sdk));
      if (!user) return;
      const { fetchSDAMaterialsForSeed } = await import('../autodesk-sda-service');
      const results = await fetchSDAMaterialsForSeed();
      const totalFetched = results.reduce((sum, r) => sum + r.fetched, 0);
      res.json({ success: true, totalFetched, categories: results.map(r => ({ category: r.category, fetched: r.fetched })) });
    } catch (err) {
      console.error('[admin] Autodesk SDA seed error:', err);
      res.status(500).json(createErrorResponse('Autodesk seed failed', (req as any).id, err instanceof Error ? err.message : String(err)));
    }
  });

  // Import materials from an uploaded EPD PDF via GPT-4o extraction
  app.post(
    '/api/admin/import-pdf-materials',
    adminRateLimit,
    (req, res, next) => {
      const multer = require('multer');
      const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
      upload.single('pdf')(req, res, next);
    },
    async (req: any, res: any) => {
      try {
        const user = await requireAdminUser(req, res, sdk.authenticateRequest.bind(sdk));
        if (!user) return;

        if (!req.file) {
          return res.status(400).json(createErrorResponse("No PDF file uploaded. Use field name 'pdf'.", (req as any).id));
        }

        const dryRun = req.query.dryRun === 'true';
        const filename = req.file.originalname || 'upload.pdf';

        const { extractTextFromPDFBuffer, extractMaterialsWithAI, importMaterialsToDB } =
          await import('../import-pdf-service');

        console.log(`[import-pdf] Extracting text from ${filename} (${req.file.size} bytes)`);
        const pdfText = await extractTextFromPDFBuffer(req.file.buffer);
        console.log(`[import-pdf] Extracted ${pdfText.length} chars. Sending to GPT-4o...`);

        const extracted = await extractMaterialsWithAI(pdfText, filename);
        console.log(`[import-pdf] GPT-4o extracted ${extracted.length} materials`);

        const result = await importMaterialsToDB(extracted, dryRun);
        res.json({ ...result, filename, textLength: pdfText.length, dryRun });
      } catch (err) {
        console.error('[import-pdf] Error:', err);
        res.status(500).json(createErrorResponse('PDF import failed', (req as any).id, err instanceof Error ? err.message : String(err)));
      }
    }
  );

  // Run supplier scraper (Azure Maps + EPD International)
  app.post('/api/admin/run-supplier-scraper', adminRateLimit, async (req, res) => {
    try {
      const user = await requireAdminUser(req, res, sdk.authenticateRequest.bind(sdk));
      if (!user) return;
      const { runSupplierScraper } = await import('../../lib/scrapers/supplier-scraper');
      const result = await runSupplierScraper();
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[admin] Supplier scraper error:', err);
      res.status(500).json(createErrorResponse('Scraper failed', (req as any).id, err instanceof Error ? err.message : String(err)));
    }
  });

  // Run lead scraper (Bing + Azure Maps)
  app.post('/api/admin/run-lead-scraper', adminRateLimit, async (req, res) => {
    try {
      const user = await requireAdminUser(req, res, sdk.authenticateRequest.bind(sdk));
      if (!user) return;
      const { runLeadScraper } = await import('../../lib/scrapers/lead-scraper');
      const result = await runLeadScraper();
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[admin] Lead scraper error:', err);
      res.status(500).json(createErrorResponse('Lead scraper failed', (req as any).id, err instanceof Error ? err.message : String(err)));
    }
  });

  // Trigger buyer lead outreach pipeline
  app.post('/api/admin/trigger-lead-outreach', adminRateLimit, async (req, res) => {
    try {
      const user = await requireAdminUser(req, res, sdk.authenticateRequest.bind(sdk));
      if (!user) return;
      const { runLeadOutreachPipeline } = await import('../lead-outreach-pipeline');
      const result = await runLeadOutreachPipeline();
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[admin] Lead outreach error:', err);
      res.status(500).json(createErrorResponse('Lead outreach failed', (req as any).id, err instanceof Error ? err.message : String(err)));
    }
  });

  // Run TxDOT pricing scraper
  app.post('/api/admin/run-txdot-scraper', adminRateLimit, async (req, res) => {
    try {
      const user = await requireAdminUser(req, res, sdk.authenticateRequest.bind(sdk));
      if (!user) return;
      const { scrapeTxdotPricingData } = await import('../services/txdotScraper');
      const { storePricingData, updateAllMaterialAveragePricing } = await import('../services/pricingDataService');
      const scrapedData = await scrapeTxdotPricingData();
      const storeResult = await storePricingData(scrapedData);
      await updateAllMaterialAveragePricing();
      res.json({ ...storeResult, success: true, recordsScraped: scrapedData.length });
    } catch (err) {
      console.error('[admin] TxDOT scraper error:', err);
      res.status(500).json(createErrorResponse('TxDOT scraper failed', (req as any).id, err instanceof Error ? err.message : String(err)));
    }
  });
}
