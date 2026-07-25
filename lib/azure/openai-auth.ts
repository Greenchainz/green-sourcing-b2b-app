import { getBearerTokenProvider } from "@azure/identity";
import { getAzureCredential, isCredentialConfigured } from "./credentials";

const OPENAI_SCOPE = "https://cognitiveservices.azure.com/.default";

export interface AzureOpenAIAuthConfig {
    endpoint: string;
    deployment: string;
    apiVersion: string;
    authMode: "managed-identity" | "api-key";
    apiKey?: string;
    azureADTokenProvider?: ReturnType<typeof getBearerTokenProvider>;
}

export interface AzureOpenAIAuthOptions {
    deploymentEnvVar?: string;
    defaultDeployment: string;
    apiVersionEnvVar?: string;
    defaultApiVersion?: string;
}

export function getAzureOpenAIAuthConfig(
    options: AzureOpenAIAuthOptions
): AzureOpenAIAuthConfig {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    if (!endpoint) {
        throw new Error("Missing AZURE_OPENAI_ENDPOINT environment variable.");
    }

    const deployment =
        process.env[options.deploymentEnvVar ?? "AZURE_OPENAI_DEPLOYMENT"] ||
        options.defaultDeployment;
    const apiVersion =
        process.env[options.apiVersionEnvVar ?? "AZURE_OPENAI_API_VERSION"] ||
        options.defaultApiVersion ||
        "2024-08-01-preview";

    if (isCredentialConfigured()) {
        return {
            endpoint,
            deployment,
            apiVersion,
            authMode: "managed-identity",
            azureADTokenProvider: getBearerTokenProvider(getAzureCredential(), OPENAI_SCOPE),
        };
    }

    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error(
            "Missing Azure OpenAI authentication. Configure managed identity (AZURE_MI_CLIENT_ID) " +
            "or set AZURE_OPENAI_API_KEY for local development."
        );
    }

    const isProduction = process.env.NODE_ENV === "production";
    const allowApiKeyInProd = process.env.ALLOW_AZURE_OPENAI_API_KEY_IN_PROD === "true";
    if (isProduction && !allowApiKeyInProd) {
        throw new Error(
            "Azure OpenAI API key auth is blocked in production. " +
            "Use managed identity or set ALLOW_AZURE_OPENAI_API_KEY_IN_PROD=true as an emergency override."
        );
    }

    return {
        endpoint,
        deployment,
        apiVersion,
        authMode: "api-key",
        apiKey,
    };
}

export function isAzureOpenAIConfigured(options: AzureOpenAIAuthOptions): boolean {
    try {
        getAzureOpenAIAuthConfig(options);
        return true;
    } catch {
        return false;
    }
}
