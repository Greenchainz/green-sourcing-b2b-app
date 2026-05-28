// middleware/parseAuth.js
const EXPECTED_TENANT_ID = "ca4f78d4-c753-4893-9cd8-1b309922b4dc";
const EXPECTED_CLIENT_ID = "479e2a01-70ab-4df9-baa4-560d317c3423";

function parseAuth(req, res, next) {
  const clientPrincipal = req.headers["x-ms-client-principal"];

  if (!clientPrincipal) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(clientPrincipal, "base64").toString("utf-8")
    );

    const { claims = [], userDetails, identityProvider } = decoded;

    if (identityProvider !== "aad") {
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

    const rawRoles = decoded.userRoles || [];

    // Normalize to internal role model
    let role = "user";
    if (rawRoles.includes("admin")) role = "admin";
    else if (rawRoles.includes("architect")) role = "architect";
    else if (rawRoles.includes("supplier")) role = "supplier";

    req.auth = {
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

module.exports = { parseAuth };
