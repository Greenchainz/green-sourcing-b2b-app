import { betterAuth } from "better-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { google, linkedin, microsoft } from "better-auth/social-providers";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/drizzle/schema";

/**
 * GreenChainz Authentication — better-auth v1.x
 *
 * better-auth constructs OAuth redirect URIs as:
 *   {BETTER_AUTH_URL}/api/auth/callback/{provider}
 *
 * ── Required Redirect URIs in Azure Entra App Registration ──────────────────
 *   https://www.greenchainz.com/api/auth/callback/microsoft
 *   https://greenchainz.com/api/auth/callback/microsoft
 *   http://localhost:3000/api/auth/callback/microsoft   (dev)
 *
 * ── Required Redirect URIs in Google OAuth Console ──────────────────────────
 *   https://www.greenchainz.com/api/auth/callback/google
 *   http://localhost:3000/api/auth/callback/google       (dev)
 *
 * ── Required Redirect URIs in LinkedIn Developer Portal ─────────────────────
 *   https://www.greenchainz.com/api/auth/callback/linkedin
 *   http://localhost:3000/api/auth/callback/linkedin     (dev)
 *
 * ── Remove from Entra (Easy Auth — no longer used) ──────────────────────────
 *   https://www.greenchainz.com/.auth/login/aad/callback
 *   https://greenchainz.com/.auth/login/aad/callback
 *   https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io/.auth/login/aad/callback
 */

export const { handlers, auth, signIn, signOut } = betterAuth({
  /**
   * BETTER_AUTH_URL must be set in your environment to the app's root URL.
   * better-auth uses this to construct the redirect_uri sent to OAuth providers.
   * Production: https://www.greenchainz.com
   * Development: http://localhost:3000
   */
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

  database: DrizzleAdapter(db),

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    },
    microsoft: {
      clientId: process.env.AZURE_CLIENT_ID_APP!,
      clientSecret: process.env.AZURE_CLIENT_SECRET_APP!,
      tenantId: process.env.AZURE_TENANT_ID_APP!,
    },
  },

  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      // Expose role on the session for middleware-level route protection
      // @ts-expect-error — role is a custom field on the users table
      session.user.role = (user as { role?: string }).role ?? "buyer";
      return session;
    },

    /**
     * signIn callback — fires on every successful sign-in.
     *
     * 1. Admin Role Auto-Assignment:
     *    Users with @greenchainz.com email are automatically assigned the
     *    'admin' role. This is NOT user-selectable — it is derived from email.
     *
     * 2. Microsoft Marketplace Integration Hook:
     *    Links the Entra ID user to their Marketplace subscription record.
     *    DO NOT remove without reviewing server/microsoft-subscription-service.ts.
     */
    async signIn({ user, account }) {
      // ── Admin Role Auto-Assignment ────────────────────────────────────────
      if (user.email?.endsWith("@greenchainz.com")) {
        try {
          await db
            .update(users)
            .set({ role: "admin" } as Record<string, unknown>)
            .where(eq(users.id, user.id));
        } catch (err) {
          // Non-fatal: log but do not block sign-in
          console.warn("[auth] Failed to set admin role for", user.email, err);
        }
      }

      // ── Microsoft Marketplace Integration ────────────────────────────────
      if (account?.provider === "microsoft") {
        // TODO: Link user.id to their Microsoft Marketplace subscription record.
        // See: server/microsoft-subscription-service.ts → linkUserToSubscription()
        // This hook fires on every Microsoft sign-in, including token refresh.
      }

      return true;
    },
  },
});
