/**
 * server/db.ts — CANONICAL DB ENTRY POINT FOR ALL SERVER CODE
 *
 * Canonical chain:
 *   lib/pg-pool.ts   → raw pg Pool singleton + query/transaction helpers
 *   lib/db.ts        → Drizzle instance (getDb()) + re-exports from pg-pool
 *   server/db.ts     → (this file) user-model queries + named `db` export
 *
 * Rules:
 *   - Server code: import getDb / db from "./db" or "../db"   ✅
 *   - Raw SQL helpers: import query/queryOne/queryMany from "../../lib/pg-pool" ✅
 *   - Do NOT import directly from lib/db or lib/pg-pool in routers/services
 *     unless you need the raw pg helpers — prefer getDb() for Drizzle ORM work.
 *   - lib/azure/postgres.ts is DEAD (zero importers) — delete it when convenient.
 */

import { eq, and, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { getDb as getSharedDb } from '../lib/db';
import type { DbUserRole } from "../shared/types/roles";

// ─── Async accessor (preferred) ─────────────────────────────────────────────

/** Async Drizzle db accessor. Returns null when DATABASE_URL is unavailable. */
export async function getDb(): Promise<NodePgDatabase | null> {
  return getSharedDb();
}

// ─── Named synchronous-style export ─────────────────────────────────────────
// Some callers (seeds, tests) do: import { db } from './db'
// We expose a module-level promise that resolves to the Drizzle instance.
// Use as: const resolved = await db; or pattern-match on null.
//
// NOTE: This is intentionally a Promise<NodePgDatabase | null>, not a raw
// NodePgDatabase, so it remains safe when DATABASE_URL is absent at import time.

/** Lazily-resolved Drizzle instance. Awaitable named export for seeds/tests. */
export const db: Promise<NodePgDatabase | null> = getSharedDb();

// ─── User model ──────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const resolvedDb = await getDb();
  if (!resolvedDb) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // PostgreSQL upsert: ON CONFLICT ("openId") DO UPDATE
    await resolvedDb
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.openId,
        set: updateSet as Partial<InsertUser>,
      });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const resolvedDb = await getDb();
  if (!resolvedDb) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await resolvedDb
    .select()
    .from(users)
    .where(and(eq(users.openId, openId), isNull(users.deletedAt)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserRole(
  userId: number,
  role: DbUserRole
): Promise<void> {
  const resolvedDb = await getDb();
  if (!resolvedDb) throw new Error("[Database] Cannot update user role: database not available");
  await resolvedDb.update(users).set({ role }).where(eq(users.id, userId));
}
