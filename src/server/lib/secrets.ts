import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

let loaded = false;

export async function loadSecrets(): Promise<void> {
  if (loaded) return;
  const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
  if (!vaultUrl) {
    console.warn("[secrets] AZURE_KEY_VAULT_URL not set — skipping Key Vault load");
    return;
  }
  try {
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(vaultUrl, credential);
    const results = await Promise.allSettled([
      client.getSecret("JWT-SECRET"),
      client.getSecret("DATABASE-URL"),
      client.getSecret("OAUTH-SERVER-URL"),
    ]);
    const [jwtResult, dbResult, oauthResult] = results;
    if (jwtResult.status === "fulfilled" && jwtResult.value.value) process.env.JWT_SECRET = jwtResult.value.value;
    else console.warn("[secrets] JWT-SECRET not loaded:", jwtResult.status === "rejected" ? jwtResult.reason?.message : "empty");
    if (dbResult.status === "fulfilled" && dbResult.value.value) process.env.DATABASE_URL = dbResult.value.value;
    else console.warn("[secrets] DATABASE-URL not loaded:", dbResult.status === "rejected" ? dbResult.reason?.message : "empty");
    if (oauthResult.status === "fulfilled" && oauthResult.value.value) process.env.OAUTH_SERVER_URL = oauthResult.value.value;
    if (jwtResult.status === "fulfilled" && jwtResult.value.value)
      process.env.JWT_SECRET = jwtResult.value.value;
    else console.warn("[secrets] JWT-SECRET not loaded:", jwtResult.status === "rejected" ? jwtResult.reason?.message : "empty");
    if (dbResult.status === "fulfilled" && dbResult.value.value)
      process.env.DATABASE_URL = dbResult.value.value;
    else console.warn("[secrets] DATABASE-URL not loaded:", dbResult.status === "rejected" ? dbResult.reason?.message : "empty");
    if (oauthResult.status === "fulfilled" && oauthResult.value.value)
      process.env.OAUTH_SERVER_URL = oauthResult.value.value;
    else console.warn("[secrets] OAUTH-SERVER-URL not loaded:", oauthResult.status === "rejected" ? oauthResult.reason?.message : "empty");
    loaded = true;
    console.log("[secrets] Key Vault load complete ✓");
  } catch (err) {
    console.error("[secrets] Key Vault load failed (non-fatal):", (err as Error).message);
  }
}
