/**
 * GreenChainz API client for the Forma Extension.
 *
 * All requests hit the public GreenChainz tRPC API.
 * Material search is unauthenticated. RFQ actions require the user to have
 * linked their GreenChainz account (token stored in Forma extension settings).
 */

import type { GCMaterial } from "./types";

const API_BASE = (import.meta.env.VITE_GC_API_URL ?? "https://greenchainz.com") + "/api/public";

// ── Material search ──────────────────────────────────────────────────────────

export interface MaterialSearchParams {
  query?: string;
  category?: string;
  maxGwp?: number;       // filter by max kgCO2e
  minMcs?: number;       // filter by min Material Credit Score (0–100)
  limit?: number;
}

export async function searchMaterials(params: MaterialSearchParams): Promise<GCMaterial[]> {
  const qs = new URLSearchParams();
  if (params.query)    qs.set("q", params.query);
  if (params.category) qs.set("category", params.category);
  if (params.maxGwp)   qs.set("maxGwp", String(params.maxGwp));
  if (params.minMcs)   qs.set("minMcs", String(params.minMcs));
  qs.set("limit", String(params.limit ?? 20));

  const res = await fetch(`${API_BASE}/materials/search?${qs.toString()}`);
  if (!res.ok) throw new Error(`GreenChainz API error: ${res.status}`);
  const json = await res.json() as { materials: GCMaterial[] };
  return json.materials ?? [];
}

// ── Material detail ──────────────────────────────────────────────────────────

export async function getMaterial(id: string): Promise<GCMaterial | null> {
  const res = await fetch(`${API_BASE}/materials/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GreenChainz API error: ${res.status}`);
  return res.json() as Promise<GCMaterial>;
}

// ── Greener alternatives (SWAP Engine) ──────────────────────────────────────

export async function getSwapSuggestions(materialId: string): Promise<GCMaterial[]> {
  const res = await fetch(`${API_BASE}/materials/${materialId}/swaps`);
  if (!res.ok) return [];
  const json = await res.json() as { alternatives: GCMaterial[] };
  return json.alternatives ?? [];
}

// ── Add to RFQ (requires auth token) ────────────────────────────────────────

export async function addToRfq(
  materialId: string,
  quantity: number,
  unit: string,
  authToken: string
): Promise<{ rfqId: string }> {
  const res = await fetch(`${API_BASE}/rfq/add-item`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ materialId, quantity, unit }),
  });
  if (!res.ok) throw new Error(`Failed to add to RFQ: ${res.status}`);
  return res.json() as Promise<{ rfqId: string }>;
}

// ── MCS badge helper ─────────────────────────────────────────────────────────

export function mcsBadgeClass(score?: number): "high" | "medium" | "low" {
  if (!score) return "low";
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export function mcsLabel(score?: number): string {
  if (!score) return "Unscored";
  return `MCS ${score}`;
}

// ── GWP display helper ───────────────────────────────────────────────────────

export function formatGwp(gwp?: number, unit?: string): string {
  if (!gwp) return "—";
  return `${gwp.toFixed(1)} kgCO₂e/${unit ?? "unit"}`;
}
