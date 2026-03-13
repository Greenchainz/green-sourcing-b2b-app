import { describe, it, expect, vi, beforeEach } from "vitest";
import { ec3Router } from "./routers/ec3-router";
import * as dbModule from "./db";
import * as ec3Module from "./ec3";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

vi.mock("./ec3", () => ({
  fetchEC3EPDs: vi.fn(),
  searchEC3EPDs: vi.fn(),
}));

describe("EC3 Router Benchmark", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should measure number of queries in searchAndSync (Baseline)", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => Promise.resolve([])),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockImplementation(() => Promise.resolve()),
    };

    (dbModule.getDb as any).mockResolvedValue(mockDb);

    const itemCount = 10;
    const mockEpds = Array.from({ length: itemCount }, (_, i) => ({
      id: `epd-${i}`,
      name: `EPD ${i}`,
      category: { display_name: "Category" },
      gwp: "100 kgCO2e",
      manufacturer: { name: "Manufacturer" },
      externally_verified: true,
    }));

    (ec3Module.searchEC3EPDs as any).mockResolvedValue(mockEpds);

    // Create a caller for the procedure
    // Note: in trpc v11, we might need a different way to call it if createCaller is not available
    // but we can try to access the handler directly for the sake of benchmark if needed.
    // However, createCaller is standard.
    const caller = ec3Router.createCaller({
      user: { id: 1, role: "admin" } as any,
    } as any);

    await caller.searchAndSync({ query: "concrete", limit: itemCount, sync: true });

    // Count select calls
    const selectCalls = mockDb.select.mock.calls.length;
    const insertCalls = mockDb.insert.mock.calls.length;

    console.log(`\nBENCHMARK RESULTS (searchAndSync for ${itemCount} items):`);
    console.log(`Select queries: ${selectCalls}`);
    console.log(`Insert queries: ${insertCalls}`);
    console.log(`Total queries: ${selectCalls + insertCalls}`);

    // In the baseline, we expect N selects and N inserts
    // (Actual code might have 1 extra select if there are other things, but here it should be N+N)
  });
});
