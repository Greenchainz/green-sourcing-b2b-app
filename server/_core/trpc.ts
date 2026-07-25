import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { User } from '../../drizzle/schema';
import type { TrpcContext } from './context';
import {
  rateLimitMiddleware,
  agentRateLimitMiddleware,
  leadCaptureRateLimitMiddleware,
} from './rateLimit';
import { canAccessAdmin } from "./admin-access";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

// ── Base procedures ───────────────────────────────────────────────────────────────

/** All public endpoints get a general rate limit by default. */
export const publicProcedure = t.procedure.use(rateLimitMiddleware);

/** Expensive AI endpoints (agent.chat, semanticSearch). */
export const agentProcedure = t.procedure
  .use(rateLimitMiddleware)
  .use(agentRateLimitMiddleware);

/** Public mutation endpoints that should be strictly throttled (lead capture). */
export const leadCaptureProcedure = t.procedure.use(leadCaptureRateLimitMiddleware);

// ── Auth middleware ───────────────────────────────────────────────────────────────

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: UNAUTHED_ERR_MSG });
  }

  return next({ ctx: { ...ctx, user: ctx.user as User } });
});

export const protectedProcedure = t.procedure
  .use(rateLimitMiddleware)
  .use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!canAccessAdmin(ctx.user)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: NOT_ADMIN_ERR_MSG });
    }

    return next({ ctx: { ...ctx, user: ctx.user as User } });
  }),
);

// Architects are stored as role='buyer' in the DB.
// Admins can also access architect procedures.
export const architectProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    const role = ctx.user?.role;
    if (!role) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: UNAUTHED_ERR_MSG });
    }
    if (role !== 'buyer' && role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Architect access required.' });
    }

    return next({ ctx: { ...ctx, user: ctx.user as User } });
  }),
);
