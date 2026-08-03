/**
 * Session cookie configuration.
 *
 * ⚠️  SameSite MUST be "lax" in production. Do NOT change to "none".
 * SameSite=None causes browsers to drop the cookie (third-party cookie
 * restrictions). SameSite=Lax works for same-origin API calls and
 * OAuth redirect callbacks. See docs/AUTH_ARCHITECTURE.md.
 */
import type { CookieOptions, Request, Response } from "express";

function getRequestHost(req: Request): string {
  const forwardedHostHeader = req.headers["x-forwarded-host"];
  const rawForwardedHost = Array.isArray(forwardedHostHeader)
    ? forwardedHostHeader[0]
    : String(forwardedHostHeader ?? "").split(",")[0].trim();
  const forwardedHost = rawForwardedHost.toLowerCase();
  if (/^[a-z0-9.-]+(?::\d+)?$/.test(forwardedHost)) {
    return forwardedHost.replace(/:\d+$/, "");
  }

  const host = String(req.headers.host ?? "").toLowerCase();
  if (/^[a-z0-9.-]+(?::\d+)?$/.test(host)) {
    return host.replace(/:\d+$/, "");
  }

  return "";
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const host = getRequestHost(req);
  // Keep host-only cookies for localhost/dev domains.
  // In production, share the session across apex + www to prevent OAuth loops
  // when the callback lands on one host and the SPA is served from the other.
  const isProductionHost =
    host === "greenchainz.com" || host === "www.greenchainz.com";
  const domain = isProductionHost ? ".greenchainz.com" : undefined;

  const secure = isSecureRequest(req);
  return {
    domain,
    httpOnly: true,
    path: "/",
    // Lax = cookie sent on same-site requests + top-level cross-site navigations.
    // This is correct for our app: all API calls are same-origin, and OAuth
    // callbacks are top-level navigations (302 redirects from Microsoft/Google).
    // SameSite=None was causing cookies to be dropped in some browsers due to
    // third-party cookie restrictions.
    sameSite: "lax",
    secure,
  };
}

/**
 * Returns cookie options for a host-only (no domain) session cookie.
 * Used alongside the domain-scoped cookie during the migration period to
 * prevent stale host-only values from shadowing the shared domain cookie.
 */
export function hostOnlyCookieOptions(req: Request): {
  httpOnly: true;
  path: "/";
  sameSite: "lax";
  secure: boolean;
} {
  const scopedOptions = getSessionCookieOptions(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: scopedOptions.secure ?? false,
  };
}

/**
 * Issues both a domain-scoped and a host-only session cookie in a single call.
 * Call this from every auth flow (OAuth, email) so both cookie types stay in
 * sync during the migration period.
 */
export function issueSessionCookies(
  req: Request,
  res: Response,
  cookieName: string,
  token: string,
  maxAge: number
): void {
  // Write host-only cookie first so the domain cookie wins on same-host reads
  // (last Set-Cookie header with the same name takes precedence in most browsers).
  res.cookie(cookieName, token, { ...hostOnlyCookieOptions(req), maxAge });
  res.cookie(cookieName, token, { ...getSessionCookieOptions(req), maxAge });
}
