import type express from "express";
import { getAzureCredential } from "../lib/azure/credentials";
import { sdk } from "./_core/sdk";
import { INTELLIGENCE_FUNCTION_APP, INTELLIGENCE_SCRAPERS } from "./intelligence/intelligence-config";

const ARM_API_VERSION = "2022-03-01";
const ARM_SCOPE = "https://management.azure.com/.default";
const ALLOWED_SCRAPERS: Set<string> = new Set(INTELLIGENCE_SCRAPERS.map((s) => s.name));

type TriggerRequestBody = {
  scraperName?: unknown;
  payload?: unknown;
};

function createErrorResponse(message: string, requestId: string, detail?: string) {
  return {
    error: message,
    request_id: requestId,
    ...(detail ? { detail } : {}),
  };
}

function getRequestId(req: express.Request): string {
  return req.id ?? "unknown";
}

async function requireFounderOrAdminUser(req: express.Request, res: express.Response) {
  const user = await sdk.authenticateRequest(req).catch(() => null);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  if (user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return user;
}

async function getFunctionHostKey(): Promise<string> {
  const credential = getAzureCredential();
  const token = await credential.getToken(ARM_SCOPE);
  if (!token?.token) {
    throw new Error("Failed to acquire Azure ARM access token");
  }

  const resourceId = [
    "/subscriptions",
    INTELLIGENCE_FUNCTION_APP.subscriptionId,
    "resourceGroups",
    INTELLIGENCE_FUNCTION_APP.resourceGroup,
    "providers",
    "Microsoft.Web",
    "sites",
    INTELLIGENCE_FUNCTION_APP.appName,
  ].join("/");

  const listKeysUrl = `https://management.azure.com${resourceId}/host/default/listKeys?api-version=${ARM_API_VERSION}`;
  const response = await fetch(listKeysUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ARM listKeys failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    masterKey?: string;
    functionKeys?: Record<string, string>;
  };
  const key = data.functionKeys?.default ?? data.masterKey;
  if (!key) {
    throw new Error("No function host key returned by ARM listKeys");
  }

  return key;
}

export function registerIntelligenceRoutes(
  app: express.Express,
  adminRateLimit: express.RequestHandler
): void {
  app.post("/api/intelligence/trigger", adminRateLimit, async (req, res) => {
    const user = await requireFounderOrAdminUser(req, res);
    if (!user) return;

    const body = req.body as TriggerRequestBody;
    const scraperName = typeof body.scraperName === "string" ? body.scraperName.trim() : "";
    if (!scraperName) {
      res.status(400).json(createErrorResponse("scraperName is required", getRequestId(req)));
      return;
    }
    if (!ALLOWED_SCRAPERS.has(scraperName)) {
      res
        .status(400)
        .json(createErrorResponse(`Unsupported scraperName '${scraperName}'`, getRequestId(req)));
      return;
    }

    try {
      const hostKey = await getFunctionHostKey();
      const triggerUrl = `https://${INTELLIGENCE_FUNCTION_APP.appName}.azurewebsites.net/api/${encodeURIComponent(scraperName)}`;
      const functionResponse = await fetch(triggerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-functions-key": hostKey,
        },
        body: JSON.stringify(body.payload ?? {}),
      });

      const contentType = functionResponse.headers.get("content-type") ?? "";
      const responseBody = contentType.includes("application/json")
        ? await functionResponse.json()
        : await functionResponse.text();

      if (!functionResponse.ok) {
        res.status(functionResponse.status).json({
          success: false,
          scraperName,
          status: functionResponse.status,
          response: responseBody,
        });
        return;
      }

      res.json({
        success: true,
        scraperName,
        triggeredBy: user.email ?? user.openId,
        response: responseBody,
      });
    } catch (error) {
      console.error("[intelligence] trigger failed:", error);
      res
        .status(500)
        .json(
          createErrorResponse(
            "Failed to trigger intelligence scraper",
            getRequestId(req),
            error instanceof Error ? error.message : String(error)
          )
        );
    }
  });
}
