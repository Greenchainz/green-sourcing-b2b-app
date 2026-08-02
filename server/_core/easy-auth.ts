/**
 * Azure Easy Auth — x-ms-client-principal Header Parser
 *
 * When Azure Container Apps Easy Auth is enabled, the sidecar proxy injects
 * x-ms-client-principal into every authenticated request. This header contains
 * a Base64-encoded JSON object describing the authenticated user's identity
 * and claims from the configured identity provider (Microsoft Entra ID).
 *
 * This module:
 *   1. Parses the header on every incoming request
 *   2. Exposes a typed ClientPrincipal for use in auth flows
 *   3. Provides a fallback-safe API — all fields are optional so callers
 *      degrade gracefully when Easy Auth is not yet enabled
 *
 * IMPORTANT: This module NEVER trusts the raw header value as ground truth for
 * authorization when the custom JWT cookie is also present. The signed JWT cookie
 * is the primary session token. Easy Auth is used as a supplemental identity
 * source — e.g. to read app role assignments injected by the sidecar.
 *
 * Architecture note:
 *   Production: Azure Container Apps sidecar validates the Entra ID token,
 *               cryptographically verifies claims, then injects the header.
 *               The application must NOT attempt to re-verify the JWT itself.
 *
 *   Local dev:  The header is absent; all Easy Auth helpers return null/empty.
 *               Dev auth falls through to the custom JWT cookie flow.
 *
 * Reference: https://learn.microsoft.com/azure/container-apps/authentication
 */

import type { Request, Response, NextFunction } from "express";
import { log } from "./log";
import { sdk } from "./sdk";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EasyAuthClaim {
  /** Claim type — e.g. "http://schemas.microsoft.com/identity/claims/objectidentifier" */
  typ: string;
  /** Claim value */
  val: string;
}

export interface ClientPrincipal {
  /** Identity provider — "aad" for Microsoft Entra ID, "github" for GitHub, etc. */
  auth_typ: string;
  /** Claim type name used as the primary display name (e.g. "name") */
  name_typ: string;
  /** Claim type name used for role parsing */
  role_typ: string;
  /** Identity claims from the provider */
  claims: EasyAuthClaim[];
}

export interface ParsedEasyAuthIdentity {
  /** Entra ID Object ID (oid claim) — stable across tenant changes */
  objectId: string | null;
  /** User principal name (upn/email) */
  upn: string | null;
  /** Display name */
  name: string | null;
  /** Application roles assigned in Entra ID App Registration */
  appRoles: string[];
  /** Whether Easy Auth is active for this request */
  isEasyAuthRequest: boolean;
  /** Raw principal for advanced claim inspection */
  raw: ClientPrincipal | null;
}

// ── Known claim type URIs ─────────────────────────────────────────────────────

const CLAIM_TYPES = {
  objectId: "http://schemas.microsoft.com/identity/claims/objectidentifier",
  upn: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn",
  email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
  name: "name",
  // App Role Assignments surface under this claim type
  roles: "roles",
  // Short-form alternatives used by some AAD configurations
  shortObjectId: "oid",
  shortUpn: "upn",
  shortEmail: "email",
  shortName: "name",
} as const;

// ── Parser ────────────────────────────────────────────────────────────────────

/**
 * Parse the x-ms-client-principal header injected by Azure Easy Auth.
 *
 * Returns a fully typed identity when the header is present and valid.
 * Returns a safe empty identity when Easy Auth is absent (local dev, direct traffic).
 */
export function parseEasyAuthHeader(req: Request): ParsedEasyAuthIdentity {
  const empty: ParsedEasyAuthIdentity = {
    objectId: null,
    upn: null,
    name: null,
    appRoles: [],
    isEasyAuthRequest: false,
    raw: null,
  };

  const headerValue = req.headers["x-ms-client-principal"];
  if (!headerValue || typeof headerValue !== "string") {
    return empty;
  }

  let principal: ClientPrincipal;
  try {
    const decoded = Buffer.from(headerValue, "base64").toString("utf8");
    principal = JSON.parse(decoded) as ClientPrincipal;
  } catch (err) {
    log.warn("easy-auth.parse.failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return empty;
  }

  if (!principal || !Array.isArray(principal.claims)) {
    log.warn("easy-auth.malformed-principal", { hasAuthTyp: !!principal?.auth_typ });
    return empty;
  }

  // Filter to structurally valid claims only. A well-formed header could still
  // contain null entries or objects missing string typ/val fields; dereferencing
  // those would throw and turn this middleware into a 500.
  // Cast to unknown[] first so the type guard performs a real runtime check
  // rather than a tautological one against the declared EasyAuthClaim type.
  const claims = (principal.claims as unknown[]).filter(
    (claim): claim is EasyAuthClaim =>
      Boolean(claim) &&
      typeof (claim as Partial<EasyAuthClaim>).typ === "string" &&
      typeof (claim as Partial<EasyAuthClaim>).val === "string"
  );

  // ── Extract specific claims ───────────────────────────────────────────────
  const getClaim = (...types: string[]): string | null => {
    for (const typ of types) {
      const match = claims.find(
        (c) => c.typ === typ || c.typ.toLowerCase() === typ.toLowerCase()
      );
      if (match?.val) return match.val;
    }
    return null;
  };

  const objectId = getClaim(CLAIM_TYPES.objectId, CLAIM_TYPES.shortObjectId);
  const upn = getClaim(CLAIM_TYPES.upn, CLAIM_TYPES.email, CLAIM_TYPES.shortUpn, CLAIM_TYPES.shortEmail);
  const name = getClaim(CLAIM_TYPES.name, CLAIM_TYPES.shortName);

  // App Role Assignments — Azure injects one claim per assigned role
  const appRoles = claims
    .filter((c) => c.typ === CLAIM_TYPES.roles)
    .map((c) => c.val)
    .filter(Boolean);

  return {
    objectId,
    upn,
    name,
    appRoles,
    isEasyAuthRequest: true,
    raw: principal,
  };
}

/**
 * Express middleware that attaches the parsed Easy Auth identity to req.easyAuth.
 *
 * Mount this BEFORE route handlers so every handler can call req.easyAuth
 * without needing to parse the header themselves.
 *
 * This middleware never rejects requests — it silently attaches an empty
 * identity when the header is absent (local dev mode). Route guards that
 * require Easy Auth should check `req.easyAuth.isEasyAuthRequest`.
 */
export function easyAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  (req as Request & { easyAuth: ParsedEasyAuthIdentity }).easyAuth =
    parseEasyAuthHeader(req);
  next();
}

/**
 * Guard: enforce canonical server-side JWT cookie authentication.
 *
 * This guard intentionally does NOT trust `x-ms-client-principal` as an auth
 * signal. It delegates to the same signed cookie verification path used by
 * `protectedProcedure` via sdk.authenticateRequest(req).
 */
export async function requireEasyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = await sdk.authenticateRequest(req);
  if (!user) {
    res.status(401).json({
      error: "Unauthorized",
      detail: "Valid authenticated session is required.",
    });
    return;
  }
  next();
}
