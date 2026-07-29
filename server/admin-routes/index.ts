/**
 * Admin REST endpoints — all require authenticated admin user.
 * Registered under /api/admin/* with a shared rate limiter.
 */
import express from 'express';
import { requireEasyAuthUser } from '../_core/request-auth';
import { canAccessAdmin } from '../_core/admin-access';

type Role = "user" | "assistant";
type ChatMessage = {
  role: Role;
  content: string;
};

function getRequiredEnvAny(keys: string[], context: string): string {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return value;
    }
  }
  throw new Error(`Missing required environment variable for ${context}: ${keys.join(" or ")}`);
}

async function getClientCredentialsToken(scope: string): Promise<string> {
  const tenantId = getRequiredEnvAny(["AZURE_TENANT_ID", "AZURE_AD_TENANT_ID"], "Azure tenant ID");
  // Use Entra app registration client id for app-only flows. Do not use managed identity client id.
  const clientId = getRequiredEnvAny(["AZURE_AD_CLIENT_ID", "AZURE_CLIENT_ID"], "Azure app client ID");
  const clientSecret = getRequiredEnvAny(["AZURE_AD_CLIENT_SECRET", "AZURE_CLIENT_SECRET"], "Azure app client secret");

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token for ${scope}: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error(`Token response missing access_token for ${scope}`);
  }
  return data.access_token;
}

