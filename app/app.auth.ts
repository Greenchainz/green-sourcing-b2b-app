import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Google from "next-auth/providers/google";
import LinkedIn from "next-auth/providers/linkedin";
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
  session: { strategy: "jwt" },
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      authorization: { params: { scope: "openid profile email User.Read" } },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    LinkedIn({
      clientId: process.env.AUTH_LINKEDIN_ID,
      clientSecret: process.env.AUTH_LINKEDIN_SECRET,
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        // TODO: Replace with real database verification
        // For testing only:
        if (credentials.email === "test@example.com" && credentials.password === "password") {
          return { id: "1", name: "Test User", email: "test@example.com" };
        }
        return null;
      }
    })
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
        domain: process.env.COOKIE_DOMAIN || "localhost",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    /**
     * signIn callback for OAuth providers
     * Called after OAuth provider returns user info
     * 
     * 🚨 This also runs in Edge Runtime - NO DB calls
     * Solution: Call /api/auth-callback instead
     */
    async signIn({ user, account }) {
      // Skip OAuth database handling for Credentials provider
      if (account?.provider === "credentials") {
        return true;
      }

      console.log("🔐 OAuth SignIn - Provider:", account?.provider, "Email:", user.email);
      
      if (!user.email) return false;

      try {
        // Call Node.js API route to handle DB operations
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3002';
        
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
  },
  debug: process.env.NODE_ENV === 'development',
});
