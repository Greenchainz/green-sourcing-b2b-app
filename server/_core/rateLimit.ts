/**
 * Sliding-window rate limiter for tRPC procedures.
 *
 * Strategy: in-memory Map keyed by "userId" (authenticated) or "ip:anonymous".
 * Works zero-config in dev and in a single Azure Container App replica.
 * If you ever scale to multiple replicas, swap the Map for a Redis INCR+TTL call
 * (the interface is identical — just replace getEntry/setEntry below).
 *
 * Usage in trpc.ts:
 *   import { rateLimitMiddleware, agentRateLimitMiddleware } from './rateLimit';
 *   export const publicProcedure = t.procedure.use(rateLimitMiddleware);
 *   export const agentProcedure  = publicProcedure.use(agentRateLimitMiddleware);
 */
import { TRPCError } from '@trpc/server';
import type { TrpcContext } from './context';
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WindowEntry {
  count: number;
  resetAt: number; // unix ms
}

// ── In-memory store ───────────────────────────────────────────────────────────

const store = new Map<string, WindowEntry>();

// Prune stale entries every 5 min to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1_000);

// ── Core helper ───────────────────────────────────────────────────────────────

function check(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return; // first request in window — always allowed
  }

  entry.count += 1;

  if (entry.count > limit) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded. Please slow down and try again.',
    });
  }
}

function getIp(ctx: TrpcContext): string {
  const forwarded = ctx.req?.headers?.['x-forwarded-for'];
  if (Array.isArray(forwarded)) return forwarded[0]?.split(',')[0]?.trim() ?? 'unknown';
  return forwarded?.split(',')[0]?.trim() ?? ctx.req?.socket?.remoteAddress ?? 'unknown';
}

// ── Middleware factory ────────────────────────────────────────────────────────

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

/**
 * General-purpose rate limiter.
 * Authenticated users: 120 req/min.  Anon IPs: 60 req/min.
 */
export const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  if (ctx.user) {
    check(`user:${ctx.user.id}`, 120, 60_000);
  } else {
    check(`ip:${getIp(ctx)}`, 60, 60_000);
  }
  return next();
});

/**
 * Tight rate limiter for expensive AI endpoints (agent chat, semantic search).
 * Authenticated: 20 req/min.  Anon: 10 req/min.
 */
export const agentRateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  if (ctx.user) {
    check(`agent:user:${ctx.user.id}`, 20, 60_000);
  } else {
    check(`agent:ip:${getIp(ctx)}`, 10, 60_000);
  }
  return next();
});

/**
 * Very tight rate limiter for public mutation endpoints (lead capture, etc.).
 * Per-IP: 5 per 10 min.
 */
export const leadCaptureRateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  check(`lead:ip:${getIp(ctx)}`, 5, 10 * 60_000);
  return next();
});
