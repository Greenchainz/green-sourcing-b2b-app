// Use getters so every access reads the live process.env value.
// This avoids the import-order bug where env.ts is evaluated before
// dotenv loads .env.local, leaving all secrets as empty strings.
export const ENV = {
  get appId()         { return process.env.VITE_APP_ID ?? ""; },
  get cookieSecret()  { return process.env.JWT_SECRET ?? ""; },
  get databaseUrl()   { return process.env.DATABASE_URL ?? ""; },
  get oAuthServerUrl(){ return process.env.OAUTH_SERVER_URL ?? ""; },
  get ownerOpenId()   { return process.env.OWNER_OPEN_ID ?? ""; },
  get isProduction()  { return process.env.NODE_ENV === "production"; },
  get forgeApiUrl()   { return process.env.BUILT_IN_FORGE_API_URL ?? ""; },
  get forgeApiKey()   { return process.env.BUILT_IN_FORGE_API_KEY ?? ""; },
  get ec3ApiKey()     { return process.env.EC3_API_KEY ?? ""; },
  get ec3ClientId()   { return process.env.EC3_CLIENT_ID ?? ""; },
  get ec3ClientSecret(){ return process.env.EC3_CLIENT_SECRET ?? ""; },
  get ec3Username()   { return process.env.EC3_USERNAME ?? ""; },
  get ec3Password()   { return process.env.EC3_PASSWORD ?? ""; },
};
