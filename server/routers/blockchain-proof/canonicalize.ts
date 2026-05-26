// server/routers/blockchain-proof/canonicalize.ts
//
// Produces a stable JSON string regardless of key insertion order.
// Required so that keccak256(canonical(data)) is reproducible across
// different runtimes, library versions, and time.

/**
 * Recursively sorts object keys alphabetically and serializes to JSON.
 * Arrays are preserved in their original order.
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return value;
}
