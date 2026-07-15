import "dotenv/config";
import "./log-scrubber"; // must be second — scrubs all subsequent console.* calls
import { initTelemetry } from "../instrument";
import { getSecret } from "../../lib/secrets";
import { config } from "dotenv";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import compression from "compression";
import express from "express";
import helmet from "helmet";
import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { BLOG_POSTS, getBlogPostPath } from "@shared/blogPosts";
import { decodeWin, buildWinMeta, renderWinMetaTags } from "@shared/carbonWin";
import { handleLandingPage } from "../marketplace-landing";
import { handleRevitLanding } from "../revit-landing";
import { handleWebhook } from "../marketplace-webhook";
import { handleMicrosoftWebhook } from "../microsoft-webhook-handler";
import { uploadRouter } from "../upload-route";
import { zeptomailWebhookRouter } from "../zeptomail-webhook";
import { unsubscribeRouter } from "../unsubscribe-route";
import { specSheetRouter } from "../spec-sheet-router";
import { registerAdminRoutes } from "../admin-routes/index";
import { registerIntelligenceRoutes } from "../intelligence-routes";
import { publicMaterialsRouter } from "../public-materials-api";
import { registerPdfRoutes } from "../admin-routes/pdf-routes";
import { registerMobileMessagesRoutes } from "../admin-routes/mobile-messages";
import { startSchedulers } from "../scheduler";
import { startLearningScheduler } from "../services/learning-scheduler";
import { devFounderVideoRouter } from "../dev-founder-video-route";
import { isLocalMode } from "../../lib/founder-video-storage";
import { sdaConnectorRouter } from "../sda-connector-routes";
import { registerEmailAuthRoutes } from "./email-auth";
import { registerOAuthProviderRoutes } from "./oauth-providers";
import { sdk } from "./sdk";
import { runStartupSecurityPreflight } from "./security-preflight";

// ── Simple in-memory rate limiter ─────────────────────────────────────────────
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
      res.status(429).json(createErrorResponse("Too Many Requests", req.id));
      return;
    }
    next();
  };
}

function createRequestIdMiddleware(req: express.Request, _res: express.Response, next: express.NextFunction): void {
  req.id = uuidv4();
  next();
}

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

const adminRateLimit = createRateLimiter(20, 60_000);
const rfqPdfRateLimit = createRateLimiter(30, 60_000);
const materialScorePdfRateLimit = createRateLimiter(10, 60_000);
const webhookRateLimit = createRateLimiter(120, 60_000);
const publicApiRateLimit = createRateLimiter(120, 60_000);
const winShareRateLimit = createRateLimiter(120, 60_000);
const CANONICAL_HOST = "greenchainz.com";
const ALLOWED_PUBLIC_HOSTS = new Set([
  CANONICAL_HOST,
  "www.greenchainz.com",
]);

function getForwardedHost(req: express.Request): string {
  const forwardedHostHeader = req.headers["x-forwarded-host"];
  const rawForwardedHost = Array.isArray(forwardedHostHeader)
    ? forwardedHostHeader[0]
    : String(forwardedHostHeader ?? "").split(",")[0].trim();
  const forwardedHost = rawForwardedHost.toLowerCase();
  return /^[a-z0-9.-]+(?::\d+)?$/.test(forwardedHost) ? forwardedHost : "";
}

function getRequestHost(req: express.Request): string {
  const host = String(req.headers.host ?? "").toLowerCase();
  return /^[a-z0-9.-]+(?::\d+)?$/.test(host) ? host : "";
}

function isHostAllowedForPublicApi(req: express.Request): boolean {
  const forwardedHost = getForwardedHost(req);
  const host = getRequestHost(req);

  if (forwardedHost) {
    return ALLOWED_PUBLIC_HOSTS.has(forwardedHost);
  }

  // Local development and internal container health checks.
  if (
    host.startsWith("localhost:") ||
    host === "localhost" ||
    host.startsWith("127.0.0.1:") ||
    host === "127.0.0.1"
  ) {
    return true;
  }

  return ALLOWED_PUBLIC_HOSTS.has(host);
}

