// Use getters so every access reads the live process.env value.
// This avoids the import-order bug where env.ts is evaluated before
// dotenv loads .env.local, leaving all secrets as empty strings.
export const ENV = {
  get appId()         { return process.env.VITE_APP_ID ?? ""; },
  get cookieSecret()  { return process.env.JWT_SECRET ?? ""; },
  get databaseUrl()   { return process.env.DATABASE_URL ?? ""; },
  get ownerOpenId()   { return process.env.OWNER_OPEN_ID ?? ""; },
  get isProduction()  { return process.env.NODE_ENV === "production"; },
  // Azure OpenAI — primary LLM provider
  get azureOpenAiEndpoint()   { return process.env.AZURE_OPENAI_ENDPOINT ?? ""; },
  get azureOpenAiKey()        { return process.env.AZURE_OPENAI_API_KEY ?? ""; },
  get azureOpenAiDeployment() { return process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o"; },
  get azureOpenAiVersion()    { return process.env.AZURE_OPENAI_API_VERSION ?? "2024-08-01-preview"; },
  get ec3ApiKey()     { return process.env.EC3_API_KEY ?? ""; },
  get ec3ClientId()   { return process.env.EC3_CLIENT_ID ?? ""; },
  get ec3ClientSecret(){ return process.env.EC3_CLIENT_SECRET ?? ""; },
  get ec3Username()   { return process.env.EC3_USERNAME ?? ""; },
  get ec3Password()   { return process.env.EC3_PASSWORD ?? ""; },
  // Azure Cognitive Services Translator (free F0 tier: 2M chars/month)
  // portal.azure.com → Create resource → "Translator" → F0 free tier
  get azureTranslatorKey()    { return process.env.AZURE_TRANSLATOR_KEY ?? ""; },
  get azureTranslatorRegion() { return process.env.AZURE_TRANSLATOR_REGION ?? "eastus"; },
};
