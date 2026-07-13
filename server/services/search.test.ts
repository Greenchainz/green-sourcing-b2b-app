import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fuseByRrf, searchMaterials, type VectorMatch } from './search';
import { getDb } from '../db';
import { generateEmbedding } from './embedding-service';

// Mock the database accessor and the embedding service so we can drive the
// hybrid retrieval core deterministically without a live Postgres / Azure OpenAI.
vi.mock('../db', () => ({ getDb: vi.fn() }));
vi.mock('./embedding-service', () => ({ generateEmbedding: vi.fn() }));

const mockedGetDb = vi.mocked(getDb);
const mockedGenerateEmbedding = vi.mocked(generateEmbedding);

type Row = Record<string, unknown>;

/**
 * Build a mock Drizzle db whose `execute` returns the given keyword (then
 * optional vector) rows in order, and whose `select().from().leftJoin().where()`
 * chain resolves to the hydrate rows.
 */
function buildMockDb(opts: {
  keywordRows: Row[];
  vectorRows?: Row[];
  hydrateRows: Row[];
}) {
  const execute = vi.fn();
  execute.mockResolvedValueOnce({ rows: opts.keywordRows });
  if (opts.vectorRows) execute.mockResolvedValueOnce({ rows: opts.vectorRows });

  const where = vi.fn().mockResolvedValue(opts.hydrateRows);
  const leftJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ leftJoin }));
  const select = vi.fn(() => ({ from }));

  const db = { execute, select };
  return { db: db as unknown as Awaited<ReturnType<typeof getDb>>, execute };
}

/** Recursively scan an object graph (e.g. a Drizzle SQL) for a string value. */
function deepIncludes(node: unknown, needle: string, seen = new Set<unknown>()): boolean {
  if (node === null || node === undefined) return false;
  if (typeof node === 'string') return node.includes(needle);
  if (typeof node !== 'object') return false;
  if (seen.has(node)) return false;
  seen.add(node);
  for (const value of Object.values(node as Record<string, unknown>)) {
    if (deepIncludes(value, needle, seen)) return true;
  }
  return false;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fuseByRrf', () => {
  it('ranks a doc appearing in both lists above single-list docs', () => {
    const keywordIds = [1, 2, 3];
    const vectorMatches: VectorMatch[] = [
      { id: 3, distance: 0.1 },
      { id: 1, distance: 0.2 },
    ];

    const fused = fuseByRrf(keywordIds, vectorMatches, 10);

    // id1: kwRank1 + vecRank2, id3: kwRank3 + vecRank1, id2: kwRank2 only.
    expect(fused.map((f) => f.id)).toEqual([1, 3, 2]);
  });

  it('sums reciprocal ranks for a doc present in both lists', () => {
    const fused = fuseByRrf([5], [{ id: 5, distance: 0.4 }], 10);
    const expected = 1 / (60 + 1) + 1 / (60 + 1);
    expect(fused).toHaveLength(1);
    expect(fused[0].score).toBeCloseTo(expected, 10);
    expect(fused[0].keywordRank).toBe(1);
    expect(fused[0].vectorRank).toBe(1);
  });

  it('carries vector distance only, leaving keyword-only docs null', () => {
    const fused = fuseByRrf([1, 2], [{ id: 2, distance: 0.07 }], 10);
    const byId = new Map(fused.map((f) => [f.id, f]));
    expect(byId.get(1)?.distance).toBeNull();
    expect(byId.get(1)?.vectorRank).toBeNull();
    expect(byId.get(2)?.distance).toBe(0.07);
    expect(byId.get(2)?.vectorRank).toBe(1);
  });

  it('degrades to keyword-only ordering when there are no vector matches', () => {
    const fused = fuseByRrf([10, 20, 30], [], 10);
    expect(fused.map((f) => f.id)).toEqual([10, 20, 30]);
    expect(fused.every((f) => f.distance === null && f.vectorRank === null)).toBe(true);
  });

  it('respects the limit', () => {
    const fused = fuseByRrf([1, 2, 3, 4, 5], [], 2);
    expect(fused).toHaveLength(2);
  });

  it('keeps the first (best) rank when an id repeats within a list', () => {
    const fused = fuseByRrf([7, 7], [], 10);
    expect(fused).toHaveLength(1);
    expect(fused[0].keywordRank).toBe(1);
  });
});

