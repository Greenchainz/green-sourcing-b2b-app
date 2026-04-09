import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { canAccessRfqPdf, requireAdminUser } from "./route-auth-guards";

function createMockResponse() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json } as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

describe("requireAdminUser", () => {
  it("returns 401 when authentication fails", async () => {
    const res = createMockResponse();
    const authenticateRequest = vi.fn(async () => {
      throw new Error("invalid");
    });

    const user = await requireAdminUser({} as Request, res, authenticateRequest);

    expect(user).toBeNull();
    expect(res.status).toHaveBeenCalledWith(401);
    expect((res.status as any).mock.results[0].value.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("returns 403 when authenticated user is not admin", async () => {
    const res = createMockResponse();
    const authenticateRequest = vi.fn(async () => ({ id: 10, role: "buyer" }));

    const user = await requireAdminUser({} as Request, res, authenticateRequest as any);

    expect(user).toBeNull();
    expect(res.status).toHaveBeenCalledWith(403);
    expect((res.status as any).mock.results[0].value.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("returns user when authenticated user is admin", async () => {
    const res = createMockResponse();
    const authenticateRequest = vi.fn(async () => ({ id: 1, role: "admin", email: "admin@example.com" }));

    const user = await requireAdminUser({} as Request, res, authenticateRequest as any);

    expect(user).toEqual({ id: 1, role: "admin", email: "admin@example.com" });
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("canAccessRfqPdf", () => {
  it("allows RFQ owner", () => {
    expect(canAccessRfqPdf({ id: 7, role: "buyer" } as any, 7)).toBe(true);
  });

  it("allows admin even when not owner", () => {
    expect(canAccessRfqPdf({ id: 99, role: "admin" } as any, 7)).toBe(true);
  });

  it("denies non-owner non-admin", () => {
    expect(canAccessRfqPdf({ id: 8, role: "supplier" } as any, 7)).toBe(false);
  });
});
