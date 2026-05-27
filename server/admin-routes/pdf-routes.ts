/**
 * PDF download endpoints — binary streaming, not tRPC.
 * Auth + (for material score) subscription entitlement required.
 */
import express from 'express';
import { sdk } from '../_core/sdk';
import { canAccessRfqPdf } from '../_core/route-auth-guards';
import { checkMaterialScorePdfAccess } from '../services/pdf-access-guard';
import type { RfqWithBids } from '../rfq-service';

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
      const user = await sdk.authenticateRequest(req).catch(() => null);
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
  app.get('/api/rfq/:rfqId/pdf/summary', rfqPdfRateLimit, async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
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
      const user = await sdk.authenticateRequest(req).catch(() => null);
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
