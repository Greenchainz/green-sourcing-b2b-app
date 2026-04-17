import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

const APP_ID = "cqtm1euj";
const LAUNCHER_POSITION = {
  horizontal_padding: 20,
  vertical_padding: 92,
} as const;

// Intercom is loaded via script tag, declare as window global
declare global {
  interface Window {
    Intercom?: (command: string, props?: Record<string, unknown>) => void;
  }
}

/**
 * Intercom Messenger with JWT identity verification.
 * - Anonymous visitors: Intercom boots with just app_id
 * - Logged-in users: fetches JWT from /api/intercom/token, boots with verified identity
 */
export default function IntercomWidget() {
  const { user } = useAuth();
  const bootedUserId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const waitForIntercom = () =>
      new Promise<boolean>((resolve) => {
        if (window.Intercom) {
          resolve(true);
          return;
        }

        let attempts = 0;
        const timer = window.setInterval(() => {
          if (window.Intercom) {
            window.clearInterval(timer);
            resolve(true);
            return;
          }

          attempts += 1;
          if (attempts >= 50) {
            window.clearInterval(timer);
            resolve(false);
          }
        }, 100);
      });

    const bootIntercom = async () => {
      const loaded = await waitForIntercom();
      if (!loaded || cancelled) return;

      if (user && bootedUserId.current !== user.id) {
        if (bootedUserId.current) {
          window.Intercom?.("shutdown");
        }

        try {
          const response = await fetch("/api/intercom/token", { credentials: "include" });
          const data = response.ok ? await response.json() : null;

          window.Intercom?.("boot", {
            app_id: APP_ID,
            ...LAUNCHER_POSITION,
            user_id: user.id,
            name: user.name,
            email: user.email,
            intercom_user_jwt: data?.token,
          });
        } catch {
          window.Intercom?.("boot", {
            app_id: APP_ID,
            ...LAUNCHER_POSITION,
            user_id: user.id,
            name: user.name,
            email: user.email,
          });
        }

        bootedUserId.current = user.id;
        return;
      }

      if (!user && bootedUserId.current) {
        window.Intercom?.("shutdown");
        window.Intercom?.("boot", { app_id: APP_ID, ...LAUNCHER_POSITION });
        bootedUserId.current = null;
        return;
      }

      if (!user && !bootedUserId.current) {
        window.Intercom?.("boot", { app_id: APP_ID, ...LAUNCHER_POSITION });
      }
    };

    void bootIntercom();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return null;
}
