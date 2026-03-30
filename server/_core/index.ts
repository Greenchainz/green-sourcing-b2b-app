import "dotenv/config";
import { config } from "dotenv";
import { existsSync } from "fs";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthProviderRoutes } from "./oauth-providers";
import { registerEmailAuthRoutes } from "./email-auth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleLandingPage } from "../marketplace-landing";
import { handleWebhook } from "../marketplace-webhook";
import { handleMicrosoftWebhook } from "../microsoft-webhook-handler";
import { uploadRouter } from "../upload-route";
import { zeptomailWebhookRouter } from "../zeptomail-webhook";
import { sdk } from "./sdk";

// ── Simple in-memory rate limiter ─────────────────────────────────────────────
// Prevents brute-force abuse of authenticated routes without external packages.
// Keyed by IP address; resets after the window expires.
function createRateLimiter(maxRequests: number, windowMs: number) {
  const counts = new Map<string, { count: number; resetAt: number }>();
  return function rateLimitMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
    const ip = String(req.ip ?? req.socket.remoteAddress ?? "unknown");
    const now = Date.now();
    const entry = counts.get(ip);
    if (!entry || now >= entry.resetAt) {
      counts.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      console.warn(`[rate-limit] IP ${ip} throttled on ${req.method} ${req.path} — retry after ${retryAfterSeconds}s`);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ error: "Too Many Requests" });
      return;
    }
    next();
  };
}

const adminRateLimit = createRateLimiter(20, 60_000);   // 20 req/min per IP
const rfqPdfRateLimit = createRateLimiter(30, 60_000);  // 30 req/min per IP

