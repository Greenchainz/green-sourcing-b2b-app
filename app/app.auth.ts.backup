import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
// import { PrismaAdapter } from "@auth/prisma-adapter"; // Uncomment when ready
// import { prisma } from "@/lib/prisma";                // Uncomment when ready
import { authConfig } from "./auth.config";

/**
 * NextAuth.js Full Configuration
 * 
 * 🚨 IMPORTANT: This file includes providers and can use Node.js APIs
 * - Extends lightweight auth.config.ts (used by middleware)
 * - Adds OAuth providers and Credentials provider
 * - Can include database adapter when ready
 * - NOT imported by middleware (Edge Runtime safe)
 */

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  // adapter: PrismaAdapter(prisma), // Add this back when DB is ready
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours absolute
    updateAge: 15 * 60, // 15 minutes idle refresh
  },
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID || process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET || process.env.AZURE_AD_CLIENT_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER || (process.env.AZURE_AD_TENANT_ID ? `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0` : undefined),
      authorization: {
        params: {
          scope: "openid profile email",
          prompt: "select_account",
        },
      },
    }),
  ],
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        domain: process.env.COOKIE_DOMAIN,
        maxAge: 8 * 60 * 60,
      },
    },
  },
  callbacks: {
    // Spread other callbacks from authConfig first (authorized, session, etc.)
    ...authConfig.callbacks,
    /**
     * signIn callback for OAuth providers
     * Called after OAuth provider returns user info
     * This overrides any signIn callback from authConfig
     * 
     * 🚨 This also runs in Edge Runtime - NO DB calls
     * Solution: Call /api/auth-callback instead
     */
    async signIn({ user, account }) {
      console.log("🔐 OAuth SignIn - Provider:", account?.provider, "Email:", user.email);

      const authAgentEndpoint = process.env.AUTH_AGENT_ENDPOINT || null;
      if (authAgentEndpoint) {
        try {
          await fetch(`${authAgentEndpoint}/log-event`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_type: "login",
              user_id: user.id,
              email: user.email,
              provider: account?.provider,
              timestamp: new Date().toISOString(),
            }),
          });
        } catch (error) {
          console.error("❌ Auth audit log failed:", error);
        }
      } else {
        console.log("[AUTH AUDIT]", {
          event_type: "login",
          user_id: user.id,
          email: user.email,
          provider: account?.provider,
          timestamp: new Date().toISOString(),
        });
      }

      if (!user.email) return false;

      try {
        // Use NEXTAUTH_URL or AUTH_URL for production-ready base URL
        const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'https://greenchainz.com';

        // 1. Check if user exists
        const checkResponse = await fetch(`${baseUrl}/api/auth-callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check_user',
            email: user.email,
          }),
        });

        const checkData = await checkResponse.json();

        if (!checkData.exists) {
          // Create new user
          const createResponse = await fetch(`${baseUrl}/api/auth-callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create_user',
              email: user.email,
              name: user.name,
              entra_id: user.id,
            }),
          });

          const createData = await createResponse.json();
          if (!createData.success) {
            console.error("❌ Failed to create user");
            return false;
          }
        } else {
          // Update login timestamp
          await fetch(`${baseUrl}/api/auth-callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_login',
              email: user.email,
            }),
          });
        }

        return true;
      } catch (error) {
        console.error("❌ Auth callback error:", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role || "buyer";
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token as { role?: string }).role || "buyer";
        session.user.id = (token as { userId?: string }).userId || session.user.id;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
});
