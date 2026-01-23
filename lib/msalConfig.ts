// lib/msalConfig.ts
import { PublicClientApplication, type Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: "479e2a01-70ab-4df9-baa4-560d317c3423",
    authority: "https://login.microsoftonline.com/ca4f78d4-c753-4893-9cd8-1b309922b4dc",
    redirectUri: "https://www.greenchainz.com/login/callback",
    redirectUri: "https://greenchainz.com/login/callback",   // matches app registration
    postLogoutRedirectUri: "https://greenchainz.com",
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);
