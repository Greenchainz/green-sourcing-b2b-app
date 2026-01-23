// app/(protected)/ProtectedShell.tsx
"use client";

import { useMsal } from "@azure/msal-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const loginRequest = { scopes: ["User.Read"] };

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { instance, accounts } = useMsal();
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      if (accounts.length === 0) {
        try {
          await instance.ssoSilent(loginRequest);
        } catch {
          await instance.loginRedirect(loginRequest);
        }
      }
    };
    run();
  }, [accounts, instance]);

  if (accounts.length === 0) return null; // or loading spinner

  return <>{children}</>;
}
