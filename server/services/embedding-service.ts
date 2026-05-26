/**
 * Embedding Service — generates vector embeddings for semantic search.
 *
 * Uses Azure OpenAI text-embedding-3-small (1536 dimensions).
 *
 * Auth: DefaultAzureCredential — Managed Identity in prod, az-login locally.
 * No API keys. No secrets. Grant the managed identity "Cognitive Services User"
 * on the Azure OpenAI resource in Azure Portal.
 *
 * Required env vars (non-secret, set as Container App env vars):
 *   AZURE_OPENAI_ENDPOINT              — e.g. https://greenchainz.openai.azure.com
 *   AZURE_OPENAI_EMBEDDING_DEPLOYMENT  — deployment name, e.g. "text-embedding-3-small"
 *   AZURE_OPENAI_API_VERSION           — e.g. "2024-08-01-preview"
 */

import { AzureOpenAI } from "openai";
import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";

const COGSERVICES_SCOPE = "https://cognitiveservices.azure.com/.default";

let _client: AzureOpenAI | null = null;

function getClient(): AzureOpenAI | null {
  if (_client) return _client;

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  if (!endpoint) {
    console.warn("[embeddings] AZURE_OPENAI_ENDPOINT not set — embedding generation disabled");
    return null;
  }

  const deployment =
    process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ?? "text-embedding-3-small";
  const apiVersion =
    process.env.AZURE_OPENAI_API_VERSION ?? "2024-08-01-preview";

  const credential = new DefaultAzureCredential();
  const azureADTokenProvider = getBearerTokenProvider(credential, COGSERVICES_SCOPE);

  _client = new AzureOpenAI({ endpoint, azureADTokenProvider, apiVersion, deployment });
  return _client;
}

/**
 * Build a single searchable text blob from material fields.
 */
export function buildSearchText(material: {
  name: string;
  productName?: string | null;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  manufacturerName?: string | null;
}): string {
  return [
    material.name,
    material.productName,
    material.category,
    material.subcategory,
    material.description,
    material.manufacturerName,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Generate a 1536-dim embedding vector for the given text.
 * Returns null if Azure OpenAI endpoint is not configured.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const res = await client.embeddings.create({ input: text, model: "" });
    return res.data[0]?.embedding ?? null;
  } catch (err) {
    console.error("[embeddings] Azure OpenAI error:", err);
    return null;
  }
}

/**
 * Generate embeddings for multiple texts in a single batch call.
 * Returns an array of embeddings (null entries on failure).
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<(number[] | null)[]> {
  const client = getClient();
  if (!client) return texts.map(() => null);

  try {
    const res = await client.embeddings.create({ input: texts, model: "" });
    const out: (number[] | null)[] = texts.map(() => null);
    for (const item of res.data) {
      out[item.index] = item.embedding;
    }
    return out;
  } catch (err) {
    console.error("[embeddings] Azure OpenAI batch error:", err);
    return texts.map(() => null);
  }
}