describe('searchMaterials', () => {
  it('returns empty keyword-only result when the db is unavailable', async () => {
    mockedGetDb.mockResolvedValue(null);
    const result = await searchMaterials({ query: 'concrete' });
    expect(result).toEqual({ items: [], mode: 'keyword-only' });
  });

  it('returns empty for a blank query without querying', async () => {
    const { db, execute } = buildMockDb({ keywordRows: [], hydrateRows: [] });
    mockedGetDb.mockResolvedValue(db);
    const result = await searchMaterials({ query: '   ' });
    expect(result).toEqual({ items: [], mode: 'keyword-only' });
    expect(execute).not.toHaveBeenCalled();
  });

  it('degrades to keyword-only when no embedding is available', async () => {
    mockedGenerateEmbedding.mockResolvedValue(null);
    const { db, execute } = buildMockDb({
      keywordRows: [
        { id: 1, rank: 0.9 },
        { id: 2, rank: 0.5 },
      ],
      hydrateRows: [
        { id: 1, name: 'Low-carbon concrete' },
        { id: 2, name: 'Recycled steel' },
      ],
    });
    mockedGetDb.mockResolvedValue(db);

    const result = await searchMaterials({ query: 'concrete steel' });

    expect(result.mode).toBe('keyword-only');
    // Only the keyword query runs — the vector query is skipped.
    expect(execute).toHaveBeenCalledTimes(1);
    expect(result.items.map((i) => i.id)).toEqual([1, 2]);
    expect(result.items[0].distance).toBeNull();
    expect(result.items[0].keywordRank).toBe(1);
    expect(result.items[0].vectorRank).toBeNull();
  });

  it('fuses keyword and vector candidates in hybrid mode', async () => {
    mockedGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    const { db, execute } = buildMockDb({
      keywordRows: [
        { id: 1, rank: 0.9 },
        { id: 2, rank: 0.5 },
      ],
      vectorRows: [
        { id: 2, distance: 0.05 },
        { id: 3, distance: 0.2 },
      ],
      hydrateRows: [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'C' },
      ],
    });
    mockedGetDb.mockResolvedValue(db);

    const result = await searchMaterials({ query: 'concrete' });

    expect(result.mode).toBe('hybrid');
    expect(execute).toHaveBeenCalledTimes(2);
    // id2 is in both lists so it fuses to the top.
    expect(result.items.map((i) => i.id)).toEqual([2, 1, 3]);
    expect(result.items[0].distance).toBe(0.05);
    expect(result.items[0].keywordRank).toBe(2);
    expect(result.items[0].vectorRank).toBe(1);
    // Keyword-only hit keeps a null distance.
    expect(result.items[1].distance).toBeNull();
  });

  it('applies the same filters to both the keyword and vector queries', async () => {
    mockedGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    const { db, execute } = buildMockDb({
      keywordRows: [{ id: 1, rank: 0.9 }],
      vectorRows: [{ id: 1, distance: 0.05 }],
      hydrateRows: [{ id: 1, name: 'A' }],
    });
    mockedGetDb.mockResolvedValue(db);

    await searchMaterials({ query: 'concrete', category: 'Concrete' });

    const keywordSql = execute.mock.calls[0]?.[0];
    const vectorSql = execute.mock.calls[1]?.[0];
    expect(deepIncludes(keywordSql, 'Concrete')).toBe(true);
    expect(deepIncludes(vectorSql, 'Concrete')).toBe(true);
  });
});
