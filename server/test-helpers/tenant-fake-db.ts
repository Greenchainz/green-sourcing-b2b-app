/**
 * Honest in-memory fake DB for cross-tenant isolation tests.
 *
 * Why this exists
 * ---------------
 * Several routers enforce tenant ownership *inside the SQL WHERE clause*
 * (e.g. `where(and(eq(table.id, id), eq(table.createdBy, ctx.user.id)))`)
 * rather than with a post-fetch JavaScript check. A mock that ignores the
 * predicate and always returns a row therefore proves NOTHING — and would keep
 * passing even if the org-scoping predicate were deleted.
 *
 * This helper closes that gap. It:
 *   1. Replaces only the Drizzle query *operators* (`eq`, `and`, `isNull`, …)
 *      with tiny descriptor objects (see {@link makeDrizzleOpMock}). Column
 *      objects and table definitions stay real.
 *   2. Provides a {@link FakeDb} whose query builder genuinely *evaluates* those
 *      descriptors against seeded, in-memory rows.
 *
 * The result: if a router forgets (or a refactor removes) the `ctx.user.id`
 * predicate, the fake DB returns another tenant's row and the isolation test
 * fails — exactly the safety property we want to lock in. No real database,
 * fully deterministic, CI-safe.
 *
 * Usage in a test file:
 *
 *   import { FakeDb, makeDrizzleOpMock } from "../test-helpers/tenant-fake-db";
 *   vi.mock("drizzle-orm", async (orig) => ({
 *     ...(await orig<typeof import("drizzle-orm")>()),
 *     ...makeDrizzleOpMock(),
 *   }));
 *   vi.mock("../db", () => ({ getDb: vi.fn() }));
 *   // then in beforeEach: (getDb as Mock).mockResolvedValue(fakeDb);
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

type Row = Record<string, any>;

type Pred =
  | { kind: "true" }
  | { kind: "eq"; col: string; val: unknown }
  | { kind: "isNull"; col: string }
  | { kind: "and"; parts: Pred[] }
  | { kind: "or"; parts: Pred[] }
  | { kind: "not"; part: Pred };

type Order = { __order: "asc" | "desc"; col: string };

function snakeToCamel(name: string): string {
  return name.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
}

/**
 * Derive a stable, camelCase key from a real Drizzle column object.
 * Drizzle exposes the *DB* column name on `.name` — which may be snake_case
 * (`created_by`) or already camelCase (`supplierId`) depending on the schema.
 * We normalise to camelCase so seeded rows can use natural JS keys.
 */
function colKey(col: any): string {
  const raw: string = col?.name ?? col?.columnName ?? String(col);
  return snakeToCamel(raw);
}

function isPred(v: any): v is Pred {
  return v != null && typeof v === "object" && typeof v.kind === "string";
}

/**
 * The drizzle-orm operator mock. Spread these over the real module so only the
 * predicate/order builders are replaced.
 */
export function makeDrizzleOpMock() {
  const eq = (col: any, val: unknown): Pred => ({ kind: "eq", col: colKey(col), val });
  return {
    eq,
    ne: (col: any, val: unknown): Pred => ({ kind: "not", part: eq(col, val) }),
    isNull: (col: any): Pred => ({ kind: "isNull", col: colKey(col) }),
    isNotNull: (col: any): Pred => ({ kind: "not", part: { kind: "isNull", col: colKey(col) } }),
    and: (...parts: any[]): Pred => ({ kind: "and", parts: parts.filter(isPred) }),
    or: (...parts: any[]): Pred => ({ kind: "or", parts: parts.filter(isPred) }),
    not: (part: any): Pred => ({ kind: "not", part }),
    desc: (col: any): Order => ({ __order: "desc", col: colKey(col) }),
    asc: (col: any): Order => ({ __order: "asc", col: colKey(col) }),
  };
}

function matches(row: Row, p: Pred): boolean {
  switch (p.kind) {
    case "true":
      return true;
    case "eq":
      // eslint-disable-next-line security/detect-object-injection
      return row[p.col] === p.val;
    case "isNull":
      // eslint-disable-next-line security/detect-object-injection
      return row[p.col] == null;
    case "and":
      return p.parts.every((x) => matches(row, x));
    case "or":
      return p.parts.length === 0 ? true : p.parts.some((x) => matches(row, x));
    case "not":
      return !matches(row, p.part);
    default:
      return false;
  }
}

let autoId = 1;

class Builder<T = Row[]> implements PromiseLike<T> {
  private table?: object;
  private wherePred: Pred = { kind: "true" };
  private orderKey?: Order;
  private limitN?: number;
  private offsetN?: number;
  private insertValues?: Row[];
  private updateSet?: Row;
  private returningProj?: Record<string, any> | undefined;
  private returningRequested = false;

  constructor(
    private readonly db: FakeDb,
    private readonly mode: "select" | "insert" | "update" | "delete",
  ) {}

