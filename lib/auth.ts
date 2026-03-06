import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { google, linkedin, microsoft } from "better-auth/social-providers";

import { db } from "~/server/db";

export const { handlers, auth, signIn, signOut } = betterAuth({
  adapter: DrizzleAdapter(db),
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
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      tenantId: process.env.AZURE_TENANT_ID!,
    },
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
    /**
     * IMPORTANT: Microsoft Marketplace Integration Hook
     * Fires on every Microsoft sign-in. Use this to link the Entra ID user
     * to their Marketplace subscription.
     * DO NOT remove without reviewing server/microsoft-subscription-service.ts first.
     */
    async signIn({ user, account }) {
      if (account?.provider === "microsoft") {
        // TODO: Link user.id to their Microsoft Marketplace subscription record
        // See: server/microsoft-subscription-service.ts
      }
      return true;
    },
  },
});
