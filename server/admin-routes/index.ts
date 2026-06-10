/**
 * Admin REST endpoints — all require authenticated admin user.
 * Registered under /api/admin/* with a shared rate limiter.
 */
import express from 'express';
import { requireEasyAuthUser } from '../_core/request-auth';

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

async function requireEasyAuthAdminUser(req: express.Request, res: express.Response) {
  const user = await requireEasyAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  return user;
}

function getRequestId(req: express.Request): string {
  return req.id ?? "unknown";
}

export function registerAdminRoutes(
  app: express.Express,
  adminRateLimit: express.RequestHandler
): void {
  // Trigger scraper outreach pipeline
  app.post('/api/admin/trigger-outreach', adminRateLimit, async (req, res) => {
    try {
      const user = await requireEasyAuthAdminUser(req, res);
      if (!user) return;
      const { runScraperOutreachPipeline } = await import('../scraper-outreach-pipeline');
      const result = await runScraperOutreachPipeline();
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[admin] Outreach pipeline error:', err);
      res.status(500).json(createErrorResponse('Pipeline failed', getRequestId(req), err instanceof Error ? err.message : String(err)));
    }
  });

  // Seed decision_maker_personas with CCPS weights
  app.post('/api/admin/seed-personas', adminRateLimit, async (req, res) => {
    try {
      const user = await requireEasyAuthAdminUser(req, res);
      if (!user) return;
      const { seedPersonas } = await import('../seed-personas');
      const result = await seedPersonas();
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[admin] Seed personas error:', err);
      res.status(500).json(createErrorResponse('Seed failed', getRequestId(req), err instanceof Error ? err.message : String(err)));
    }
  });

  // Seed materials catalog from EC3
  app.post('/api/admin/seed-materials', adminRateLimit, async (req, res) => {
    try {
      const user = await requireEasyAuthAdminUser(req, res);
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
      res.status(500).json(createErrorResponse('Seed failed', getRequestId(req), err instanceof Error ? err.message : String(err)));
    }
  });

  // Seed materials from Autodesk SDA
  app.post('/api/admin/seed-materials-autodesk', adminRateLimit, async (req, res) => {
    try {
      const user = await requireEasyAuthAdminUser(req, res);
      if (!user) return;
      const { fetchSDAMaterialsForSeed } = await import('../autodesk-sda-service');
      const results = await fetchSDAMaterialsForSeed();
      const totalFetched = results.reduce((sum, r) => sum + r.fetched, 0);
      res.json({ success: true, totalFetched, categories: results.map(r => ({ category: r.category, fetched: r.fetched })) });
    } catch (err) {
      console.error('[admin] Autodesk SDA seed error:', err);
      res.status(500).json(createErrorResponse('Autodesk seed failed', getRequestId(req), err instanceof Error ? err.message : String(err)));
    }
  });

  // Import materials from an uploaded EPD PDF via GPT-4o extraction
  app.post(
    '/api/admin/import-pdf-materials',
    adminRateLimit,
    (req, res, next) => {
      const multer = require('multer');
      const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
      upload.single('pdf')(req, res, (err: unknown) => {
        if (err && typeof err === 'object' && (err as any).code === 'LIMIT_FILE_SIZE') {
          res.status(413).json(createErrorResponse('File too large — max 50 MB', getRequestId(req)));
          return;
        }
        if (err) { next(err); return; }
        next();
      });
    },
    async (req: express.Request, res: express.Response) => {
      try {
        const user = await requireEasyAuthAdminUser(req, res);
        if (!user) return;

        if (!req.file) {
          return res.status(400).json(createErrorResponse("No PDF file uploaded. Use field name 'pdf'.", getRequestId(req)));
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
        res.status(500).json(createErrorResponse('PDF import failed', getRequestId(req), err instanceof Error ? err.message : String(err)));
      }
    }
  );

  // Run supplier scraper (Azure Maps + EPD International)
  app.post('/api/admin/run-supplier-scraper', adminRateLimit, async (req, res) => {
    try {
      const user = await requireEasyAuthAdminUser(req, res);
      if (!user) return;
      const { runSupplierScraper } = await import('../../lib/scrapers/supplier-scraper');
      const result = await runSupplierScraper();
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[admin] Supplier scraper error:', err);
      res.status(500).json(createErrorResponse('Scraper failed', getRequestId(req), err instanceof Error ? err.message : String(err)));
    }
  });

  // Run lead scraper (Bing + Azure Maps)
  app.post('/api/admin/run-lead-scraper', adminRateLimit, async (req, res) => {
    try {
      const user = await requireEasyAuthAdminUser(req, res);
      if (!user) return;
      const { runLeadScraper } = await import('../../lib/scrapers/lead-scraper');
      const result = await runLeadScraper();
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[admin] Lead scraper error:', err);
      res.status(500).json(createErrorResponse('Lead scraper failed', getRequestId(req), err instanceof Error ? err.message : String(err)));
    }
  });

  // Trigger buyer lead outreach pipeline
  app.post('/api/admin/trigger-lead-outreach', adminRateLimit, async (req, res) => {
    try {
      const user = await requireEasyAuthAdminUser(req, res);
      if (!user) return;
      const { runLeadOutreachPipeline } = await import('../lead-outreach-pipeline');
      const result = await runLeadOutreachPipeline();
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[admin] Lead outreach error:', err);
      res.status(500).json(createErrorResponse('Lead outreach failed', getRequestId(req), err instanceof Error ? err.message : String(err)));
    }
  });

  // Run TxDOT pricing scraper
  app.post('/api/admin/run-txdot-scraper', adminRateLimit, async (req, res) => {
    try {
      const user = await requireEasyAuthAdminUser(req, res);
      if (!user) return;
      const { scrapeTxdotPricingData } = await import('../services/txdotScraper');
      const { storePricingData, updateAllMaterialAveragePricing } = await import('../services/pricingDataService');
      const scrapedData = await scrapeTxdotPricingData();
      const storeResult = await storePricingData(scrapedData);
      await updateAllMaterialAveragePricing();
      res.json({ ...storeResult, success: true, recordsScraped: scrapedData.length });
    } catch (err) {
      console.error('[admin] TxDOT scraper error:', err);
      res.status(500).json(createErrorResponse('TxDOT scraper failed', getRequestId(req), err instanceof Error ? err.message : String(err)));
    }
  });

  // ── CCPA / GDPR Data Subject Request routes ────────────────────────────────

  /**
   * GET /api/admin/user-data-export?userId=X
   *
   * Returns a JSON bundle of all personal data held for the specified user.
   * Used to service CCPA "right to know" / GDPR "data access" requests.
   * Response is intentionally verbose — the admin decides what to send to the
   * requestor.
   */
  app.get('/api/admin/user-data-export', adminRateLimit, async (req, res) => {
    try {
      const admin = await requireEasyAuthAdminUser(req, res);
      if (!admin) return;

      const rawUserId = req.query.userId;
      const userId = parseInt(String(rawUserId ?? ''), 10);
      if (!userId || isNaN(userId)) {
        res.status(400).json(createErrorResponse('userId query parameter is required and must be an integer', getRequestId(req)));
        return;
      }

      const { getDb } = await import('../db');
      const { eq, or } = await import('drizzle-orm');
      const schema = await import('../../drizzle/schema');

      const db = await getDb();
      if (!db) {
        res.status(503).json(createErrorResponse('Database unavailable', getRequestId(req)));
        return;
      }

      const [userRow] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      if (!userRow) {
        res.status(404).json(createErrorResponse('User not found', getRequestId(req)));
        return;
      }

      // Collect all data associated with the user — scoped strictly to userId.
      const [
        supplierRows,
        rfqRows,
        leadRows,
        messageRows,
        notificationRows,
        dsrRows,
      ] = await Promise.all([
        db.select().from(schema.suppliers).where(eq(schema.suppliers.userId, userId)),
        db.select().from(schema.rfqs).where(eq(schema.rfqs.userId, userId)),
        db.select().from(schema.leads).where(eq(schema.leads.email, userRow.email ?? '')),
        db.select().from(schema.messages).where(eq(schema.messages.senderId, userId)),
        db.select().from(schema.notifications).where(eq(schema.notifications.userId, userId)),
        db.select().from(schema.dataSubjectRequests).where(eq(schema.dataSubjectRequests.targetUserId, userId)),
      ]);

      res.json({
        exportedAt: new Date().toISOString(),
        userId,
        profile: userRow,
        suppliers: supplierRows,
        rfqs: rfqRows,
        leads: leadRows,
        messages: messageRows,
        notifications: notificationRows,
        dataSubjectRequests: dsrRows,
      });
    } catch (err) {
      console.error('[admin] user-data-export error:', err);
      res.status(500).json(createErrorResponse('Export failed', getRequestId(req), err instanceof Error ? err.message : String(err)));
    }
  });

  /**
   * POST /api/admin/user-data-deletion-request
   *
   * Body: { targetUserId: number, type: "access"|"correction"|"deletion", notes?: string }
   *
   * Creates a tracked data-subject request entry so the privacy team can
   * service CCPA / GDPR requests in a fully auditable way.  Actual PII
   * anonymisation must be performed separately via a privileged migration
   * after the 7-year retention window has elapsed.
   */
  app.post('/api/admin/user-data-deletion-request', adminRateLimit, async (req, res) => {
    try {
      const admin = await requireEasyAuthAdminUser(req, res);
      if (!admin) return;

      const body = req.body as { targetUserId?: unknown; type?: unknown; notes?: unknown };
      const targetUserId = typeof body.targetUserId === 'number' ? body.targetUserId : parseInt(String(body.targetUserId ?? ''), 10);
      const type = String(body.type ?? '');
      const notes = typeof body.notes === 'string' ? body.notes : undefined;

      if (!targetUserId || isNaN(targetUserId)) {
        res.status(400).json(createErrorResponse('targetUserId is required', getRequestId(req)));
        return;
      }
      if (!['access', 'correction', 'deletion'].includes(type)) {
        res.status(400).json(createErrorResponse('type must be "access", "correction", or "deletion"', getRequestId(req)));
        return;
      }

      const { getDb } = await import('../db');
      const schema = await import('../../drizzle/schema');

      const db = await getDb();
      if (!db) {
        res.status(503).json(createErrorResponse('Database unavailable', getRequestId(req)));
        return;
      }

      const [inserted] = await db
        .insert(schema.dataSubjectRequests)
        .values({
          requestedByAdminId: admin.id,
          targetUserId,
          type: type as 'access' | 'correction' | 'deletion',
          status: 'pending',
          notes: notes ?? null,
        })
        .returning();

      console.log(`[admin] DSR created id=${inserted.id} type=${type} targetUser=${targetUserId} by admin=${admin.id}`);

      res.status(201).json({ success: true, request: inserted });
    } catch (err) {
      console.error('[admin] user-data-deletion-request error:', err);
      res.status(500).json(createErrorResponse('Request creation failed', getRequestId(req), err instanceof Error ? err.message : String(err)));
    }
  });
}