  from(t: object): this {
    this.table = t;
    return this;
  }
  setTable(t: object): this {
    this.table = t;
    return this;
  }
  leftJoin(_t: object, _on?: unknown): this {
    return this;
  }
  innerJoin(_t: object, _on?: unknown): this {
    return this;
  }
  where(p?: Pred): this {
    this.wherePred = isPred(p) ? p : { kind: "true" };
    return this;
  }
  orderBy(o?: Order): this {
    if (o && (o as any).__order) this.orderKey = o;
    return this;
  }
  limit(n: number): this {
    this.limitN = n;
    return this;
  }
  offset(n: number): this {
    this.offsetN = n;
    return this;
  }
  values(v: Row | Row[]): this {
    this.insertValues = Array.isArray(v) ? v : [v];
    return this;
  }
  set(v: Row): this {
    this.updateSet = v;
    return this;
  }
  returning(proj?: Record<string, any>): this {
    this.returningRequested = true;
    this.returningProj = proj;
    return this;
  }

  private rows(): Row[] {
    if (!this.table) return [];
    return this.db.rowsFor(this.table);
  }

  private projectReturning(row: Row): Row {
    if (!this.returningProj) return { ...row };
    const out: Row = {};
    for (const alias of Object.keys(this.returningProj)) {
      // eslint-disable-next-line security/detect-object-injection
      out[alias] = row[colKey(this.returningProj[alias])];
    }
    return out;
  }

  private exec(): Row[] {
    if (this.mode === "select") {
      let rows = this.rows().filter((r) => matches(r, this.wherePred));
      if (this.orderKey) {
        const { col, __order } = this.orderKey;
        rows = [...rows].sort((a, b) => {
          // eslint-disable-next-line security/detect-object-injection
          const av = a[col];
          // eslint-disable-next-line security/detect-object-injection
          const bv = b[col];
          const cmp = av === bv ? 0 : av > bv ? 1 : -1;
          return __order === "desc" ? -cmp : cmp;
        });
      }
      if (this.offsetN != null) rows = rows.slice(this.offsetN);
      if (this.limitN != null) rows = rows.slice(0, this.limitN);
      return rows.map((r) => ({ ...r }));
    }

    if (this.mode === "insert") {
      const table = this.table!;
      const store = this.db.rowsFor(table);
      const inserted: Row[] = [];
      for (const v of this.insertValues ?? []) {
        const row: Row = { id: autoId++, createdAt: new Date(), updatedAt: new Date(), ...v };
        store.push(row);
        inserted.push(row);
      }
      return this.returningRequested ? inserted.map((r) => this.projectReturning(r)) : [];
    }

    if (this.mode === "update") {
      const affected: Row[] = [];
      for (const r of this.rows()) {
        if (matches(r, this.wherePred)) {
          Object.assign(r, this.updateSet ?? {});
          affected.push(r);
        }
      }
      return this.returningRequested
        ? affected.map((r) => this.projectReturning(r))
        : affected.map((r) => ({ ...r }));
    }

    // delete
    const table = this.table!;
    const store = this.db.rowsFor(table);
    const kept: Row[] = [];
    const removed: Row[] = [];
    for (const r of store) (matches(r, this.wherePred) ? removed : kept).push(r);
    store.length = 0;
    store.push(...kept);
    return removed;
  }

  then<R1 = T, R2 = never>(
    onfulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    try {
      return Promise.resolve(this.exec() as unknown as T).then(onfulfilled, onrejected);
    } catch (err) {
      return Promise.reject(err).then(onfulfilled, onrejected);
    }
  }
}

/**
 * A minimal, honest Drizzle-compatible fake. Seed tables with
 * {@link FakeDb.seed} using the *real* schema table objects as keys, then hand
 * the instance to the mocked `getDb()`.
 */
export class FakeDb {
  private readonly tables = new Map<object, Row[]>();

  seed(table: object, rows: Row[]): this {
    this.tables.set(
      table,
      rows.map((r) => ({ ...r })),
    );
    return this;
  }

  /** Internal: get the live backing array for a table (created on demand). */
  rowsFor(table: object): Row[] {
    let rows = this.tables.get(table);
    if (!rows) {
      rows = [];
      this.tables.set(table, rows);
    }
    return rows;
  }

  /** Read-only snapshot of a table's current rows (for assertions). */
  snapshot(table: object): Row[] {
    return this.rowsFor(table).map((r) => ({ ...r }));
  }

  select(_proj?: unknown): Builder {
    return new Builder(this, "select");
  }
  insert(table: object): Builder {
    return new Builder(this, "insert").setTable(table);
  }
  update(table: object): Builder {
    return new Builder(this, "update").setTable(table);
  }
  delete(table: object): Builder {
    return new Builder(this, "delete").setTable(table);
  }
}