function isHealthEndpoint(path: string): boolean {
  return path === "/health" || path === "/healthz" || path === "/ready" || path === "/api/health";
}

// Crawl-critical static files that must never be intercepted by the canonical
// redirect — if they were, search engines would see a 308 redirect loop on
// https://greenchainz.com/robots.txt and fail to fetch the file at all.
function isCrawlCriticalFile(path: string): boolean {
  return path === "/robots.txt" || path === "/sitemap.xml" || path === "/blog/rss.xml" || path === "/blog/feed.json";
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildBlogRssXml(siteBaseUrl: string): string {
  const sortedPosts = [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const items = sortedPosts
    .map((post) => {
      const postUrl = `${siteBaseUrl}${getBlogPostPath(post.slug)}`;
      const pubDate = new Date(post.publishedAt).toUTCString();
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(postUrl)}</link>`,
        `      <guid>${escapeXml(postUrl)}</guid>`,
        `      <pubDate>${escapeXml(pubDate)}</pubDate>`,
        `      <description>${escapeXml(post.description)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    "    <title>GreenChainz Blog</title>",
    `    <link>${escapeXml(`${siteBaseUrl}/blog`)}</link>`,
    "    <description>Question-first SEO and procurement content from GreenChainz.</description>",
    "    <language>en-us</language>",
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

function buildBlogJsonFeed(siteBaseUrl: string): Record<string, unknown> {
  const sortedPosts = [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return {
    version: "https://jsonfeed.org/version/1.1",
    title: "GreenChainz Blog",
    home_page_url: `${siteBaseUrl}/blog`,
    feed_url: `${siteBaseUrl}/blog/feed.json`,
    description: "Question-first SEO and procurement content from GreenChainz.",
    items: sortedPosts.map((post) => ({
      id: `${siteBaseUrl}${getBlogPostPath(post.slug)}`,
      url: `${siteBaseUrl}${getBlogPostPath(post.slug)}`,
      title: post.title,
      summary: post.description,
      content_text: [post.quickAnswer, ...post.sections.flatMap((section) => section.paragraphs)].join("\n\n"),
      date_published: post.publishedAt,
      date_modified: post.updatedAt ?? post.publishedAt,
      tags: post.tags,
    })),
  };
}

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
  const { loadSecrets } = await import("../../lib/secrets");
  await loadSecrets();
  // Init telemetry here — after loadSecrets() so any KV-loaded connection string is
  // already in process.env. (The deploy workflow also injects it as a plain env var.)
  initTelemetry();

  const preflight = runStartupSecurityPreflight();
  if (process.env.NODE_ENV === "production" && preflight.hasFailures) {
    console.error("[startup] FATAL: Security preflight failed in production");
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production") {
    const required: Record<string, string | undefined> = {
      JWT_SECRET: process.env.JWT_SECRET,
      DATABASE_URL: process.env.DATABASE_URL,
      AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET,
    };
    const missing = Object.entries(required)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length > 0) {
      if (process.env.SKIP_DB_SECRETS_CHECK === "true") {
        // Static-only containers (no API surface) may set SKIP_DB_SECRETS_CHECK=true
        // to bypass this check. API containers must never set this flag.
        console.warn(`[startup] Missing env vars (API features degraded): ${missing.join(", ")}`);
      } else {
        console.error(
          `[startup] FATAL: Required env vars missing: ${missing.join(", ")}. ` +
          `Set SKIP_DB_SECRETS_CHECK=true only if this is a static-file-only container.`
        );
        process.exit(1);
      }
    }

    // Guard: managed identity client ID must never equal the app client ID.
    // Mixing these causes silent auth failures in production.
    if (
      process.env.MANAGED_IDENTITY_CLIENT_ID &&
      process.env.MICROSOFT_CLIENT_ID &&
      process.env.MANAGED_IDENTITY_CLIENT_ID === process.env.MICROSOFT_CLIENT_ID
    ) {
      console.error(
        "[startup] FATAL: MANAGED_IDENTITY_CLIENT_ID must not equal MICROSOFT_CLIENT_ID. " +
        "These are different credentials — check Azure Portal."
      );
      process.exit(1);
    }
  }

  const app = express();
  app.set("trust proxy", true);
  const server = createServer(app);

  app.use((req, res, next) => {
    // Never redirect API, health, or crawl-critical files. Behind Azure Front
    // Door the origin Host header is rewritten to the container FQDN, which can
    // create a 308 loop. robots.txt and sitemap.xml must always pass through so
    // search engines can fetch them on any protocol/host combination.
    if (
      process.env.NODE_ENV !== "production" ||
      isHealthEndpoint(req.path) ||
      isCrawlCriticalFile(req.path) ||
      req.path.startsWith("/api/")
    ) {
      next();
      return;
    }

    const safeForwardedHost = getForwardedHost(req);
    const host = (safeForwardedHost || getRequestHost(req)).toLowerCase();
    const forwardedProtoHeader = req.headers["x-forwarded-proto"];
    const forwardedProto = Array.isArray(forwardedProtoHeader)
      ? forwardedProtoHeader[0]
      : String(forwardedProtoHeader ?? "").split(",")[0].trim();
    const isHttps = req.secure || forwardedProto === "https";

    if (isHttps && host === CANONICAL_HOST) {
      next();
      return;
    }

    res.redirect(308, `https://${CANONICAL_HOST}${req.originalUrl}`);
  });

  // In production, block direct public API traffic to containerapp FQDNs.
  // Requests must arrive via the canonical hosts routed through Front Door.
  app.use((req, res, next) => {
    if (process.env.NODE_ENV !== "production") {
      next();
      return;
    }

    if (isHealthEndpoint(req.path)) {
      next();
      return;
    }

    const isPublicApiSurface = req.path.startsWith("/api/") || req.path === "/unsubscribe";
    if (!isPublicApiSurface) {
      next();
      return;
    }

    if (isHostAllowedForPublicApi(req)) {
      next();
      return;
    }

    console.warn(
      `[network-guard] Rejected direct backend request host=${String(req.headers.host ?? "")} path=${req.path}`
    );
    res.status(403).json(createErrorResponse("Forbidden", req.id, "Request host is not allowed."));
  });

  // ── Gzip compression ─────────────────────────────────────────────────────
  // Compress all responses (CSS, JS, JSON, HTML). Without this Express sends
  // static assets raw — Tailwind CSS alone is 500+ KiB uncompressed.
  app.use(compression());

  // ── Security headers ──────────────────────────────────────────────────────
  const isDev = process.env.NODE_ENV === "development";
  app.use(
    helmet({
      contentSecurityPolicy: {
        // Use report-only in dev so broken assets surface without hard failures.
        // Enforced in production.
        reportOnly: isDev,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            // Inline scripts (App Insights bootstrap + Intercom settings object)
            "'unsafe-inline'",
            // Azure Application Insights
            "https://js.monitor.azure.com",
            "https://az416426.vo.msecnd.net",
            // HubSpot scripts (e.g. js-na2.hs-scripts.com)
            "https://js-na2.hs-scripts.com",
            // Intercom
            "https://widget.intercom.io",
            "https://js.intercomcdn.com",
            // CookieYes consent banner
            "https://cdn-cookieyes.com",
          ],
          // Allow script elements from the same external origins as above
          scriptSrcElem: [
            "'self'",
            "'unsafe-inline'",
            "https://js.monitor.azure.com",
            "https://az416426.vo.msecnd.net",
            "https://js-na2.hs-scripts.com",
            "https://js-na2.hs-banner.com",
            "https://js-na2.hscollectedforms.net",
            "https://js-na2.hs-analytics.net",
            "https://widget.intercom.io",
            "https://js.intercomcdn.com",
            "https://cdn-cookieyes.com",
          ],
          styleSrc: [
            "'self'",
            // shadcn/ui injects inline styles; remove 'unsafe-inline' once
            // all dynamic styles are migrated to CSS variables.
            "'unsafe-inline'",
          ],
          imgSrc: [
            "'self'",
            "data:",
            "https:",
            "https://static.intercomassets.com",
          ],
          // Media (video/audio) sources — allow HTTPS and Azure Blob Storage hosts
          mediaSrc: [
            "'self'",
            "https:",
            "http://localhost",
            "http://127.0.0.1",
            "https://*.blob.core.windows.net",
          ],
          connectSrc: [
            "'self'",
            "https://*.monitor.azure.com",
            "https://*.applicationinsights.azure.com",
            "https://forms-na2.hscollectedforms.net",
            "https://api.ec3.network",
            "https://www.epdinternational.org",
            "https://developer.api.autodesk.com",
            "https://api.intercom.io",
            "https://api-iam.intercom.io",
            // Intercom uses multiple subdomains for websocket endpoints
            "https://*.intercom.io",
            "wss://*.intercom.io",
            // WebPubSub real-time messaging
            "wss://greenchainz.webpubsub.azure.com",
            // CookieYes consent banner fetches its config from the CDN
            "https://cdn-cookieyes.com",
          ],
          // OSM iframe used in RFQ location preview
          frameSrc: ["https://www.openstreetmap.org"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: isDev ? null : [],
        },
      },
      hsts: {
        maxAge: 31_536_000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: "deny" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      hidePoweredBy: true,
    })
  );

  app.use(createRequestIdMiddleware);
  app.use(express.json({
    limit: "5mb",
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));
  app.use(express.urlencoded({ limit: "5mb", extended: true }));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "greenchainz-backend", timestamp: new Date().toISOString() });
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/healthz", (_req, res) => {
    res.status(200).send("ok");
  });

  // ── Crawl-critical static files ───────────────────────────────────────────
  // Serve robots.txt and sitemap.xml explicitly from the client public dir so
  // that search engines can always reach them — even when a www→apex or
  // http→https redirect is in effect, they bypass the canonical redirect above.
  // Serving them this way also guarantees the correct Content-Type and prevents
  // the SPA catch-all from returning index.html for these paths.
  {
    const clientPublicDir =
      process.env.NODE_ENV === "production"
        ? path.resolve(import.meta.dirname, "public")
        : path.resolve(import.meta.dirname, "../..", "dist", "public");

    app.get("/robots.txt", (_req, res) => {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.sendFile("robots.txt", { root: clientPublicDir }, (err) => {
        if (err) {
          res.status(404).end();
        }
      });
    });

    app.get("/sitemap.xml", (_req, res) => {
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.sendFile("sitemap.xml", { root: clientPublicDir }, (err) => {
        if (err) {
          res.status(404).end();
        }
      });
    });

    app.get("/blog/rss.xml", (req, res) => {
      const proto =
        (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim() ||
        req.protocol ||
        "https";
      const host =
        (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() ||
        req.get("host") ||
        CANONICAL_HOST;
      const siteBaseUrl = `${proto}://${host}`;

      res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.status(200).send(buildBlogRssXml(siteBaseUrl));
    });

    app.get("/blog/feed.json", (req, res) => {
      const proto =
        (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim() ||
        req.protocol ||
        "https";
      const host =
        (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() ||
        req.get("host") ||
        CANONICAL_HOST;
      const siteBaseUrl = `${proto}://${host}`;

      res.setHeader("Content-Type", "application/feed+json; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.status(200).json(buildBlogJsonFeed(siteBaseUrl));
    });

    // ── Share unfurls: inject per-win OpenGraph meta for /win ────────────────
    // Crawlers (LinkedIn, X, Slack, iMessage) don't run JS, so the client-side
    // card can't drive the link preview. In production we read the built SPA
    // shell, swap the default OG block for win-specific tags, and serve that.
    // The shell is immutable for the lifetime of the process, so we cache it
    // once on first use to avoid blocking the event loop on every request.
    // In dev the shell is served through Vite (which must transform it), so we
    // fall through to the Vite catch-all and the page still renders client-side.
    let cachedSpaShell: string | null = null;

    app.get("/win", winShareRateLimit, async (req, res, next) => {
      if (process.env.NODE_ENV !== "production") {
        return next();
      }
      try {
        const raw = typeof req.query.d === "string" ? req.query.d : null;
        const data = decodeWin(raw);
        if (!data) {
          return next();
        }
        if (cachedSpaShell === null) {
          const indexPath = path.resolve(clientPublicDir, "index.html");
          // Assign only on success so a transient failure (e.g. build not yet
          // written) keeps cachedSpaShell as null and we retry next request.
          cachedSpaShell = await readFile(indexPath, "utf-8");
        }
        let html = cachedSpaShell;
        const proto =
          (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim() ||
          req.protocol;
        const host =
          (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() ||
          req.get("host") ||
          "greenchainz.com";
        const meta = buildWinMeta(`${proto}://${host}`, data);
        const tags = renderWinMetaTags(meta);
        if (html.includes("OG:DEFAULT")) {
          html = html.replace(
            /<!--\s*OG:DEFAULT[\s\S]*?\/OG:DEFAULT\s*-->/,
            `<!-- OG:WIN -->\n    ${tags}\n    <!-- /OG:WIN -->`,
          );
        } else {
          html = html.replace("</head>", `    ${tags}\n  </head>`);
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300");
        res.status(200).send(html);
      } catch (err) {
        console.error("[server] /win OG injection failed:", err);
        next();
      }
    });
  }

  app.get("/ready", async (_req, res) => {
    try {
      const { query } = await import("../../lib/pg-pool");
      await query("SELECT 1");
      res.status(200).json({ status: "ready" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[readiness] DB check failed:", message);
      res.status(503).json({ status: "not_ready", reason: "database_unavailable" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    // Prevent browsers/CDNs from caching auth state — every call must hit the server.
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
    try {
      const user = await sdk.authenticateRequest(req).catch((err) => {
        // Log when cookie IS present but auth fails — helps diagnose redirect loops
        if (req.headers.cookie?.includes("app_session_id")) {
          console.warn("[/api/auth/me] Auth failed with cookie present:", String(err));
        }
        return null;
      });
      if (!user) {
        res.status(200).json({ authenticated: false, user: null });
        return;
      }

      res.status(200).json({
        authenticated: true,
        user: {
          id: String(user.id),
          email: user.email ?? "",
          name: user.name ?? "",
          roles: [user.role],
          isAdmin: user.role === "admin",
          isSupplier: user.role === "supplier",
          avatarUrl: (user as Record<string, unknown>).avatarUrl as string | null ?? null,
        },
      });
    } catch {
      res.status(200).json({ authenticated: false, user: null });
    }
  });

  app.get("/api/intercom/token", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json(createErrorResponse("Not authenticated", req.id));
        return;
      }
      const secret = getSecret("INTERCOM_SECRET");
      if (!secret) {
        res.status(500).json(createErrorResponse("Intercom secret not configured", req.id));
        return;
      }
      const { SignJWT } = await import("jose");
      const encoder = new TextEncoder();
      const token = await new SignJWT({
        user_id: String(user.id),
        email: user.email || undefined,
        name: user.name || undefined,
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setExpirationTime("1h")
        .sign(encoder.encode(secret));
      res.json({ token });
    } catch {
      res.status(401).json(createErrorResponse("Not authenticated", req.id));
    }
  });

  app.post("/api/user/set-role", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json(createErrorResponse("Unauthorized", req.id));
        return;
      }
      const { role } = req.body as { role?: string };
      const validRoles = ["buyer", "supplier"] as const;
      if (!role || !validRoles.includes(role as (typeof validRoles)[number])) {
        res.status(400).json(createErrorResponse("Invalid role. Must be 'buyer' or 'supplier'.", req.id));
        return;
      }
      const { updateUserRole } = await import("../db");
      await updateUserRole(user.id, role as "buyer" | "supplier");
      res.json({ success: true, role });
    } catch (err) {
      console.error("[user] POST /api/user/set-role error:", err);
      res.status(500).json(createErrorResponse("Failed to update role", req.id));
    }
  });

  app.get("/revit", handleRevitLanding);
  app.get("/docs", (_req, res) => res.redirect(301, "/docs.html"));
  app.get("/privacy", (_req, res) => res.redirect(301, "/privacy.html"));
  app.get("/terms", (_req, res) => res.redirect(301, "/terms.html"));
  app.get("/security", (_req, res) => res.redirect(301, "/security.html"));
  app.get("/legal/incident-response-plan", (_req, res) => res.redirect(301, "/legal/incident-response-plan.html"));
  app.get("/legal/infosec-policy", (_req, res) => res.redirect(301, "/legal/infosec-policy.html"));
  app.get("/tools/carbon-compare", (_req, res) => res.redirect(301, "/carbon-compare"));
  app.get("/tools/assemblies", (_req, res) => res.redirect(301, "/assemblies"));
  app.get("/tools/excel", (_req, res) => res.redirect(301, "/excel-audit"));
  app.get("/api/marketplace/landing", handleLandingPage);
  app.post("/api/marketplace/webhook", webhookRateLimit, handleWebhook);
  app.post("/api/microsoft/subscription-webhook", webhookRateLimit, handleMicrosoftWebhook);
  app.use("/api", uploadRouter);
  if (isLocalMode()) {
    app.use("/api/dev", devFounderVideoRouter);
    console.log("[dev-fv] Local video storage active — videos saved to tmp/founder-videos/");
  }
  app.use(zeptomailWebhookRouter);
  app.use(unsubscribeRouter);
  app.use("/api", specSheetRouter);
  // Public REST API for Forma Extension (unauthenticated)
  app.use("/api/public", publicApiRateLimit, publicMaterialsRouter);
  // SDA Connector API (Bearer token auth via api_keys table)
  app.use("/api", sdaConnectorRouter);

  registerEmailAuthRoutes(app);
  registerOAuthProviderRoutes(app);

  // ── Delegated route groups ────────────────────────────────────────────────
  registerAdminRoutes(app, adminRateLimit);
  registerIntelligenceRoutes(app, adminRateLimit);
  registerPdfRoutes(app, rfqPdfRateLimit, materialScorePdfRateLimit);
  registerMobileMessagesRoutes(app);

  app.use(
    '/api/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // No Sentry integration: use generic error handler below

  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : "Internal server error";
    const detail = err instanceof Error && process.env.NODE_ENV === "development" ? err.stack : undefined;
    console.error(`[server] ${req.id} Unhandled error:`, err);
    if (!res.headersSent) {
      res.status(500).json(createErrorResponse(message, req.id, detail));
    }
  });

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = process.env.NODE_ENV === "production"
    ? preferredPort
    : await findAvailablePort(preferredPort);

  if (process.env.NODE_ENV !== "production" && port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────────
  // Azure Container Apps sends SIGTERM before terminating a replica (scale-in,
  // revision swap, deploy). Stop accepting connections, drain in-flight requests,
  // then close the PG pool so connections are released cleanly.
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] ${signal} received — closing server gracefully`);

    // Force-exit safety net if draining hangs.
    const forceExit = setTimeout(() => {
      console.error("[shutdown] Graceful shutdown timed out — forcing exit");
      process.exit(1);
    }, 15000);
    forceExit.unref();

    server.close(async (err?: Error) => {
      if (err) {
        console.error("[shutdown] Error while closing HTTP server:", err);
      }
      try {
        const { closePool } = await import("../../lib/pg-pool");
        await closePool();
      } catch (poolErr) {
        console.error("[shutdown] Error while closing PG pool:", poolErr);
      }
      clearTimeout(forceExit);
      console.log("[shutdown] Clean shutdown complete");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  // Fire-and-forget — scheduler failures must not kill the server process.
  startSchedulers().catch(err => console.error('[Schedulers] Failed to start:', err));
  startLearningScheduler();
}

startServer().catch((err) => {
  console.error("[startup] Fatal error:", err);
  process.exit(1);
});
