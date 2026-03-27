import { z } from 'zod';

// Azure-first environment validation for Next.js + backend shared usage.
const envSchema = z.object({
    // Core
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    // Identity (Microsoft Entra ID)
    AZURE_AD_CLIENT_ID: z.string().min(1, 'Entra Client ID is required'),
    AZURE_AD_CLIENT_SECRET: z.string().min(1, 'Entra Client Secret is required'),
    AZURE_AD_TENANT_ID: z.string().min(1, 'Entra Tenant ID is required'),

    // Database (Azure Database for PostgreSQL)
    // Option A — connection string: DATABASE_URL=postgresql://USER:PASS@HOST:5432/DBNAME?sslmode=require
    DATABASE_URL: z.string().url().optional().describe('PostgreSQL connection string (Option A)'),

    // Option B — individual Azure Service Connector variables
    AZURE_POSTGRESQL_HOST: z.string().optional().describe('Azure PostgreSQL host'),
    AZURE_POSTGRESQL_PORT: z.coerce.number().optional().describe('Azure PostgreSQL port (default: 5432)'),
    AZURE_POSTGRESQL_DATABASE: z.string().optional().describe('Azure PostgreSQL database name'),
    AZURE_POSTGRESQL_USER: z.string().optional().describe('Azure PostgreSQL username'),
    AZURE_POSTGRESQL_PASSWORD: z.string().optional().describe('Azure PostgreSQL password'),

    // Managed identity (optional — production only)
    // Set to the user-assigned managed identity client ID (id-greenchainz-backend).
    // Do NOT set this to the Entra app registration CLIENT_ID — they are different identities.
    MANAGED_IDENTITY_CLIENT_ID: z.string().optional().describe('User-assigned managed identity client ID (id-greenchainz-backend)'),

    // Cache (Azure Cache for Redis)
    REDIS_HOST: z.string().min(1, 'Azure Redis Host is required'),
    REDIS_PORT: z.coerce.number().default(6380),

    // App Config (optional)
    AZURE_APPCONFIG_ENDPOINT: z.string().optional(),

    // Storage (Azure Blob Storage)
    AZURE_STORAGE_ACCOUNT_NAME: z.string().optional(),
    AZURE_STORAGE_CONTAINER_NAME: z.string().optional(),
}).superRefine((data, ctx) => {
    // Require either DATABASE_URL (Option A) or the minimum individual vars (Option B)
    const hasConnectionString = Boolean(data.DATABASE_URL);
    const hasIndividualVars = Boolean(
        data.AZURE_POSTGRESQL_HOST &&
        data.AZURE_POSTGRESQL_DATABASE &&
        data.AZURE_POSTGRESQL_USER &&
        data.AZURE_POSTGRESQL_PASSWORD
    );

    if (!hasConnectionString && !hasIndividualVars) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
                'PostgreSQL is not configured. Set DATABASE_URL (Option A) or ' +
                'AZURE_POSTGRESQL_HOST + AZURE_POSTGRESQL_DATABASE + AZURE_POSTGRESQL_USER + AZURE_POSTGRESQL_PASSWORD (Option B).',
        });
    }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('Invalid Azure environment variables:', parsed.error.format());
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Critical Azure configuration missing.');
    }
}

export const env = parsed.success ? parsed.data : (process.env as unknown as z.infer<typeof envSchema>);
