import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { csrfProtection } from "./csrf";

// Silence logger output during tests
vi.mock("./logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

function createMockResponse() {
  const res: any = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

function createRequest(overrides: Partial<Request> = {}): Request {
  return {
    method: "POST",
    path: "/api/trpc/someRoute",
    headers: {},
    ...overrides,
  } as unknown as Request;
}

describe("csrfProtection", () => {
  let middleware: ReturnType<typeof csrfProtection>;
  let next: ReturnType<typeof vi.fn>;
  let res: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    middleware = csrfProtection();
    next = vi.fn();
    res = createMockResponse();
  });

  // ── Safe methods ────────────────────────────────────────────────────────────

  it.each(["GET", "HEAD", "OPTIONS", "TRACE"])(
    "passes through safe method %s without checking headers",
    (method) => {
      const req = createRequest({
        method,
        headers: { cookie: "app_session_id=abc", origin: "https://evil.com" },
      });
      middleware(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    }
  );

  // ── Route exemptions ────────────────────────────────────────────────────────

  it.each([
    "/api/webhooks/stripe",
    "/api/marketplace-webhook",
    "/api/microsoft-webhook",
    "/api/acs-call-events",
    "/api/acs-call-events/extra",
    "/api/zeptomail-webhook",
    "/health",
    "/healthz",
    "/ready",
    "/api/health",
  ])("exempts path %s regardless of origin", (path) => {
    const req = createRequest({
      method: "POST",
      path,
      headers: { cookie: "app_session_id=abc", origin: "https://evil.com" },
    });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── Cookie detection ────────────────────────────────────────────────────────

  it("skips CSRF check when app_session_id cookie is absent", () => {
    const req = createRequest({
      method: "POST",
      headers: { cookie: "other_cookie=xyz", origin: "https://evil.com" },
    });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("skips CSRF check when no cookie header is present", () => {
    const req = createRequest({
      method: "POST",
      headers: { origin: "https://evil.com" },
    });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("enforces CSRF check when app_session_id cookie is present", () => {
    const req = createRequest({
      method: "POST",
      headers: { cookie: "app_session_id=abc", origin: "https://evil.com" },
    });
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  // ── Missing Origin / Referer headers ────────────────────────────────────────

  it("allows requests with no Origin and no Referer header (curl / server-to-server)", () => {
    const req = createRequest({
      method: "POST",
      headers: { cookie: "app_session_id=abc" },
    });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── Valid Origin ────────────────────────────────────────────────────────────

  it("allows a request from the canonical production origin", () => {
    const req = createRequest({
      method: "POST",
      headers: { cookie: "app_session_id=abc", origin: "https://greenchainz.com" },
    });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows a request from www.greenchainz.com", () => {
    const req = createRequest({
      method: "POST",
      headers: { cookie: "app_session_id=abc", origin: "https://www.greenchainz.com" },
    });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows a request from localhost (dev)", () => {
    const req = createRequest({
      method: "POST",
      headers: { cookie: "app_session_id=abc", origin: "http://localhost:3000" },
    });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── Invalid Origin ──────────────────────────────────────────────────────────

  it("rejects a request from an unknown external origin", () => {
    const req = createRequest({
      method: "POST",
      headers: { cookie: "app_session_id=abc", origin: "https://attacker.example.com" },
    });
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "CSRF validation failed" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a request with an unparseable Origin header", () => {
    const req = createRequest({
      method: "POST",
      headers: { cookie: "app_session_id=abc", origin: "not-a-url" },
    });
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  // ── Referer fallback ────────────────────────────────────────────────────────

  it("allows when only Referer is present and matches an allowed origin", () => {
    const req = createRequest({
      method: "POST",
      headers: {
        cookie: "app_session_id=abc",
        referer: "https://greenchainz.com/some/page",
      },
    });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects when only Referer is present and does not match", () => {
    const req = createRequest({
      method: "POST",
      headers: {
        cookie: "app_session_id=abc",
        referer: "https://attacker.example.com/page",
      },
    });
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  // ── Origin takes precedence over Referer ────────────────────────────────────

  it("uses Origin (not Referer) when both headers are present", () => {
    // Origin is valid, Referer is from an attacker — should allow
    const req = createRequest({
      method: "POST",
      headers: {
        cookie: "app_session_id=abc",
        origin: "https://greenchainz.com",
        referer: "https://attacker.example.com/page",
      },
    });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── Non-POST state-changing methods ─────────────────────────────────────────

  it.each(["PUT", "PATCH", "DELETE"])(
    "enforces CSRF check on %s mutations",
    (method) => {
      const req = createRequest({
        method,
        headers: { cookie: "app_session_id=abc", origin: "https://attacker.example.com" },
      });
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    }
  );
});
