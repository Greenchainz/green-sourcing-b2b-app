/**
 * Canonical role definitions for GreenChainz.
 *
 * Source of truth for all role checks across server, client, and tests.
 * The Postgres enum `user_role` in drizzle/schema.ts must stay in sync
 * with DB_USER_ROLES below.
 *
 * Important: "architect" is a UI display alias only — architects are stored
 * as role="buyer" in the database. Use ARCHITECT_INPUT_ALIAS when accepting
 * user-facing role names (e.g. admin test-session creator, invite flows).
 */

import { z } from "zod";

// ── DB roles (match Postgres user_role enum exactly) ─────────────────────────

export const DB_USER_ROLES = ["user", "admin", "buyer", "supplier"] as const;
export type DbUserRole = (typeof DB_USER_ROLES)[number];

export const dbUserRoleSchema = z.enum(DB_USER_ROLES);

// ── Active roles (roles that can actually authenticate — excludes legacy "user") ──

export const ACTIVE_USER_ROLES = ["admin", "buyer", "supplier"] as const;
export type ActiveUserRole = (typeof ACTIVE_USER_ROLES)[number];

export const activeUserRoleSchema = z.enum(ACTIVE_USER_ROLES);

// ── UI input roles (includes "architect" as an alias for "buyer") ─────────────
// Use this only in admin flows where the caller may supply "architect" as a label.
// Always normalise through UI_TO_DB_ROLE before writing to the database.

export const UI_INPUT_ROLES = ["supplier", "buyer", "architect", "admin"] as const;
export type UiInputRole = (typeof UI_INPUT_ROLES)[number];

export const uiInputRoleSchema = z.enum(UI_INPUT_ROLES);

/**
 * Maps a UI-facing input role to the canonical DB role.
 * "architect" → "buyer" (architects are stored as buyers in the DB).
 */
export const UI_TO_DB_ROLE: Record<UiInputRole, DbUserRole> = {
  supplier: "supplier",
  buyer: "buyer",
  architect: "buyer",
  admin: "admin",
} as const;

// ── Role hierarchy helpers ────────────────────────────────────────────────────

/** Returns true if the given role has admin-level access. */
export function isAdmin(role: DbUserRole | null | undefined): boolean {
  return role === "admin";
}

/** Returns true if the given role is a buyer or admin (i.e. can act as an architect). */
export function isBuyerOrAdmin(role: DbUserRole | null | undefined): boolean {
  return role === "buyer" || role === "admin";
}

/** Returns true if the given role is a supplier or admin. */
export function isSupplierOrAdmin(role: DbUserRole | null | undefined): boolean {
  return role === "supplier" || role === "admin";
}
