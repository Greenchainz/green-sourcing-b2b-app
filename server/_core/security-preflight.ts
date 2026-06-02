type CheckStatus = "PASS" | "WARN" | "FAIL";

interface CheckResult {
    name: string;
    status: CheckStatus;
    details: string;
}

function hasValue(key: string): boolean {
    const value = process.env[key];
    return !!(value && value.length > 0);
}

function add(checks: CheckResult[], name: string, status: CheckStatus, details: string): void {
    checks.push({ name, status, details });
}

export function runStartupSecurityPreflight(): { hasFailures: boolean; checks: CheckResult[] } {
    const checks: CheckResult[] = [];
    const isProduction = process.env.NODE_ENV === "production";

    const hasJwtSecret = hasValue("JWT_SECRET");
    const hasDatabaseUrl = hasValue("DATABASE_URL");
    const hasAzureAdClientSecret = hasValue("AZURE_AD_CLIENT_SECRET");

    const hasMiClientId = hasValue("AZURE_MI_CLIENT_ID") || hasValue("MANAGED_IDENTITY_CLIENT_ID");
    const hasStorageMi = hasValue("AZURE_STORAGE_ACCOUNT_NAME");
    const hasStorageConn = hasValue("AZURE_STORAGE_CONNECTION_STRING");
    const allowStorageConnInProd = process.env.ALLOW_STORAGE_CONNECTION_STRING_IN_PROD === "true";

    const hasMapsClientId = hasValue("AZURE_MAPS_CLIENT_ID");
    const hasMapsKey = hasValue("AZURE_MAPS_SUBSCRIPTION_KEY");
    const allowMapsKeyInProd = process.env.ALLOW_AZURE_MAPS_SUBSCRIPTION_KEY_IN_PROD === "true";

    const hasAcsEndpoint =
        hasValue("AZURE_COMMUNICATION_SERVICES_ENDPOINT") || hasValue("ACS_ENDPOINT_URL");
    const hasAcsConn = hasValue("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING");
    const allowAcsConnInProd = process.env.ALLOW_ACS_CONNECTION_STRING_IN_PROD === "true";

    const hasOpenAiEndpoint = hasValue("AZURE_OPENAI_ENDPOINT");
    const hasOpenAiKey = hasValue("AZURE_OPENAI_API_KEY");
    const allowOpenAiKeyInProd = process.env.ALLOW_AZURE_OPENAI_API_KEY_IN_PROD === "true";

    const hasRedisUrl = hasValue("REDIS_URL");
    const hasRedisHostPort = hasValue("REDIS_HOST") && hasValue("REDIS_PORT");
    const requireRedisCallSessions = process.env.REQUIRE_REDIS_CALL_SESSIONS !== "false";

    if (!isProduction) {
        add(checks, "Core API Secrets", "PASS", "Core production secrets check is informational in non-production");
    } else {
        const missingCore: string[] = [];
        if (!hasJwtSecret) missingCore.push("JWT_SECRET");
        if (!hasDatabaseUrl) missingCore.push("DATABASE_URL");
        if (!hasAzureAdClientSecret) missingCore.push("AZURE_AD_CLIENT_SECRET");

        if (missingCore.length === 0) {
            add(checks, "Core API Secrets", "PASS", "JWT_SECRET, DATABASE_URL, and AZURE_AD_CLIENT_SECRET are present");
        } else {
            add(
                checks,
                "Core API Secrets",
                "FAIL",
                `Missing required production secrets: ${missingCore.join(", ")}`
            );
        }
    }

    add(
        checks,
        "Managed Identity",
        hasMiClientId ? "PASS" : "WARN",
        hasMiClientId
            ? "Managed identity client id configured"
            : "No explicit managed identity client id set (system-assigned identity may still work)"
    );

    if (hasStorageMi) {
        add(checks, "Azure Storage Auth", "PASS", "Using managed identity storage account configuration");
    } else if (hasStorageConn) {
        if (!isProduction) {
            add(checks, "Azure Storage Auth", "WARN", "Using connection string fallback in non-production");
        } else if (allowStorageConnInProd) {
            add(checks, "Azure Storage Auth", "WARN", "Using emergency production connection-string override");
        } else {
            add(
                checks,
                "Azure Storage Auth",
                "FAIL",
                "Connection string present in production without ALLOW_STORAGE_CONNECTION_STRING_IN_PROD=true"
            );
        }
    } else {
        add(checks, "Azure Storage Auth", isProduction ? "FAIL" : "WARN", "No storage auth configuration found");
    }

    if (hasMapsClientId && hasMiClientId) {
        add(checks, "Azure Maps Auth", "PASS", "Using managed identity + AZURE_MAPS_CLIENT_ID");
    } else if (hasMapsKey) {
        if (!isProduction) {
            add(checks, "Azure Maps Auth", "WARN", "Using subscription key in non-production");
        } else if (allowMapsKeyInProd) {
            add(checks, "Azure Maps Auth", "WARN", "Using emergency production maps key override");
        } else {
            add(
                checks,
                "Azure Maps Auth",
                "FAIL",
                "Subscription key present in production without ALLOW_AZURE_MAPS_SUBSCRIPTION_KEY_IN_PROD=true"
            );
        }
    } else {
        add(checks, "Azure Maps Auth", "WARN", "Maps auth not configured (feature-dependent)");
    }

    if (hasAcsEndpoint) {
        add(checks, "ACS Auth", "PASS", "Using endpoint-based ACS configuration");
    } else if (hasAcsConn) {
        if (!isProduction) {
            add(checks, "ACS Auth", "WARN", "Using ACS connection string in non-production");
        } else if (allowAcsConnInProd) {
            add(checks, "ACS Auth", "WARN", "Using emergency production ACS connection-string override");
        } else {
            add(
                checks,
                "ACS Auth",
                "FAIL",
                "ACS connection string present in production without ALLOW_ACS_CONNECTION_STRING_IN_PROD=true"
            );
        }
    } else {
        add(checks, "ACS Auth", "WARN", "ACS auth not configured (feature-dependent)");
    }

    if (hasOpenAiEndpoint && hasMiClientId) {
        add(checks, "Azure OpenAI Auth", "PASS", "Using managed identity Azure OpenAI configuration");
    } else if (hasOpenAiEndpoint && hasOpenAiKey) {
        if (!isProduction) {
            add(checks, "Azure OpenAI Auth", "WARN", "Using API key in non-production");
        } else if (allowOpenAiKeyInProd) {
            add(checks, "Azure OpenAI Auth", "WARN", "Using emergency production OpenAI key override");
        } else {
            add(
                checks,
                "Azure OpenAI Auth",
                "FAIL",
                "OpenAI API key present in production without ALLOW_AZURE_OPENAI_API_KEY_IN_PROD=true"
            );
        }
    } else {
        add(checks, "Azure OpenAI Auth", "WARN", "Azure OpenAI auth not configured (feature-dependent)");
    }

    if (!isProduction || !requireRedisCallSessions) {
        add(checks, "Redis Call Sessions", "PASS", "Strict Redis production requirement is not active");
    } else if (hasRedisUrl || hasRedisHostPort) {
        add(checks, "Redis Call Sessions", "PASS", "Redis call-session configuration detected");
    } else {
        add(checks, "Redis Call Sessions", "FAIL", "Redis required for call sessions but no REDIS_URL or REDIS_HOST/REDIS_PORT set");
    }

    if (!isProduction) {
        add(checks, "Emergency Overrides", "PASS", "Override flags are informational in non-production");
    } else {
        const activeOverrides: string[] = [];
        if (allowStorageConnInProd) activeOverrides.push("ALLOW_STORAGE_CONNECTION_STRING_IN_PROD");
        if (allowMapsKeyInProd) activeOverrides.push("ALLOW_AZURE_MAPS_SUBSCRIPTION_KEY_IN_PROD");
        if (allowAcsConnInProd) activeOverrides.push("ALLOW_ACS_CONNECTION_STRING_IN_PROD");
        if (allowOpenAiKeyInProd) activeOverrides.push("ALLOW_AZURE_OPENAI_API_KEY_IN_PROD");

        if (activeOverrides.length === 0) {
            add(checks, "Emergency Overrides", "PASS", "No emergency override flags enabled in production");
        } else {
            add(
                checks,
                "Emergency Overrides",
                "WARN",
                `Emergency overrides enabled: ${activeOverrides.join(", ")}`
            );
        }
    }

    const fails = checks.filter((c) => c.status === "FAIL").length;
    const warns = checks.filter((c) => c.status === "WARN").length;

    console.log("[startup/preflight] Security readiness summary:");
    for (const check of checks) {
        console.log(`[startup/preflight] ${check.status.padEnd(4)} ${check.name}: ${check.details}`);
    }
    console.log(`[startup/preflight] Totals: fail=${fails} warn=${warns} pass=${checks.length - fails - warns}`);

    return {
        hasFailures: fails > 0,
        checks,
    };
}
