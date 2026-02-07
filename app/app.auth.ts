import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { authConfig } from "./auth.config";

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
    updateAge: 15 * 60,
  },
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      console.log("✅ Login:", user.email);
      return true;
    },
  },
  debug: true,
});
