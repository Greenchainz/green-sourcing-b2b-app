import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import LinkedIn from "next-auth/providers/linkedin"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
    }),
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On sign in, set default role from sessionStorage or default to buyer
      if (user) {
        token.role = user.role || "buyer"; // Default to buyer if no role specified
      }
      // Allow role updates from session
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.role) {
        session.user.role = token.role as string;
      }
      return session;
    },
  },
})
