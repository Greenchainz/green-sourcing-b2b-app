// Use getters so every access reads the live process.env value.
// This avoids the import-order bug where env.ts is evaluated before
// dotenv loads .env.local, leaving all secrets as empty strings.
//
// IMPORTANT: All secrets listed here MUST be loaded from Azure Key Vault
// via lib/secrets.ts at server startup. process.env is only populated by
// the Key Vault loader — never set these in production Container App config
// as plain environment variables. Managed Identity fetches them.
export const ENV = {
  get appId()         { return process.env.VITE_APP_ID ?? ""; },
  // JWT_SECRET loaded from KV secret "jwt-secret" by lib/secrets.ts
  get cookieSecret()  { return process.env.JWT_SECRET ?? ""; },
  // DATABASE_URL loaded from KV secret "DATABASE-URL" by lib/secrets.ts
  get databaseUrl()   { return process.env.DATABASE_URL ?? ""; },
  get ownerOpenId()   { return process.env.OWNER_OPEN_ID ?? ""; },
  get isProduction()  { return process.env.NODE_ENV === "production"; },
  // Azure OpenAI — Managed Identity auth preferred; endpoint is non-secret.
  // AZURE_OPENAI_API_KEY is only needed for local dev without az login.
  // In production, use DefaultAzureCredential with the Azure OpenAI SDK —
  // do NOT set AZURE_OPENAI_API_KEY as a Container App env var.
  get azureOpenAiEndpoint()   { return process.env.AZURE_OPENAI_ENDPOINT ?? ""; },
  get azureOpenAiKey()        { return process.env.AZURE_OPENAI_API_KEY ?? ""; }, // local dev only
  get azureOpenAiDeployment() { return process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o"; },
  get azureOpenAiVersion()    { return process.env.AZURE_OPENAI_API_VERSION ?? "2024-08-01-preview"; },
  // EC3 credentials loaded from KV: "EC3-API-KEY", "EC3-CLIENT-ID", etc.
  get ec3ApiKey()     { return process.env.EC3_API_KEY ?? ""; },
  get ec3ClientId()   { return process.env.EC3_CLIENT_ID ?? ""; },
  get ec3ClientSecret(){ return process.env.EC3_CLIENT_SECRET ?? ""; },
  get ec3Username()   { return process.env.EC3_USERNAME ?? ""; },
  get ec3Password()   { return process.env.EC3_PASSWORD ?? ""; },
  // Azure Cognitive Services Translator — use Managed Identity in prod.
  // Grant the managed identity "Cognitive Services User" on the Translator resource.
  // AZURE_TRANSLATOR_KEY only needed for local dev without az login.
  get azureTranslatorKey()    { return process.env.AZURE_TRANSLATOR_KEY ?? ""; }, // local dev only
  get azureTranslatorRegion() { return process.env.AZURE_TRANSLATOR_REGION ?? "eastus"; },
  // Azure Service Bus — async event pipeline (Managed Identity, no connection string)
  get serviceBusNamespace() { return process.env.SERVICE_BUS_NAMESPACE ?? ""; },
};
