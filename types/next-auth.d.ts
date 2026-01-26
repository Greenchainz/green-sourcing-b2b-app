// Type definitions for NextAuth v5 with custom user fields
import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    plan?: string;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    plan: string;
    role: string;
  }
}
