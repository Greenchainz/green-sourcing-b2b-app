import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import Google from "next-auth/providers/google"
import LinkedIn from "next-auth/providers/linkedin"

/**
 * NextAuth.js Configuration
 * 
 * 🚨 IMPORTANT: This runs in Edge Runtime (middleware)
 * - NO Node.js modules (pg, fs, etc.)
 * - NO database calls here
 * - DB operations delegated to /api/auth-callback route
 */

export const authConfig = {
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
    /**
     * signIn callback
     * Called after OAuth provider returns user info
     * 
     * 🚨 This also runs in Edge Runtime - NO DB calls
     * Solution: Call /api/auth-callback instead
     */
    async signIn({ user, account }) {
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
    
    async session({ session, token }) {
      // Pass user ID to session
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login?error=auth_error',
  },
  debug: process.env.NODE_ENV === 'development',
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
