/**
 * Session cookie configuration.
 *
 * ⚠️  SameSite MUST be "lax" in production. Do NOT change to "none".
 * SameSite=None causes browsers to drop the cookie (third-party cookie
 * restrictions). SameSite=Lax works for same-origin API calls and
 * OAuth redirect callbacks. See docs/AUTH_ARCHITECTURE.md.
 */
import type { CookieOptions, Request } from "express";

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
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

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
