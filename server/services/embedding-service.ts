/**
 * Embedding Service — generates vector embeddings for semantic search.
 *
 * Uses OpenAI text-embedding-3-small (1536 dimensions).
 * Gracefully falls back to null if OPENAI_API_KEY is not set.
 */

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
 * Returns null if OPENAI_API_KEY is not configured.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[embeddings] OPENAI_API_KEY not set — skipping embedding generation");
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[embeddings] OpenAI API error (${response.status}):`, err);
    return null;
  }

  const data = await response.json();
  return data.data?.[0]?.embedding ?? null;
}

/**
 * Generate embeddings for multiple texts in a single batch call.
 * Returns an array of embeddings (or null entries on failure).
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<(number[] | null)[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[embeddings] OPENAI_API_KEY not set — skipping batch");
    return texts.map(() => null);
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: texts,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[embeddings] OpenAI batch error (${response.status}):`, err);
    return texts.map(() => null);
  }

  const data = await response.json();
  const embeddings: (number[] | null)[] = texts.map(() => null);
  for (const item of data.data ?? []) {
    embeddings[item.index] = item.embedding;
  }
  return embeddings;
}
