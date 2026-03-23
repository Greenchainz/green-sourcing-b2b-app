"use client";

import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  // Container App sets NEXT_PUBLIC_BASE_URL; local dev may use NEXT_PUBLIC_SITE_URL
  baseURL: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
});

export const signIn = authClient.signIn;
export const signOut = authClient.signOut;
export const useSession = authClient.useSession;

export default authClient;
