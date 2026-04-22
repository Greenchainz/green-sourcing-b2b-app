import "dotenv/config";
import "../sentry"; // must be first — initializes Sentry before any other imports
import { getSecret } from "../../lib/secrets";
import { config } from "dotenv";
import { existsSync } from "fs";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthProviderRoutes } from "./oauth-providers";
import { registerEmailAuthRoutes } from "./email-auth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleLandingPage } from "../marketplace-landing";
import { handleRevitLanding } from "../revit-landing";
import { handleWebhook } from "../marketplace-webhook";
import { handleMicrosoftWebhook } from "../microsoft-webhook-handler";
import { uploadRouter } from "../upload-route";
import { zeptomailWebhookRouter } from "../zeptomail-webhook";
import { specSheetRouter } from "../spec-sheet-router";
import { sdk } from "./sdk";
import { registerAdminRoutes } from "../admin-routes/index";
import { registerPdfRoutes } from "../admin-routes/pdf-routes";
import { registerMobileMessagesRoutes } from "../admin-routes/mobile-messages";
import { startSchedulers } from "../scheduler";

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
      res.status(429).json(createErrorResponse("Too Many Requests", (req as any).id));
      return;
    }
    next();
  };
}

function createRequestIdMiddleware(req: express.Request, _res: express.Response, next: express.NextFunction): void {
  (req as any).id = uuidv4();
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

  if (process.env.NODE_ENV === "production") {
    const required: Record<string, string | undefined> = {
      JWT_SECRET: process.env.JWT_SECRET,
      DATABASE_URL: process.env.DATABASE_URL,
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
  }

  const app = express();
  app.set("trust proxy", true);
  const server = createServer(app);

  app.use(createRequestIdMiddleware);
  app.use(express.json({
    limit: "5mb",
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));
  app.use(express.urlencoded({ limit: "5mb", extended: true }));

  registerEmailAuthRoutes(app);
  registerOAuthProviderRoutes(app);

  app.get("/api/oauth/callback", (_req, res) => {
    res.redirect("/");
  });

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "greenchainz-backend", timestamp: new Date().toISOString() });
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/healthz", (_req, res) => {
    res.status(200).send("ok");
  });

  app.get("/ready", async (_req, res) => {
    try {
      const { query } = await import("../../lib/pg-pool");
      await query("SELECT 1");
      res.status(200).json({ status: "ready" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[readiness] DB check failed:", message);
      res.status(503).json({ status: "not_ready", reason: "database_unavailable", detail: message });
    }
  });

  app.get("/api/intercom/token", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json(createErrorResponse("Not authenticated", (req as any).id));
        return;
      }
      const secret = getSecret("INTERCOM_SECRET");
      if (!secret) {
        res.status(500).json(createErrorResponse("Intercom secret not configured", (req as any).id));
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
      res.status(401).json(createErrorResponse("Not authenticated", (req as any).id));
    }
  });

  app.post("/api/user/set-role", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) {
        res.status(401).json(createErrorResponse("Unauthorized", (req as any).id));
        return;
      }
      const { role } = req.body as { role?: string };
      const validRoles = ["buyer", "supplier"] as const;
      if (!role || !validRoles.includes(role as (typeof validRoles)[number])) {
        res.status(400).json(createErrorResponse("Invalid role. Must be 'buyer' or 'supplier'.", (req as any).id));
        return;
      }
      const { updateUserRole } = await import("../db");
      await updateUserRole(user.id, role as "buyer" | "supplier");
      res.json({ success: true, role });
    } catch (err) {
      console.error("[user] POST /api/user/set-role error:", err);
      res.status(500).json(createErrorResponse("Failed to update role", (req as any).id));
    }
  });

  app.get("/revit", handleRevitLanding);
  app.get("/privacy", (_req, res) => res.redirect(301, "/privacy.html"));
  app.get("/terms", (_req, res) => res.redirect(301, "/terms.html"));
  app.get("/security", (_req, res) => res.redirect(301, "/security.html"));
  app.get("/legal/incident-response-plan", (_req, res) => res.redirect(301, "/legal/incident-response-plan.html"));
  app.get("/legal/infosec-policy", (_req, res) => res.redirect(301, "/legal/infosec-policy.html"));
  app.get("/api/marketplace/landing", handleLandingPage);
  app.post("/api/marketplace/webhook", handleWebhook);
  app.post("/api/microsoft/subscription-webhook", handleMicrosoftWebhook);
  app.use("/api", uploadRouter);
  app.use(zeptomailWebhookRouter);
  app.use("/api", specSheetRouter);

  // ── Delegated route groups ────────────────────────────────────────────────
  registerAdminRoutes(app, adminRateLimit);
  registerPdfRoutes(app, rfqPdfRateLimit, materialScorePdfRateLimit);
  registerMobileMessagesRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Sentry error handler must be registered before the generic error handler
  const { Sentry } = await import("../sentry");
  // Sentry's middleware runtime signature matches Express, but its exported type
  // doesn't satisfy Express 5's ErrorRequestHandler overload directly.
  const sentryErrorHandler =
    Sentry.expressErrorHandler() as unknown as express.ErrorRequestHandler;
  app.use(sentryErrorHandler);

  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : "Internal server error";
    const detail = err instanceof Error && process.env.NODE_ENV === "development" ? err.stack : undefined;
    console.error(`[server] ${(req as any).id} Unhandled error:`, err);
    if (!res.headersSent) {
      res.status(500).json(createErrorResponse(message, (req as any).id, detail));
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

  // Fire-and-forget — scheduler failures must not kill the server process.
  startSchedulers().catch(err => console.error('[Schedulers] Failed to start:', err));
}

startServer().catch((err) => {
  console.error("[startup] Fatal error:", err);
  process.exit(1);
});
