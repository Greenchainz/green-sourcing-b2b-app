import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { BetterAuth } from "better-auth";
import Google from "better-auth/providers/google";
import LinkedIn from "better-auth/providers/linkedin";
import Microsoft from "better-auth/providers/microsoft-entra-id";

import { db } from "~/server/db";

export const { handlers, auth, signIn, signOut } = BetterAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    }),
    Microsoft({
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      tenantId: process.env.AZURE_TENANT_ID,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
    // IMPORTANT: This callback is critical for Microsoft Marketplace integration
    async signIn({ user, account, profile }) {
      if (account?.provider === "microsoft-entra-id") {
        // Here you would typically link the Entra ID user to a marketplace subscription
        // For now, we will just log the sign-in
        console.log("Microsoft user signed in:", user);
      }
      return true;
    },
  },
});
