// Test AAD-token auth against the GreenChainz Postgres flexible server.
// Usage:  node scripts/test-aad-pg.mjs
//
// Tries a few common principal name shapes and reports which one works.

import { DefaultAzureCredential } from "@azure/identity";
import pg from "pg";

const HOST = "greenchainz-db-prod.postgres.database.azure.com";
const DB = "postgres";

// Use the GreenChainz tenant (subscription tenant) for DB AAD
const dbTenant = process.env.POSTGRES_AAD_TENANT_ID ?? "1d04bf50-8175-40af-a9d5-f8e441460b06";
console.log(`Using AAD tenant: ${dbTenant}`);
const credential = new DefaultAzureCredential({ tenantId: dbTenant });
const tokenResp = await credential.getToken("https://ossrdbms-aad.database.windows.net/.default");
if (!tokenResp) {
  console.error("✗ Failed to fetch AAD token. Are you `az login`'d?");
  process.exit(1);
}
console.log(`✓ Got AAD token (expires in ${Math.round((tokenResp.expiresOnTimestamp - Date.now()) / 1000 / 60)} min)`);

// Candidates to try
const candidates = [
  "founder@greenchainz.com",
  "jnorville4321@hotmail.com",
  "founder",
  "jerit",
  "admin",
];

for (const user of candidates) {
  const client = new pg.Client({
    host: HOST,
    port: 5432,
    database: DB,
    user,
    password: tokenResp.token,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    const result = await client.query("SELECT current_user, session_user, current_database()");
    console.log(`✓ SUCCESS as user="${user}":`, result.rows[0]);
    await client.end();
    console.log(`\n  → Use this in your DATABASE_URL: user=${user}`);
    process.exit(0);
  } catch (err) {
    console.log(`✗ Failed as user="${user}": ${err.message.slice(0, 100)}`);
    try { await client.end(); } catch {}
  }
}

console.error("\n✗ None of the candidates worked. Run the ad-admin list command and paste the actual principal name.");
process.exit(1);
