import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerOAuthProviderRoutes } from "./oauth-providers";
import { registerEasyAuthRoutes } from "./easy-auth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleLandingPage } from "../marketplace-landing";
import { handleWebhook } from "../marketplace-webhook";
import { handleMicrosoftWebhook } from "../microsoft-webhook-handler";
import { uploadRouter } from "../upload-route";
import { zeptomailWebhookRouter } from "../zeptomail-webhook";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // ── Load secrets from Azure Key Vault (Managed Identity) ─────────────────
  // Must run before any module that reads auth credentials (better-auth, etc.)
  // Production: pulls from greenchainz-vault via id-greenchainz-backend identity
  // Development: falls back to .env.local
  const { loadSecrets } = await import("../../lib/secrets");
  await loadSecrets();

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // ── Authentication ─────────────────────────────────────────────────────────
  // Easy Auth: reads X-MS-CLIENT-PRINCIPAL headers injected by the Azure
  // Container Apps sidecar. This MUST be registered first so the middleware
  // runs before any other route handler.
  registerEasyAuthRoutes(app);

  // Legacy custom OAuth routes (kept temporarily for backward compat;
  // will be removed once Easy Auth is fully validated in production).
  registerOAuthRoutes(app);
  registerOAuthProviderRoutes(app);
  
  // Microsoft Marketplace endpoints
  app.get("/api/marketplace/landing", handleLandingPage);
  app.post("/api/marketplace/webhook", handleWebhook);
  
  // Microsoft AppSource subscription webhook
  app.post("/api/microsoft/subscription-webhook", handleMicrosoftWebhook);
  
  // File upload route
  app.use("/api", uploadRouter);

  // Zeptomail email event webhooks (bounce, open, click, unsubscribe, spam)
  app.use(zeptomailWebhookRouter);

  // Admin: manually trigger the scraper outreach pipeline
  // Protected by Easy Auth — only authenticated users can call this
  app.post("/api/admin/trigger-outreach", async (_req, res) => {
    try {
      const { runScraperOutreachPipeline } = await import("../scraper-outreach-pipeline");
      const result = await runScraperOutreachPipeline();
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("[admin] Outreach pipeline error:", err);
      res.status(500).json({ error: "Pipeline failed" });
    }
  });

  // ── RFQ PDF Download Endpoints ─────────────────────────────────────────────
  // REST (not tRPC) because they stream binary PDF data.
  app.get("/api/rfq/:rfqId/pdf/summary", async (req, res) => {
    try {
      const { generateRfqSummaryPdf } = await import("../rfq-pdf-service");
      const { getRfqWithBids } = await import("../rfq-service");
      const rfqId = parseInt(req.params.rfqId);
      if (isNaN(rfqId)) return res.status(400).json({ error: "Invalid RFQ ID" });
      const rfq = await getRfqWithBids(rfqId);
      if (!rfq) return res.status(404).json({ error: "RFQ not found" });
      const pdfBuffer = await generateRfqSummaryPdf({
        rfqId,
        projectName: rfq.projectName,
        projectLocation: rfq.projectLocation,
        projectType: rfq.projectType ?? undefined,
        buyerName: rfq.buyerName || "GreenChainz Buyer",
        buyerEmail: rfq.buyerEmail || "",
        dueDate: rfq.dueDate ?? undefined,
        notes: rfq.notes ?? undefined,
        items: (rfq.items || []).map((item: any) => ({
          materialName: item.materialName || item.name || "Material",
          quantity: Number(item.quantity),
          quantityUnit: item.quantityUnit || "units",
          notes: item.notes ?? undefined,
        })),
        createdAt: rfq.createdAt,
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="rfq-${rfqId}-summary.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("PDF generation error:", err);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  app.get("/api/rfq/:rfqId/pdf/bids", async (req, res) => {
    try {
      const { generateBidComparisonPdf } = await import("../rfq-pdf-service");
      const { getRfqWithBids } = await import("../rfq-service");
      const rfqId = parseInt(req.params.rfqId);
      if (isNaN(rfqId)) return res.status(400).json({ error: "Invalid RFQ ID" });
      const rfq = await getRfqWithBids(rfqId);
      if (!rfq) return res.status(404).json({ error: "RFQ not found" });
      const pdfBuffer = await generateBidComparisonPdf({
        rfqId,
        projectName: rfq.projectName,
        projectLocation: rfq.projectLocation,
        projectType: rfq.projectType ?? undefined,
        buyerName: rfq.buyerName || "GreenChainz Buyer",
        buyerEmail: rfq.buyerEmail || "",
        dueDate: rfq.dueDate ?? undefined,
        notes: rfq.notes ?? undefined,
        items: (rfq.items || []).map((item: any) => ({
          materialName: item.materialName || item.name || "Material",
          quantity: Number(item.quantity),
          quantityUnit: item.quantityUnit || "units",
        })),
        createdAt: rfq.createdAt,
        bids: (rfq.bids || []).map((bid: any) => ({
          supplierName: bid.supplierName || bid.companyName || "Supplier",
          bidPrice: String(bid.bidPrice || 0),
          leadDays: Number(bid.leadDays),
          notes: bid.notes ?? undefined,
          submittedAt: bid.createdAt,
        })),
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="rfq-${rfqId}-bids.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("PDF generation error:", err);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
