/**
 * EC3 Client — server-side EPD lookup via Building Transparency EC3 API.
 *
 * Required environment variables:
 *   EC3_API_BASE_URL  — base URL, e.g. https://buildingtransparency.org/api
 *   EC3_API_KEY       — bearer token / API key
 */

export type Ec3EpdResult = {
  epdNumber: string;
  gwpPerUnit: number;
  unit: string;
  validUntil?: string;
  sourceUrl?: string;
};

/**
 * Look up a single EPD from EC3 by its identifier.
 *
 * Returns `null` when the EPD is not found (404).
 * Throws for any other non-OK response or for missing env vars.
 */
export async function lookupEpd(epdNumber: string): Promise<Ec3EpdResult | null> {
  const baseUrl = process.env.EC3_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('EC3_API_BASE_URL is not set');
  }

  // EC3 API key loaded from Azure Key Vault at startup via lib/secrets.ts.
  // KV secret name: "EC3-API-KEY"
  const { getSecret } = await import('../secrets');
  const apiKey = getSecret('EC3_API_KEY');
  if (!apiKey) {
    throw new Error(
      'EC3_API_KEY not found. ' +
      'Ensure Key Vault secret "EC3-API-KEY" exists and the managed identity has access.'
    );
  }

  const url = `${baseUrl}/epds/${encodeURIComponent(epdNumber)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    throw new Error(`EC3 lookup failed (${res.status}) for EPD ${epdNumber}`);
  }

  // EC3 EPD shape (only fields we consume here)
  const data = (await res.json()) as {
    gwp?: { declared_unit_value?: number; declared_unit_label?: string };
    valid_until?: string;
    date_validity_ends?: string;
    public_url?: string;
    doc?: string;
  };

  const gwpPerUnit = data.gwp?.declared_unit_value ?? 0;
  const unit = data.gwp?.declared_unit_label ?? '';
  const validUntil = data.valid_until ?? data.date_validity_ends;
  const sourceUrl = data.public_url ?? data.doc;

  return {
    epdNumber,
    gwpPerUnit,
    unit,
    ...(validUntil ? { validUntil } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
  };
}
