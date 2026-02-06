// app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import IntercomWidget from "./components/IntercomWidget";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <IntercomWidget />
    </SessionProvider>
  );
}
