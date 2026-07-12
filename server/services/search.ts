/**
 * search.ts — Hybrid material retrieval behind a swappable provider seam.
 *
 * WHAT THIS IS
 * ------------
 * A single `searchMaterials()` entry point that FUSES the two retrieval paths
 * this repo already owns — PostgreSQL keyword full-text (tsvector / ts_rank_cd)
 * and pgvector semantic search (cosine `<=>` over `materials.embedding`) — using
 * Reciprocal Rank Fusion (RRF). It reuses, and does not reinvent:
 *   - Query embeddings:  `generateEmbedding()` in ./embedding-service
 *   - Vector column + HNSW cosine index: `materials.embedding vector(1536)`
 *   - Keyword text:      `materials.name/productName/description` tsvector
 *
 * WHY THE SEAM (`MaterialSearchProvider`)
 * ---------------------------------------
 * Retrieval is expressed as one interface so a future `AzureAiSearchProvider`
 * can be dropped in behind the exact same signature without touching callers.
 * That defers the Azure AI Search bill (a provisioned service, ~$75-250/mo)
 * until scale or relevance actually demands it — fusing what we already pay for
 * (Postgres + the embeddings we already generate) is free. Azure AI Search stays
 * the graduation target, not the starting cost.
 *
 * GRACEFUL DEGRADATION
 * --------------------
 * If `generateEmbedding()` returns null (Azure OpenAI endpoint not configured or
 * transient failure) we fall back to KEYWORD-ONLY and set `mode: 'keyword-only'`.
 * This function never throws on a missing embedding — it mirrors the resilience
 * of the existing `semanticSearch` procedure.
 */

import { sql, eq, inArray, getTableColumns, type SQL } from 'drizzle-orm';
import { getDb } from '../db';
import { materials, manufacturers, type Material } from '../../drizzle/schema';
import { generateEmbedding } from './embedding-service';

// ─── Tunables ────────────────────────────────────────────────────────────────

/** RRF constant. 60 is the value from the original Cormack et al. RRF paper. */
const RRF_K = 60;
/** Candidates pulled from EACH retrieval path before fusion. */
const CANDIDATE_N = 50;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// ─── Public types ────────────────────────────────────────────────────────────

export interface MaterialSearchParams {
  query: string;
  category?: string;
  hasEpd?: boolean;
  minGwp?: number;
  maxGwp?: number;
  /** Gate results to `materials.verified = true`. Defaults to true (public surfaces). */
  verifiedOnly?: boolean;
  /** Result cap. Defaults to 20, hard-capped at 50. */
  limit?: number;
}

export type SearchMode = 'hybrid' | 'keyword-only';

/** A material row joined with its manufacturer, plus fusion diagnostics. */
export type MaterialSearchResultItem = Material & {
  manufacturerName: string | null;
  manufacturerWebsite: string | null;
  manufacturerLogoUrl: string | null;
  /** Fused Reciprocal Rank Fusion score (higher = better). */
  score: number;
  /** 1-based position in the keyword list, or null if it did not appear. */
  keywordRank: number | null;
  /** 1-based position in the vector list, or null if it did not appear. */
  vectorRank: number | null;
  /**
   * Raw cosine distance from the vector path (lower = closer), or null when the
   * doc came only from keyword search or the vector path did not run. Preserved
   * for backward-compatible consumers of `semanticSearch` (e.g. ExcelAudit).
   */
  distance: number | null;
};

export interface MaterialSearchResponse {
  items: MaterialSearchResultItem[];
  mode: SearchMode;
}

/**
 * The swap boundary. Any retrieval backend (today: Postgres RRF fusion; later:
 * Azure AI Search) implements this one method. Callers depend on the interface,
 * never on the concrete implementation.
 */
