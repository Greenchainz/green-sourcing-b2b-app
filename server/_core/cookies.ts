/**
 * Session cookie configuration.
 *
 * ⚠️  SameSite MUST be "lax" in production. Do NOT change to "none".
 * SameSite=None causes browsers to drop the cookie (third-party cookie
 * restrictions). SameSite=Lax works for same-origin API calls and
 * OAuth redirect callbacks. See docs/AUTH_ARCHITECTURE.md.
 */
import type { CookieOptions, Request } from "express";

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
  const domain = host.endsWith("greenchainz.com") ? ".greenchainz.com" : undefined;

  const secure = isSecureRequest(req);
  return {
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
