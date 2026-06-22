import { getAzureCredential } from "./credentials";

const AZURE_MAPS_SCOPE = "https://atlas.microsoft.com/.default";

export interface AzureMapsAuth {
  headers: Record<string, string>;
}

export async function getAzureMapsAuth(): Promise<AzureMapsAuth | null> {
  const mapsClientId = process.env.AZURE_MAPS_CLIENT_ID || "";
  if (!mapsClientId) {
    console.error(
      "[Azure Maps] AZURE_MAPS_CLIENT_ID is required. Managed identity + RBAC is the only supported auth mode."
    );
    return null;
  }

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

  return null;
}
