import { getAzureCredential } from "./credentials";

const AZURE_MAPS_SCOPE = "https://atlas.microsoft.com/.default";

export interface AzureMapsAuth {
  headers: Record<string, string>;
  keyParam?: string;
}

export async function getAzureMapsAuth(): Promise<AzureMapsAuth | null> {
  const mapsClientId = process.env.AZURE_MAPS_CLIENT_ID || "";
  if (mapsClientId) {
    try {
      const token = await getAzureCredential().getToken(AZURE_MAPS_SCOPE);
      if (token?.token) {
        return {
          headers: {
            Authorization: "Bearer " + token.token,
            "x-ms-client-id": mapsClientId,
          },
        };
      }
    } catch (error) {
      console.warn("[Azure Maps] Managed identity authentication failed:", error);
    }
  }

  const subscriptionKey = process.env.AZURE_MAPS_SUBSCRIPTION_KEY || "";
  if (subscriptionKey) {
    const isProduction = process.env.NODE_ENV === "production";
    const allowMapsKeyInProd = process.env.ALLOW_AZURE_MAPS_SUBSCRIPTION_KEY_IN_PROD === "true";

    if (!isProduction || allowMapsKeyInProd) {
      return {
        headers: {},
        keyParam: subscriptionKey,
      };
    }

    console.error(
      "[Azure Maps] Subscription-key auth is blocked in production. " +
      "Use managed identity or set ALLOW_AZURE_MAPS_SUBSCRIPTION_KEY_IN_PROD=true as emergency override."
    );
  }

  return null;
}
