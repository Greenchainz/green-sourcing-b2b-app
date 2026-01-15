import { z } from 'zod';

// Azure-first environment validation for Next.js + backend shared usage.
// Replace any legacy Supabase vars with Azure resources (Entra ID, PostgreSQL, Blob).
const envSchema = z.object({
    // Core
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    // Identity (Microsoft Entra ID)
    AZURE_AD_CLIENT_ID: z.string().min(1, 'Entra Client ID is required'),
    AZURE_AD_CLIENT_SECRET: z.string().min(1, 'Entra Client Secret is required'),
    AZURE_AD_TENANT_ID: z.string().min(1, 'Entra Tenant ID is required'),

    // Database (Azure Database for PostgreSQL)
    // Format: postgres://<user>:<password>@<host>:5432/<dbname>
    DATABASE_URL: z.string().url().describe('Connection string for Azure Database for PostgreSQL'),

    // Managed identity (optional)
    AZURE_CLIENT_ID: z.string().optional().describe('User-assigned managed identity client ID'),

    // Cache (Azure Cache for Redis)
    REDIS_HOST: z.string().min(1, 'Azure Redis Host is required'),
    REDIS_PORT: z.coerce.number().default(6380),

    // App Config (optional)
    AZURE_APPCONFIG_ENDPOINT: z.string().optional(),

    // Storage (Azure Blob Storage)
    AZURE_STORAGE_ACCOUNT_NAME: z.string().optional(),
    AZURE_STORAGE_CONTAINER_NAME: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('Invalid Azure environment variables:', parsed.error.format());
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Critical Azure configuration missing.');
    }
}

export const env = parsed.success ? parsed.data : (process.env as unknown as z.infer<typeof envSchema>);