async function callGraphJson<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Graph API error ${response.status}: ${errorText}`);
  }
  return (await response.json()) as T;
}

function normalizeSharePointPath(path: string | null | undefined): string {
  if (!path) return "";
  return path.replace(/^\/+/, "").replace(/\/+$/, "");
}

function getDelegatedGraphTokenFromRequest(req: express.Request): string | null {
  const headerValue = req.headers["x-ms-token-aad-access-token"];
  if (typeof headerValue === "string" && headerValue.trim().length > 0) {
    return headerValue.trim();
  }
  return null;
}

function parseCsvText(csvText: string): Array<Record<string, string>> {
  const rows = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (rows.length < 2) return [];
  const headers = rows[0].split(",").map((header) => header.replace(/^"|"$/g, "").trim());
  return rows.slice(1, 26).map((line) => {
    const values = line.split(",").map((value) => value.replace(/^"|"$/g, "").trim());
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? "";
      return acc;
    }, {});
  });
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

async function requireEasyAuthAdminUser(req: express.Request, res: express.Response) {
  const user = await requireEasyAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  if (!canAccessAdmin(user)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  return user;
}

function getRequestId(req: express.Request): string {
  return req.id ?? "unknown";
}

/**
 * Parse a userId from a raw query/body value.
 * Returns the integer on success, or null if missing / not a valid integer.
 */
function parseAdminUserId(value: unknown): number | null {
  const n = parseInt(String(value ?? ''), 10);
  return isNaN(n) || n <= 0 ? null : n;
}

export function registerAdminRoutes(
  app: express.Express,
  adminRateLimit: express.RequestHandler
): void {
  app.post('/api/admin/intelligence/ai-chat', adminRateLimit, async (req, res) => {
    try {
      const user = await requireEasyAuthAdminUser(req, res);
      if (!user) return;

      const body = req.body as { messages?: unknown };
      const rawMessages = Array.isArray(body.messages) ? body.messages : [];
      const messages: ChatMessage[] = rawMessages
        .filter((item): item is { role: unknown; content: unknown } => Boolean(item && typeof item === "object"))
        .map((item): ChatMessage => {
          const role: Role = item.role === "assistant" ? "assistant" : "user";
          return {
            role,
            content: String(item.content ?? "").trim(),
          };
        })
        .filter((item) => item.content.length > 0)
        .slice(-16);

      if (messages.length === 0) {
        res.status(400).json(createErrorResponse("At least one non-empty message is required", getRequestId(req)));
        return;
      }

      // Fetch live business context to ground the AI in real numbers
      let liveContext = "";
      try {
        const { getDb } = await import('../db');
        const { sql } = await import("drizzle-orm");
        const db = await getDb();
        if (db) {
          // Core business counts
          const countsResult = await db.execute<{
            suppliers_count: string | number;
            rfqs_count: string | number;
            leads_count: string | number;
            pending_emails: string | number;
            sent_emails: string | number;
            failed_emails: string | number;
          }>(sql`
            SELECT
              (SELECT COUNT(*) FROM suppliers) AS suppliers_count,
              (SELECT COUNT(*) FROM rfqs) AS rfqs_count,
              (SELECT COUNT(*) FROM crm_contacts) AS leads_count,
              (SELECT COUNT(*) FROM crm_email_sequences WHERE status = 'pending') AS pending_emails,
              (SELECT COUNT(*) FROM crm_email_sequences WHERE status = 'sent') AS sent_emails,
              (SELECT COUNT(*) FROM crm_email_sequences WHERE status = 'failed') AS failed_emails
          `);
          const c = countsResult.rows[0];
          liveContext += `\n## Live GreenChainz Business Data (as of now)\n`;
          liveContext += `- Suppliers on platform: ${Number(c?.suppliers_count ?? 0)}\n`;
          liveContext += `- RFQs submitted: ${Number(c?.rfqs_count ?? 0)}\n`;
          liveContext += `- CRM leads: ${Number(c?.leads_count ?? 0)}\n`;
          liveContext += `- Outreach emails pending: ${Number(c?.pending_emails ?? 0)}, sent: ${Number(c?.sent_emails ?? 0)}, failed: ${Number(c?.failed_emails ?? 0)}\n`;

          // Recent scraper activity
          const scrapersResult = await db.execute<{
            scraper_name: string;
            status: string;
            records_found: string | number | null;
            started_at: Date | string | null;
          }>(sql`
            SELECT DISTINCT ON (scraper_name) scraper_name, status, records_found, started_at
            FROM scraper_runs
            ORDER BY scraper_name, started_at DESC
            LIMIT 10
          `).catch(() => ({ rows: [] as Array<{ scraper_name: string; status: string; records_found: string | number | null; started_at: Date | string | null }> }));
          if (scrapersResult.rows.length > 0) {
            liveContext += `- Recent scraper activity:\n`;
            for (const row of scrapersResult.rows) {
              const records = row.records_found != null ? ` (${Number(row.records_found)} records)` : "";
              const ran = row.started_at ? ` — last ran ${new Date(row.started_at).toLocaleDateString()}` : "";
              liveContext += `  • ${row.scraper_name}: ${row.status}${records}${ran}\n`;
            }
          }

          // Recent leads breakdown by category
          const categoryResult = await db.execute<{
            category: string | null;
            count: string | number;
          }>(sql`
            SELECT category, COUNT(*) AS count
            FROM crm_contacts
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY count DESC
            LIMIT 8
          `).catch(() => ({ rows: [] as Array<{ category: string | null; count: string | number }> }));
          if (categoryResult.rows.length > 0) {
            liveContext += `- Lead categories: ${categoryResult.rows.map((r) => `${r.category} (${Number(r.count)})`).join(", ")}\n`;
          }
        }
      } catch (ctxErr) {
        // Non-fatal — AI still works without live context
        console.warn("[admin] AI chat context fetch failed:", ctxErr);
      }

      // Optionally enrich with Fabric workspace items
      let fabricContext = "";
      const fabricWorkspaceId = process.env.FABRIC_WORKSPACE_ID ?? "";
      if (fabricWorkspaceId) {
        try {
          const fabricToken = await getClientCredentialsToken("https://api.fabric.microsoft.com/.default");
          const fabricResponse = await fetch(
            `https://api.fabric.microsoft.com/v1/workspaces/${encodeURIComponent(fabricWorkspaceId)}/items`,
            { headers: { Authorization: `Bearer ${fabricToken}` } }
          );
          if (fabricResponse.ok) {
            const fabricPayload = await fabricResponse.json() as {
              value?: Array<{ displayName?: string; type?: string }>;
            };
            const items = fabricPayload.value ?? [];
            if (items.length > 0) {
              fabricContext = `\n## Microsoft Fabric Workspace\n- Items: ${items.map((i) => `${i.displayName ?? "unnamed"} (${i.type ?? "unknown"})`).join(", ")}\n`;
            }
          }
        } catch (fabricErr) {
          console.warn("[admin] AI chat Fabric context fetch failed:", fabricErr);
        }
      }

      const systemPrompt =
        "You are the founder's internal GreenChainz AI copilot. GreenChainz is a B2B marketplace for verified sustainable building materials, targeting architects and contractors. " +
        "Prioritize: supplier onboarding to hit 50 verified suppliers, RFQ conversion, lead progression through the CRM, and actionable growth decisions. " +
        "Keep answers concise, practical, and revenue-focused. Use the live business data below to give grounded, specific answers — not generic advice." +
        liveContext +
        fabricContext;

      const { invokeLLM } = await import('../_core/llm');
      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ],
      });

      const raw = result.choices[0]?.message?.content;
      const reply = typeof raw === "string" ? raw : Array.isArray(raw)
        ? raw.map((part) => ("text" in part ? part.text : "")).join("\n").trim()
        : "";

      if (!reply) {
        throw new Error("LLM returned an empty response");
      }

      res.json({ reply });
    } catch (err) {
      console.error('[admin] AI chat error:', err);
      res.status(500).json(createErrorResponse('AI chat failed', getRequestId(req), err instanceof Error ? err.message : String(err)));
    }
  });

  app.get('/api/admin/intelligence/sharepoint/files', adminRateLimit, async (req, res) => {
    try {
      const user = await requireEasyAuthAdminUser(req, res);
      if (!user) return;

      const siteId = getRequiredEnvAny(["SHAREPOINT_SITE_ID"], "SharePoint site id");
      const driveId = getRequiredEnvAny(["SHAREPOINT_DRIVE_ID"], "SharePoint drive id");
      const folderPath = normalizeSharePointPath(typeof req.query.path === "string" ? req.query.path : "");
      const accessToken = await getClientCredentialsToken("https://graph.microsoft.com/.default");

      type GraphListResponse = {
        value?: Array<{
          id: string;
          name: string;
          webUrl?: string;
          size?: number;
          lastModifiedDateTime?: string;
          file?: Record<string, unknown>;
          folder?: { childCount?: number };
        }>;
      };

      const listPath = folderPath.length > 0
        ? `/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/root:/${folderPath}:/children?$top=200`
        : `/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/root/children?$top=200`;

      const payload = await callGraphJson<GraphListResponse>(accessToken, listPath);
      const rows = (payload.value ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        webUrl: item.webUrl ?? null,
        size: item.size ?? null,
        lastModifiedAt: item.lastModifiedDateTime ?? null,
        type: item.folder ? "folder" : "file",
        childCount: item.folder?.childCount ?? null,
      }));

      res.json({
        siteId,
        driveId,
        path: folderPath,
        items: rows,
      });
    } catch (err) {
      console.error('[admin] SharePoint list error:', err);
      res.status(500).json(createErrorResponse('SharePoint listing failed', getRequestId(req), err instanceof Error ? err.message : String(err)));
    }
  });

  app.post(
    '/api/admin/intelligence/sharepoint/upload',
    adminRateLimit,
    (req, res, next) => {
      const multer = require('multer');
      const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
      upload.single('file')(req, res, (err: unknown) => {
        if (err && typeof err === 'object' && (err as { code?: string }).code === 'LIMIT_FILE_SIZE') {
          res.status(413).json(createErrorResponse('File too large — max 25 MB', getRequestId(req)));
          return;
        }
        if (err) {
          next(err);
          return;
        }
        next();
      });
    },
    async (req, res) => {
      try {
        const user = await requireEasyAuthAdminUser(req, res);
        if (!user) return;

        const siteId = getRequiredEnvAny(["SHAREPOINT_SITE_ID"], "SharePoint site id");
        const driveId = getRequiredEnvAny(["SHAREPOINT_DRIVE_ID"], "SharePoint drive id");
        const folderPath = normalizeSharePointPath(
          typeof req.body?.path === "string" ? req.body.path : ""
        );
        const file = req.file;
        if (!file) {
          res.status(400).json(createErrorResponse("No file uploaded. Use form field name 'file'.", getRequestId(req)));
          return;
        }

        const safeFileName = file.originalname.replace(/[\\/:*?"<>|]/g, "_");
        const graphPath = folderPath.length > 0
          ? `/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/root:/${folderPath}/${encodeURIComponent(safeFileName)}:/content`
          : `/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/root:/${encodeURIComponent(safeFileName)}:/content`;
        const accessToken = await getClientCredentialsToken("https://graph.microsoft.com/.default");

        const uploadResponse = await fetch(`https://graph.microsoft.com/v1.0${graphPath}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": file.mimetype || "application/octet-stream",
          },
          body: file.buffer,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Graph upload failed ${uploadResponse.status}: ${errorText}`);
        }

        const payload = await uploadResponse.json() as { id?: string; name?: string; webUrl?: string };
        res.json({
          success: true,
          item: {
            id: payload.id ?? null,
            name: payload.name ?? safeFileName,
            webUrl: payload.webUrl ?? null,
            path: folderPath,
          },
        });
      } catch (err) {
        console.error('[admin] SharePoint upload error:', err);
        res.status(500).json(createErrorResponse('SharePoint upload failed', getRequestId(req), err instanceof Error ? err.message : String(err)));
      }
    }
  );

  app.get('/api/admin/intelligence/fabric/overview', adminRateLimit, async (req, res) => {
    try {
      const user = await requireEasyAuthAdminUser(req, res);
      if (!user) return;

      const { getDb } = await import('../db');
      const db = await getDb();
      if (!db) {
        res.status(503).json(createErrorResponse('Database unavailable', getRequestId(req)));
        return;
      }

      const { sql } = await import("drizzle-orm");
      const countsResult = await db.execute<{
        suppliers_count: string | number;
        rfqs_count: string | number;
        leads_count: string | number;
      }>(sql`
        SELECT
          (SELECT COUNT(*) FROM suppliers) AS suppliers_count,
          (SELECT COUNT(*) FROM rfqs) AS rfqs_count,
          (SELECT COUNT(*) FROM crm_contacts) AS leads_count
      `);
      const countsRow = countsResult.rows[0];
      const counts = {
        suppliers: Number(countsRow?.suppliers_count ?? 0),
        rfqs: Number(countsRow?.rfqs_count ?? 0),
        leads: Number(countsRow?.leads_count ?? 0),
      };

      const workspaceId = process.env.FABRIC_WORKSPACE_ID ?? "";
      if (!workspaceId) {
        res.json({
          configured: false,
          counts,
          workspace: null,
          items: [],
          message: "Set FABRIC_WORKSPACE_ID to enable live Microsoft Fabric data.",
        });
        return;
      }

      const fabricToken = await getClientCredentialsToken("https://api.fabric.microsoft.com/.default");
      const itemsResponse = await fetch(`https://api.fabric.microsoft.com/v1/workspaces/${encodeURIComponent(workspaceId)}/items`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${fabricToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!itemsResponse.ok) {
        const errorText = await itemsResponse.text();
        throw new Error(`Fabric API error ${itemsResponse.status}: ${errorText}`);
      }

      const itemsPayload = await itemsResponse.json() as {
        value?: Array<{ id?: string; displayName?: string; type?: string; description?: string | null }>;
      };

      res.json({
        configured: true,
        counts,
        workspace: { id: workspaceId },
        items: (itemsPayload.value ?? []).map((item) => ({
          id: item.id ?? null,
          name: item.displayName ?? "Unnamed item",
          type: item.type ?? "unknown",
          description: item.description ?? null,
        })),
      });
    } catch (err) {
      console.error('[admin] Fabric overview error:', err);
      res.status(500).json(createErrorResponse('Fabric overview failed', getRequestId(req), err instanceof Error ? err.message : String(err)));
    }
  });

  app.get('/api/admin/workiq', adminRateLimit, async (req, res) => {
    try {
      const user = await requireEasyAuthAdminUser(req, res);
      if (!user) return;

      // Graph scopes required:
      // - Analytics.Read (for /me/analytics/activityStatistics)
      // - Reports.Read.All (for /reports/getM365AppUserDetail)
      const delegatedToken = getDelegatedGraphTokenFromRequest(req);
      const appToken = await getClientCredentialsToken("https://graph.microsoft.com/.default");
      const tokenMode = delegatedToken ? "delegated" : "app";

      let meetingHours: number | null = null;
      let focusTimeHours: number | null = null;
      let collaborationHours: number | null = null;
      let topCollaborators: string[] = [];
      let activityStatistics: unknown[] = [];

      if (delegatedToken) {
        try {
          const analyticsResponse = await callGraphJson<{ value?: Array<Record<string, unknown>> }>(
            delegatedToken,
            `/me/analytics/activityStatistics`
          );
          const stats = analyticsResponse.value ?? [];
          activityStatistics = stats;

          for (const row of stats) {
            const label = String(row.displayName ?? row.activity ?? row.activityType ?? "").toLowerCase();
            const rawHours = Number(row.hours ?? row.value ?? row.metricValue ?? row.timeSpentInHours ?? 0);
            if (label.includes("meeting")) meetingHours = rawHours;
            else if (label.includes("focus")) focusTimeHours = rawHours;
            else if (label.includes("collaboration")) collaborationHours = rawHours;

            const collaborator = row.personName ?? row.collaborator ?? row.userPrincipalName;
            if (typeof collaborator === "string" && collaborator.trim().length > 0) {
              topCollaborators.push(collaborator.trim());
            }
          }
          topCollaborators = Array.from(new Set(topCollaborators)).slice(0, 5);
        } catch (analyticsError) {
          console.warn("[admin] WorkIQ analytics endpoint unavailable:", analyticsError);
        }
      }

      const reportResponse = await fetch(
        "https://graph.microsoft.com/v1.0/reports/getM365AppUserDetail(period='D7')",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${appToken}`,
            Accept: "text/csv",
          },
        }
      );

      let reportPreview: Array<Record<string, string>> = [];
      let reportStatus: "ok" | "unavailable" = "unavailable";
      if (reportResponse.ok) {
        const csv = await reportResponse.text();
        reportPreview = parseCsvText(csv);
        reportStatus = "ok";
      } else {
        const reportErr = await reportResponse.text();
        console.warn("[admin] WorkIQ report endpoint unavailable:", reportResponse.status, reportErr);
      }

      res.json({
        source: tokenMode,
        insights: {
          meetingHours,
          focusTimeHours,
          collaborationHours,
          topCollaborators,
        },
        activityStatistics,
        reportStatus,
        reportPreview,
      });
    } catch (err) {
      console.error('[admin] WorkIQ error:', err);
      res.status(500).json(createErrorResponse('WorkIQ request failed', getRequestId(req), err instanceof Error ? err.message : String(err)));
    }
  });

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

      const userId = parseAdminUserId(req.query.userId);
      if (!userId) {
        res.status(400).json(createErrorResponse('userId query parameter is required and must be a positive integer', getRequestId(req)));
        return;
      }

      const { getDb } = await import('../db');
      const { eq } = await import('drizzle-orm');
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
      // NOTE: CCPA/GDPR "right to access" requires disclosing ALL data held,
      // including soft-deleted RFQs (deletedAt IS NOT NULL). The rfqs query
      // therefore intentionally omits the deletedAt filter used in normal reads.
      const [
        supplierRows,
        rfqRows,
        messageRows,
        notificationRows,
        dsrRows,
      ] = await Promise.all([
        db.select().from(schema.suppliers).where(eq(schema.suppliers.userId, userId)),
        db.select().from(schema.rfqs).where(eq(schema.rfqs.userId, userId)),
        db.select().from(schema.messages).where(eq(schema.messages.senderId, userId)),
        db.select().from(schema.notifications).where(eq(schema.notifications.userId, userId)),
        db.select().from(schema.dataSubjectRequests).where(eq(schema.dataSubjectRequests.targetUserId, userId)),
      ]);

      // Leads are keyed by email — only query when the user has an email address.
      // Known limitation: the leads table has no userId FK, so this matches any
      // lead captured with the same email. For shared organisational addresses
      // this may include leads from other users. Admin should review carefully.
      const leadRows = userRow.email
        ? await db.select().from(schema.leads).where(eq(schema.leads.email, userRow.email))
        : [];

      res.json({
        exportedAt: new Date().toISOString(),
        userId,
        profile: userRow,
        suppliers: supplierRows,
        // Includes soft-deleted RFQs — required for CCPA right-to-access disclosure.
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
      const targetUserId = parseAdminUserId(body.targetUserId);
      const type = String(body.type ?? '');
      const notes = typeof body.notes === 'string' ? body.notes : undefined;

      if (!targetUserId) {
        res.status(400).json(createErrorResponse('targetUserId is required and must be a positive integer', getRequestId(req)));
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
