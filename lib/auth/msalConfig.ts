import { Configuration, LogLevel } from "@azure/msal-browser";

const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "";
const tenant = process.env.NEXT_PUBLIC_AZURE_TENANT || "common";
const redirectUri =
    process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI ||
    (typeof window !== "undefined"
        ? `${window.location.origin}/login/callback`
        : "/login/callback");
const postLogoutRedirectUri =
    process.env.NEXT_PUBLIC_AZURE_POST_LOGOUT_REDIRECT_URI ||
    (typeof window !== "undefined" ? window.location.origin : "/");

export const msalConfig: Configuration = {
    auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenant}`,
        redirectUri,
        postLogoutRedirectUri,
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message) => {
                if (level >= LogLevel.Warning) {
                    console.warn(message);
                }
            },
            piiLoggingEnabled: false,
        },
    },
};

export const loginRequest = {
    scopes: ["openid", "profile", "email"],
};