// ── Shared admin auth helper ───────────────────────────────────────────────────
// Authenticates the session and enforces admin role in one call.
// Sends 401/403 and returns null if checks fail; returns the user otherwise.
// Use this in all admin REST handlers instead of inlining the role check.
async function getAdminUser(
  req: express.Request,
  res: express.Response
): Promise<{ id: number; role: string; [key: string]: unknown } | null> {
  const user = await sdk.authenticateRequest(req).catch(() => null);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  if (user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return user as { id: number; role: string; [key: string]: unknown };
}

// Load .env.local in development (overrides .env values)
if (process.env.NODE_ENV !== "production") {
  if (existsSync(".env.local")) {
    config({ path: ".env.local", override: true });
    console.log("[Env] Loaded .env.local");
  }
}

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

  // ── Startup assertions ────────────────────────────────────────────────────
  // Fail fast if required secrets are absent so a misconfigured deploy fails
  // immediately rather than serving requests with broken auth/db behaviour.
  if (process.env.NODE_ENV === "production") {
    const required: Record<string, string | undefined> = {
      JWT_SECRET:   process.env.JWT_SECRET,
      DATABASE_URL: process.env.DATABASE_URL,
    };
    const missing = Object.entries(required)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length > 0) {
      throw new Error(`[startup] Missing required environment variables: ${missing.join(", ")}`);
    }
  }

  const app = express();
  // Trust Azure Container Apps / Cloudflare reverse proxy headers
  // so req.protocol reports 'https' correctly and cookies set Secure=true.
  app.set("trust proxy", true);
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // ── Authentication ─────────────────────────────────────────────────────────
  // Email/password auth — additive path for suppliers without SSO accounts
  registerEmailAuthRoutes(app);

  registerOAuthProviderRoutes(app);

  // Backwards-compatible OAuth callback route.
  // This prevents legacy clients from landing on a dead /api/oauth/callback URL.
  app.get("/api/oauth/callback", (_req, res) => {
    res.redirect("/");
  });
  
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
  // Requires: authenticated user with admin role
  app.post("/api/admin/trigger-outreach", adminRateLimit, async (req, res) => {
    try {
      const user = await getAdminUser(req, res);
      if (!user) return;
      const { runScraperOutreachPipeline } = await import("../scraper-outreach-pipeline");
      const result = await runScraperOutreachPipeline();
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("[admin] Outreach pipeline error:", err);
      res.status(500).json({ error: "Pipeline failed" });
    }
  });

  // Admin: seed materials catalog from EC3 (Building Transparency)
  // POST /api/admin/seed-materials?categories=Concrete,Steel&limit=50
  // Requires: authenticated user with admin role
  app.post("/api/admin/seed-materials", adminRateLimit, async (req, res) => {
    try {
      const user = await getAdminUser(req, res);
      if (!user) return;
      const { seedMaterialsFromEC3 } = await import("../seed-materials");
      const categories = req.query.categories
        ? String(req.query.categories).split(",").map((c) => c.trim())
        : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit)) : undefined;
      const result = await seedMaterialsFromEC3(categories, limit);
      res.json(result);
    } catch (err) {
      console.error("[admin] Seed materials error:", err);
      res.status(500).json({ error: "Seed failed", detail: String(err) });
    }
  });

  // Admin: seed materials from Autodesk SDA (v3beta)
  // POST /api/admin/seed-materials-autodesk
  // Requires: Sustainability Data API enabled in APS portal
  app.post("/api/admin/seed-materials-autodesk", adminRateLimit, async (req, res) => {
    try {
      const user = await getAdminUser(req, res);
      if (!user) return;
      const { fetchSDAMaterialsForSeed } = await import("../autodesk-sda-service");
      const results = await fetchSDAMaterialsForSeed();
      const totalFetched = results.reduce((sum, r) => sum + r.fetched, 0);
      res.json({ success: true, totalFetched, categories: results.map(r => ({ category: r.category, fetched: r.fetched })) });
    } catch (err) {
      console.error("[admin] Autodesk SDA seed error:", err);
      res.status(500).json({ error: "Autodesk seed failed", detail: String(err) });
    }
  });

  // Admin: run supplier scraper (Azure Maps + EPD International → scraped_suppliers)
  // Requires: authenticated user with admin role
  app.post("/api/admin/run-supplier-scraper", adminRateLimit, async (req, res) => {
    try {
      const user = await getAdminUser(req, res);
      if (!user) return;
      const { runSupplierScraper } = await import("../../lib/scrapers/supplier-scraper");
      const result = await runSupplierScraper();
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("[admin] Supplier scraper error:", err);
      res.status(500).json({ error: "Scraper failed", detail: String(err) });
    }
  });

  // Admin: run TxDOT pricing scraper (TX bid tabulations → pricing_data)
  // Requires: authenticated user with admin role
  app.post("/api/admin/run-txdot-scraper", adminRateLimit, async (req, res) => {
    try {
      const user = await getAdminUser(req, res);
      if (!user) return;
      const { scrapeTxdotPricingData } = await import("../services/txdotScraper");
      const { storePricingData, updateAllMaterialAveragePricing } = await import("../services/pricingDataService");
      const scrapedData = await scrapeTxdotPricingData();
      const storeResult = await storePricingData(scrapedData);
      await updateAllMaterialAveragePricing();
      res.json({ success: true, recordsScraped: scrapedData.length, ...storeResult });
    } catch (err) {
      console.error("[admin] TxDOT scraper error:", err);
      res.status(500).json({ error: "TxDOT scraper failed", detail: String(err) });
    }
  });

  // ── Material Credit Score PDF ──────────────────────────────────────────────
  // Auth required. Credits are consumed via tRPC BEFORE this endpoint is hit.
  app.get("/api/pdf/material-score/:materialId", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const materialId = parseInt(req.params.materialId);
      if (isNaN(materialId)) return res.status(400).json({ error: "Invalid material ID" });

      const { generateMaterialScorePdf } = await import("../material-score-pdf-service");
      const pdfBuffer = await generateMaterialScorePdf(materialId, user);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="material-score-${materialId}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("[pdf] Material score PDF error:", err);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // ── RFQ PDF Download Endpoints ─────────────────────────────────────────────
  // REST (not tRPC) because they stream binary PDF data.
  // Auth required: caller must own the RFQ or be an admin.
  app.get("/api/rfq/:rfqId/pdf/summary", rfqPdfRateLimit, async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { generateRfqSummaryPdf } = await import("../rfq-pdf-service");
      const { getRfqWithBids } = await import("../rfq-service");
      const rfqId = parseInt(req.params.rfqId);
      if (isNaN(rfqId)) return res.status(400).json({ error: "Invalid RFQ ID" });
      const rfq = await getRfqWithBids(rfqId);
      if (!rfq) return res.status(404).json({ error: "RFQ not found" });
      if (rfq.rfq.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }
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

  app.get("/api/rfq/:rfqId/pdf/bids", rfqPdfRateLimit, async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { generateBidComparisonPdf } = await import("../rfq-pdf-service");
      const { getRfqWithBids } = await import("../rfq-service");
      const rfqId = parseInt(req.params.rfqId);
      if (isNaN(rfqId)) return res.status(400).json({ error: "Invalid RFQ ID" });
      const rfq = await getRfqWithBids(rfqId);
      if (!rfq) return res.status(404).json({ error: "RFQ not found" });
      if (rfq.rfq.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }
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

  // ── Messages REST API (for greenchainz-mobile) ──────────────────────────────
  // Mirrors the tRPC messaging router for mobile fetch() consumers.
  // Auth: session cookie via sdk.authenticateRequest (same pattern as PDF endpoints).
  const MOBILE_ORIGIN = process.env.NEXT_PUBLIC_MOBILE_ORIGIN || "http://localhost:3001";

  function setMessagingCorsHeaders(res: express.Response) {
    res.setHeader("Access-Control-Allow-Origin", MOBILE_ORIGIN);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  // Express v5: bare * wildcards must be named — use {*path} for optional catch-all
  app.options("/api/messages/{*path}", (_req, res) => {
    setMessagingCorsHeaders(res);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.sendStatus(204);
  });

  // GET /api/messages/threads
  app.get("/api/messages/threads", async (req, res) => {
    setMessagingCorsHeaders(res);
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { getThreadsForMobile } = await import("../messaging-service");
      const threads = await getThreadsForMobile(user.id);
      res.json(threads);
    } catch (err) {
      console.error("[messages] GET /threads error:", err);
      res.status(500).json({ error: "Failed to fetch threads" });
    }
  });

  // GET /api/messages/unread-count  (before /:threadId to avoid route collision)
  app.get("/api/messages/unread-count", async (req, res) => {
    setMessagingCorsHeaders(res);
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { getUnreadMessageCount } = await import("../messaging-service");
      const count = await getUnreadMessageCount(user.id);
      res.json({ count });
    } catch (err) {
      console.error("[messages] GET /unread-count error:", err);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // GET /api/messages/threads/:threadId
  app.get("/api/messages/threads/:threadId", async (req, res) => {
    setMessagingCorsHeaders(res);
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const threadId = parseInt(req.params.threadId);
      if (isNaN(threadId)) return res.status(400).json({ error: "Invalid thread ID" });
      const { getConversationMessages } = await import("../messaging-service");
      const msgs = await getConversationMessages(threadId);
      // Shape for MobileChat: string IDs, senderEmail as senderId (MobileChat compares
      // senderId to user.email to determine sent/received), ISO timestamps.
      const mobileMsgs = msgs.map((m: any) => ({
        id: String(m.id),
        content: m.content as string,
        senderId: (m.senderEmail as string | null) ?? String(m.senderId),
        createdAt:
          m.createdAt instanceof Date
            ? m.createdAt.toISOString()
            : String(m.createdAt),
      }));
      res.json(mobileMsgs);
    } catch (err) {
      console.error("[messages] GET /threads/:id error:", err);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // POST /api/messages/threads (create or get existing thread)
  app.post("/api/messages/threads", async (req, res) => {
    setMessagingCorsHeaders(res);
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { rfqId, supplierId, buyerId } = req.body;
      if (!supplierId || !buyerId) {
        return res.status(400).json({ error: "supplierId and buyerId required" });
      }
      const { getOrCreateConversation } = await import("../messaging-service");
      const conv = await getOrCreateConversation({
        rfqId: rfqId ?? null,
        buyerId: Number(buyerId),
        supplierId: Number(supplierId),
      });
      res.json(conv);
    } catch (err) {
      console.error("[messages] POST /threads error:", err);
      res.status(500).json({ error: "Failed to create thread" });
    }
  });

  // POST /api/messages/threads/:threadId/send
  app.post("/api/messages/threads/:threadId/send", async (req, res) => {
    setMessagingCorsHeaders(res);
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const threadId = parseInt(req.params.threadId);
      if (isNaN(threadId)) return res.status(400).json({ error: "Invalid thread ID" });
      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "content (string) required" });
      }
      const { sendMessage } = await import("../messaging-service");
      const msg = await sendMessage({ conversationId: threadId, senderId: user.id, content });
      res.json(msg);
    } catch (err) {
      console.error("[messages] POST /threads/:id/send error:", err);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // POST /api/messages/threads/:threadId/read
  app.post("/api/messages/threads/:threadId/read", async (req, res) => {
    setMessagingCorsHeaders(res);
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const threadId = parseInt(req.params.threadId);
      if (isNaN(threadId)) return res.status(400).json({ error: "Invalid thread ID" });
      const { markMessagesAsRead } = await import("../messaging-service");
      await markMessagesAsRead({ conversationId: threadId, userId: user.id });
      res.json({ ok: true });
    } catch (err) {
      console.error("[messages] POST /threads/:id/read error:", err);
      res.status(500).json({ error: "Failed to mark as read" });
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
