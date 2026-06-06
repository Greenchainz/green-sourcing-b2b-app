/**
 * PDF download endpoints — binary streaming, not tRPC.
 * Auth + (for material score) subscription entitlement required.
 */
import express from 'express';
import { canAccessRfqPdf } from '../_core/route-auth-guards';
import { checkMaterialScorePdfAccess } from '../services/pdf-access-guard';
import type { RfqWithBids } from '../rfq-service';
import { requireEasyAuthUser } from '../_core/request-auth';
import { z } from "zod";

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

export function registerPdfRoutes(
  app: express.Express,
  rfqPdfRateLimit: express.RequestHandler,
  materialScorePdfRateLimit: express.RequestHandler
): void {
  // Material Credit Score PDF — Standard/Premium only
  app.get('/api/pdf/material-score/:materialId', materialScorePdfRateLimit, async (req, res) => {
    try {
      const user = await requireEasyAuthUser(req);
      if (!user) return res.status(401).json(createErrorResponse('Unauthorized', req.id));

      const materialId = parseInt(req.params.materialId as string);
      if (isNaN(materialId)) return res.status(400).json(createErrorResponse('Invalid material ID', req.id));

      const access = await checkMaterialScorePdfAccess(user.id);
      if (!access.allowed) {
        return res.status(403).json(createErrorResponse(access.reason ?? 'Subscription required', req.id));
      }

      const { getDb } = await import('../db');
      const { materials } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      const { evaluateEpdValidity } = await import('../services/epd-validity-policy');
      const db = await getDb();
      if (db) {
        const [material] = await db
          .select({ epdExpiry: materials.epdExpiry })
          .from(materials)
          .where(eq(materials.id, materialId))
          .limit(1);

        const epdValidity = evaluateEpdValidity(material?.epdExpiry ?? null);
        if (!epdValidity.isUsableForScoring) {
          return res.status(409).json(
            createErrorResponse(
              'Material score export blocked by CCPS policy',
              req.id,
              'Underlying EPD is missing or expired.'
            )
          );
        }
      }

      const { generateMaterialScorePdf } = await import('../material-score-pdf-service');
      const pdfBuffer = await generateMaterialScorePdf(materialId, user);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="material-score-${materialId}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('[pdf] Material score PDF error:', err);
      res.status(500).json(createErrorResponse('Failed to generate PDF', req.id, err instanceof Error ? err.message : String(err)));
    }
  });

  // RFQ summary PDF
  app.get('/api/swap-validation/:validationId/export-csi-1-5c', rfqPdfRateLimit, materialScorePdfRateLimit, async (req, res) => {
    try {
      const user = await requireEasyAuthUser(req);
      if (!user) return res.status(401).json(createErrorResponse('Unauthorized', req.id));

      const validationId = parseInt(req.params.validationId as string);
      if (isNaN(validationId)) return res.status(400).json(createErrorResponse('Invalid validation ID', req.id));

      const { getDb } = await import('../db');
      const { swapValidations, materials, manufacturers } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      const { generateCsiForm15CPdf, buildCsi15CFilename } = await import('../services/csi-form-1-5c-generator');
      const db = await getDb();
      if (!db) return res.status(500).json(createErrorResponse('Database unavailable', req.id));

      const [validation] = await db
        .select()
        .from(swapValidations)
        .where(eq(swapValidations.id, validationId))
        .limit(1);
      if (!validation) return res.status(404).json(createErrorResponse('Validation not found', req.id));

      const [incumbent, sustainable] = await Promise.all([
        db.select().from(materials).where(eq(materials.id, validation.incumbentMaterialId)).limit(1),
        db.select().from(materials).where(eq(materials.id, validation.sustainableMaterialId)).limit(1),
      ]);
      if (!incumbent[0] || !sustainable[0]) {
        return res.status(404).json(createErrorResponse('Validation materials not found', req.id));
      }

      const [incumbentManufacturer, sustainableManufacturer] = await Promise.all([
        incumbent[0].manufacturerId == null
          ? Promise.resolve(undefined)
          : db
              .select({ name: manufacturers.name })
              .from(manufacturers)
              .where(eq(manufacturers.id, incumbent[0].manufacturerId))
              .limit(1)
              .then((rows) => rows[0]?.name),
        sustainable[0].manufacturerId == null
          ? Promise.resolve(undefined)
          : db
              .select({ name: manufacturers.name })
              .from(manufacturers)
              .where(eq(manufacturers.id, sustainable[0].manufacturerId))
              .limit(1)
              .then((rows) => rows[0]?.name),
      ]);

      const querySchema = z.object({
        projectName: z.string().trim().max(120).optional(),
        specSection: z.string().trim().max(40).optional(),
      });
      const parsedQuery = querySchema.safeParse({
        projectName: typeof req.query.projectName === "string" ? req.query.projectName : undefined,
        specSection: typeof req.query.specSection === "string" ? req.query.specSection : undefined,
      });
      if (!parsedQuery.success) {
        return res.status(400).json(createErrorResponse('Invalid query parameters', req.id));
      }
      const { projectName, specSection } = parsedQuery.data;
      const requestedBy = user.name || user.email || "GreenChainz User";

      const pdfBuffer = await generateCsiForm15CPdf({
        validation,
        incumbent: incumbent[0],
        sustainable: sustainable[0],
        incumbentManufacturer,
        sustainableManufacturer,
        projectName,
        specSection,
        requestedBy,
      });

      const filename = buildCsi15CFilename(projectName, validationId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('[pdf] CSI 1.5C export error:', err);
      res.status(500).json(createErrorResponse('Failed to generate CSI Form 1.5C PDF', req.id, err instanceof Error ? err.message : String(err)));
    }
  });

  // RFQ summary PDF
  app.get('/api/rfq/:rfqId/pdf/summary', rfqPdfRateLimit, async (req, res) => {
    try {
      const user = await requireEasyAuthUser(req);
      if (!user) return res.status(401).json(createErrorResponse('Unauthorized', req.id));
      const { generateRfqSummaryPdf } = await import('../rfq-pdf-service');
      const { getRfqWithBids } = await import('../rfq-service');
      const rfqId = parseInt(req.params.rfqId as string);
      if (isNaN(rfqId)) return res.status(400).json(createErrorResponse('Invalid RFQ ID', req.id));
      const rfq = await getRfqWithBids(rfqId);
      if (!rfq) return res.status(404).json(createErrorResponse('RFQ not found', req.id));
      if (!canAccessRfqPdf(user, rfq.rfq.userId ?? 0)) {
        return res.status(403).json(createErrorResponse('Forbidden', req.id));
      }
      const pdfBuffer = await generateRfqSummaryPdf({
        rfqId,
        projectName: rfq.rfq.projectName,
        projectLocation: rfq.rfq.projectLocation ?? '',
        projectType: rfq.rfq.projectType ?? undefined,
        buyerName: user.name || 'GreenChainz Buyer',
        buyerEmail: user.email || '',
        dueDate: rfq.rfq.dueDate ?? undefined,
        notes: rfq.rfq.notes ?? undefined,
        items: (rfq.items || []).map((item: RfqWithBids['items'][number]) => ({
          materialName: item.materialName || 'Material',
          quantity: Number(item.quantity),
          quantityUnit: item.quantityUnit || 'units',
          notes: item.notes ?? undefined,
        })),
        createdAt: rfq.rfq.createdAt,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="rfq-${rfqId}-summary.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('PDF generation error:', err);
      res.status(500).json(createErrorResponse('Failed to generate PDF', req.id, err instanceof Error ? err.message : String(err)));
    }
  });

  // RFQ bids comparison PDF
  app.get('/api/rfq/:rfqId/pdf/bids', rfqPdfRateLimit, async (req, res) => {
    try {
      const user = await requireEasyAuthUser(req);
      if (!user) return res.status(401).json(createErrorResponse('Unauthorized', req.id));
      const { generateBidComparisonPdf } = await import('../rfq-pdf-service');
      const { getRfqWithBids } = await import('../rfq-service');
      const rfqId = parseInt(req.params.rfqId as string);
      if (isNaN(rfqId)) return res.status(400).json(createErrorResponse('Invalid RFQ ID', req.id));
      const rfq = await getRfqWithBids(rfqId);
      if (!rfq) return res.status(404).json(createErrorResponse('RFQ not found', req.id));
      if (!canAccessRfqPdf(user, rfq.rfq.userId ?? 0)) {
        return res.status(403).json(createErrorResponse('Forbidden', req.id));
      }
      const pdfBuffer = await generateBidComparisonPdf({
        rfqId,
        projectName: rfq.rfq.projectName,
        projectLocation: rfq.rfq.projectLocation ?? '',
        projectType: rfq.rfq.projectType ?? undefined,
        buyerName: user.name || 'GreenChainz Buyer',
        buyerEmail: user.email || '',
        dueDate: rfq.rfq.dueDate ?? undefined,
        notes: rfq.rfq.notes ?? undefined,
        items: (rfq.items || []).map((item: RfqWithBids['items'][number]) => ({
          materialName: item.materialName || 'Material',
          quantity: Number(item.quantity),
          quantityUnit: item.quantityUnit || 'units',
        })),
        createdAt: rfq.rfq.createdAt,
        bids: (rfq.bids || []).map((bid: RfqWithBids['bids'][number]) => ({
          supplierName: bid.supplierName || 'Supplier',
          bidPrice: String(bid.bidPrice || 0),
          leadDays: Number(bid.leadDays),
          notes: bid.notes ?? undefined,
          submittedAt: bid.createdAt,
        })),
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="rfq-${rfqId}-bids.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('PDF generation error:', err);
      res.status(500).json(createErrorResponse('Failed to generate PDF', req.id, err instanceof Error ? err.message : String(err)));
    }
  });
}
