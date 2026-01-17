/**
 * Azure PostgreSQL Integration Tests (Mock)
 * 
 * Tests for Azure PostgreSQL connection helpers with retry logic
 */

// Mock the pg module
jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({
      rows: [{ id: 1, name: "Test" }],
      rowCount: 1,
    }),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
    }),
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    totalCount: 5,
    idleCount: 3,
    waitingCount: 0,
  })),
}));

describe("Azure PostgreSQL Client", () => {
  let postgres: typeof import("../../../lib/azure/postgres");

  beforeAll(() => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  });

  beforeEach(() => {
    jest.resetModules();
    postgres = require("../../../lib/azure/postgres");
  });

  afterAll(() => {
    delete process.env.DATABASE_URL;
  });

  describe("getPostgresPool", () => {
    it("should create a connection pool", () => {
      const pool = postgres.getPostgresPool();
      expect(pool).toBeDefined();
    });

    it("should return the same pool on subsequent calls", () => {
      const pool1 = postgres.getPostgresPool();
      const pool2 = postgres.getPostgresPool();
      expect(pool1).toBe(pool2);
    });
  });

  describe("isPostgresConfigured", () => {
    it("should return true when DATABASE_URL is set", () => {
      expect(postgres.isPostgresConfigured()).toBe(true);
    });
  });

  describe("query", () => {
    it("should execute a query with parameters", async () => {
      const result = await postgres.query("SELECT * FROM users WHERE id = $1", [1]);
      expect(result.rows).toBeDefined();
      expect(result.rowCount).toBeDefined();
    });
  });

  describe("queryOne", () => {
    it("should return a single row", async () => {
      const row = await postgres.queryOne<{ id: number; name: string }>(
        "SELECT * FROM users WHERE id = $1",
        [1]
      );
      expect(row).toEqual({ id: 1, name: "Test" });
    });

    it("should return null for empty results", async () => {
      const mockPool = postgres.getPostgresPool() as jest.Mocked<InstanceType<typeof import("pg").Pool>>;
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const row = await postgres.queryOne("SELECT * FROM users WHERE id = $1", [999]);
      expect(row).toBeNull();
    });
  });

  describe("queryAll", () => {
    it("should return all rows", async () => {
      const rows = await postgres.queryAll<{ id: number; name: string }>(
        "SELECT * FROM users"
      );
      expect(Array.isArray(rows)).toBe(true);
    });
  });

  describe("queryScalar", () => {
    it("should return a scalar value", async () => {
      const mockPool = postgres.getPostgresPool() as jest.Mocked<InstanceType<typeof import("pg").Pool>>;
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: 42 }], rowCount: 1 });

      const count = await postgres.queryScalar<number>("SELECT COUNT(*) FROM users");
      expect(count).toBe(42);
    });
  });

  describe("withTransaction", () => {
    it("should execute callback within a transaction", async () => {
      const result = await postgres.withTransaction(async (client) => {
        await client.query("INSERT INTO users (name) VALUES ($1)", ["Test"]);
        return "success";
      });

      expect(result).toBe("success");
    });
  });

  describe("healthCheck", () => {
    it("should return health status", async () => {
      const health = await postgres.healthCheck();

      expect(health).toHaveProperty("healthy");
      expect(health).toHaveProperty("latencyMs");
      expect(health).toHaveProperty("poolStats");
    });
  });

  describe("closePostgresPool", () => {
    it("should close the connection pool", async () => {
      await postgres.closePostgresPool();
      // Pool should be null after closing
    });
  });

  describe("module exports", () => {
    it("should export all required functions", () => {
      expect(postgres.getPostgresPool).toBeDefined();
      expect(postgres.closePostgresPool).toBeDefined();
      expect(postgres.resetPostgresPool).toBeDefined();
      expect(postgres.isPostgresConfigured).toBeDefined();
      expect(postgres.query).toBeDefined();
      expect(postgres.queryOne).toBeDefined();
      expect(postgres.queryAll).toBeDefined();
      expect(postgres.queryScalar).toBeDefined();
      expect(postgres.withTransaction).toBeDefined();
      expect(postgres.getClient).toBeDefined();
      expect(postgres.batchQuery).toBeDefined();
      expect(postgres.bulkInsert).toBeDefined();
      expect(postgres.healthCheck).toBeDefined();
    });
  });
});
