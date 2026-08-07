/**
 * OAuth/Marketplace environment guards.
 *
 * These helpers prevent silent empty-string fallbacks for client secrets in
 * production while still allowing explicit development defaults for local use.
 */

function isProduction(): boolean {
    return process.env.NODE_ENV === "production";
}

export function isStrictOAuthConfigEnv(): boolean {
    return isProduction();
}

export function getEnvWithDevDefault(key: string, devDefault: string): string {
    const value = process.env[key];
    if (value && value.length > 0) {
        return value;
    }
    if (isProduction()) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return devDefault;
}

export function getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value || value.length === 0) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
