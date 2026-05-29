// middleware/parseAuth.js
const EXPECTED_TENANT_ID = process.env.AAD_TENANT_ID;
const EXPECTED_CLIENT_ID = process.env.AAD_CLIENT_ID;

export function parseAuth(req, res, next) {
  const clientPrincipal = req.headers["x-ms-client-principal"];

  if (!clientPrincipal) {
    return next();
  }

  if (!EXPECTED_TENANT_ID || !EXPECTED_CLIENT_ID) {
    return res.status(500).json({ error: "Missing auth configuration" });
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(clientPrincipal, "base64").toString("utf-8")
    );

    const { claims = [], userDetails, identityProvider } = decoded;

    const normalizedIdentityProvider = String(identityProvider || "").toLowerCase();
    const isAllowedIdentityProvider =
      normalizedIdentityProvider === "aad" ||
      normalizedIdentityProvider.includes("activedirectory");

    if (!isAllowedIdentityProvider) {
      return res.status(401).json({ error: "Invalid identity provider" });
    }

    const tenantId = claims.find((c) => c.typ === "tid")?.val;
    if (tenantId !== EXPECTED_TENANT_ID) {
      return res.status(403).json({ error: "Invalid tenant" });
    }

    const audience =
      claims.find((c) => c.typ === "aud")?.val ||
      claims.find((c) => c.typ === "appid")?.val;

    if (audience !== EXPECTED_CLIENT_ID) {
      return res.status(403).json({ error: "Invalid audience" });
    }

    const userId =
      claims.find((c) => c.typ === "oid")?.val ||
      claims.find((c) => c.typ === "http://schemas.microsoft.com/identity/claims/objectidentifier")
        ?.val ||
      claims.find((c) => c.typ === "sub")?.val;

    if (!userId) {
      return res.status(403).json({ error: "Missing user identifier" });
    }

    const rawRoles = decoded.userRoles || [];

    // Normalize to internal role model
    let role = "user";
    if (rawRoles.includes("admin")) role = "admin";
    else if (rawRoles.includes("architect")) role = "architect";
    else if (rawRoles.includes("supplier")) role = "supplier";

    req.auth = {
      userId,
      email: userDetails,
      tenantId,
      role,
      rawRoles,
    };

    return next();
  } catch (err) {
    console.error("Auth parsing error:", err);
    return res.status(401).json({ error: "Invalid auth payload" });
  }
}