export interface MaterialSearchProvider {
  search(params: MaterialSearchParams): Promise<MaterialSearchResponse>;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/** A vector-search hit: material id + its raw cosine distance (lower = closer). */
export interface VectorMatch {
  id: number;
  distance: number | null;
}

/** One fused candidate after RRF, before hydration. */
export interface FusedCandidate {
  id: number;
  /** Fused Reciprocal Rank Fusion score (higher = better). */
  score: number;
  keywordRank: number | null;
  vectorRank: number | null;
  distance: number | null;
}

/**
 * Reciprocal Rank Fusion — the pure ranking core, decoupled from the database so
 * it can be unit-tested directly. Merges an ordered keyword id list and an
 * ordered vector match list into a single ranking:
 *
 *   score = Σ 1 / (k + rank_i)   over each list the doc appears in (k = RRF_K)
 *
 * `distance` is carried from the vector list only (null for keyword-only docs).
 * Duplicate ids within a single list keep their first (best) rank.
 */
export function fuseByRrf(
  keywordIds: number[],
  vectorMatches: VectorMatch[],
  limit: number,
): FusedCandidate[] {
  const merged = new Map<
    number,
    { keywordRank?: number; vectorRank?: number; distance: number | null }
  >();

  keywordIds.forEach((id, index) => {
    const entry = merged.get(id) ?? { distance: null };
    if (entry.keywordRank === undefined) entry.keywordRank = index + 1;
    merged.set(id, entry);
  });

  vectorMatches.forEach((match, index) => {
    const entry = merged.get(match.id) ?? { distance: null };
    if (entry.vectorRank === undefined) {
      entry.vectorRank = index + 1;
      entry.distance = match.distance;
    }
    merged.set(match.id, entry);
  });

  return Array.from(merged.entries())
    .map(([id, entry]) => {
      let score = 0;
      if (entry.keywordRank !== undefined) score += 1 / (RRF_K + entry.keywordRank);
      if (entry.vectorRank !== undefined) score += 1 / (RRF_K + entry.vectorRank);
      return {
        id,
        score,
        keywordRank: entry.keywordRank ?? null,
        vectorRank: entry.vectorRank ?? null,
        distance: entry.distance,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit));
}

/** Coerce a drizzle `db.execute` result into a plain row array (typing varies by driver). */
function readRows(result: unknown): Array<Record<string, unknown>> {
  const maybe = result as { rows?: unknown };
  if (Array.isArray(maybe.rows)) return maybe.rows as Array<Record<string, unknown>>;
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  return [];
}

function toId(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Build the shared filter clause applied to BOTH retrieval queries (materials aliased `m`). */
function buildFilterClause(params: MaterialSearchParams): SQL {
  const filters: SQL[] = [];
  if (params.verifiedOnly !== false) filters.push(sql`m.verified = true`);
  if (params.category) filters.push(sql`m.category = ${params.category}`);
  if (params.hasEpd !== undefined) filters.push(sql`m."hasEpd" = ${params.hasEpd}`);
  if (params.minGwp !== undefined) filters.push(sql`m."gwpValue"::numeric >= ${params.minGwp}`);
  if (params.maxGwp !== undefined) filters.push(sql`m."gwpValue"::numeric <= ${params.maxGwp}`);
  return filters.length ? sql` AND (${sql.join(filters, sql` AND `)})` : sql``;
}

// ─── Hybrid (RRF) implementation ─────────────────────────────────────────────

/**
 * Fuse keyword + vector retrieval via Reciprocal Rank Fusion.
 *
 * Conforms to `MaterialSearchProvider["search"]`. Non-throwing: on any missing
 * embedding it silently degrades to keyword-only.
 */
export async function searchMaterials(
  params: MaterialSearchParams,
): Promise<MaterialSearchResponse> {
  const query = params.query.trim();
  const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? DEFAULT_LIMIT));

  const db = await getDb();
  if (!db || query.length === 0) {
    return { items: [], mode: 'keyword-only' };
  }

  const filterClause = buildFilterClause(params);

  // ── Keyword candidates (tsvector match, ranked by ts_rank_cd) ──
  // NOTE: this to_tsvector(...) expression is mirrored by the GIN index
  // `idx_materials_fts` (created in scripts/generate-embeddings.ts). Keep the two
  // in sync — an exact match is required for the planner to use the index.
  const tsv = sql`to_tsvector('english', m.name || ' ' || COALESCE(m."productName", '') || ' ' || COALESCE(m.description, ''))`;
  const tsq = sql`plainto_tsquery('english', ${query})`;
  const keywordResult = await db.execute(sql`
    SELECT m.id AS id, ts_rank_cd(${tsv}, ${tsq}) AS rank
    FROM materials m
    WHERE ${tsv} @@ ${tsq}${filterClause}
    ORDER BY rank DESC
    LIMIT ${CANDIDATE_N}
  `);
  const keywordIds = readRows(keywordResult).flatMap((row) => {
    const id = toId(row.id);
    return id === null ? [] : [id];
  });

  // ── Vector candidates (cosine <=>), only when we can embed the query ──
  const embedding = await generateEmbedding(query);
  let mode: SearchMode = 'keyword-only';
  let vectorMatches: VectorMatch[] = [];

  if (embedding) {
    mode = 'hybrid';
    const embString = `[${embedding.join(',')}]`;
    const vectorResult = await db.execute(sql`
      SELECT m.id AS id, (m.embedding <=> ${embString}::vector) AS distance
      FROM materials m
      WHERE m.embedding IS NOT NULL${filterClause}
      ORDER BY m.embedding <=> ${embString}::vector
      LIMIT ${CANDIDATE_N}
    `);
    vectorMatches = readRows(vectorResult).flatMap((row) => {
      const id = toId(row.id);
      if (id === null) return [];
      const dist = Number(row.distance);
      return [{ id, distance: Number.isFinite(dist) ? dist : null }];
    });
  }

  // ── Fuse via RRF (pure, unit-tested core) ──
  const fused = fuseByRrf(keywordIds, vectorMatches, limit);
  if (fused.length === 0) {
    return { items: [], mode };
  }

  const orderedIds = fused.map((f) => f.id);

  // ── Hydrate full material rows (typed) + manufacturer join ──
  const rows = await db
    .select({
      ...getTableColumns(materials),
      manufacturerName: manufacturers.name,
      manufacturerWebsite: manufacturers.website,
      manufacturerLogoUrl: manufacturers.logoUrl,
    })
    .from(materials)
    .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
    .where(inArray(materials.id, orderedIds));

  const rowById = new Map(rows.map((r) => [r.id, r]));

  // Re-apply the fused order (SQL does not preserve `inArray` order).
  const items: MaterialSearchResultItem[] = fused.flatMap((f) => {
    const row = rowById.get(f.id);
    if (!row) return [];
    return [
      {
        ...row,
        score: f.score,
        keywordRank: f.keywordRank,
        vectorRank: f.vectorRank,
        distance: f.distance,
      },
    ];
  });

  return { items, mode };
}

/**
 * Default provider. Swap this binding (or select at runtime) to route retrieval
 * through a different backend — e.g. `export const materialSearchProvider =
 * azureAiSearchProvider;` — without changing any caller.
 */
export const materialSearchProvider: MaterialSearchProvider = {
  search: searchMaterials,
};
