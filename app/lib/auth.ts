import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { getPool } from "@/lib/db";
import { loadSecrets } from "@/lib/secrets";

// Load secrets from Key Vault (production) or .env.local (development)
// Must complete before betterAuth reads process.env
await loadSecrets();

const db = drizzle(getPool());

export const auth = betterAuth({
  // AUTH_SECRET is loaded from Key Vault secret "AUTH-SECRET"
  // Falls back to BETTER_AUTH_SECRET for local dev (.env.local)
  secret: process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    microsoft: {
      // Key Vault maps "AZURE-AD-CLIENT-ID" → AZURE_AD_CLIENT_ID
      // .env.local may use AZURE_CLIENT_ID — support both
      clientId: (process.env.AZURE_AD_CLIENT_ID || process.env.AZURE_CLIENT_ID) as string,
      clientSecret: (process.env.AZURE_AD_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET) as string,
      tenantId: (process.env.AZURE_AD_TENANT_ID || process.env.AZURE_TENANT_ID) as string,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "architect",
        input: false,
      },
    },
  },
});
