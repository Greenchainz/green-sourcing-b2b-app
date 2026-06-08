import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

const APP_ID = "cqtm1euj";
const INTERCOM_SCRIPT_SRC = "https://widget.intercom.io/widget/cqtm1euj";
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

let intercomScriptPromise: Promise<boolean> | null = null;

const loadIntercomScript = async () => {
  if (window.Intercom) return true;
  if (intercomScriptPromise) return intercomScriptPromise;

  intercomScriptPromise = new Promise<boolean>((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${INTERCOM_SCRIPT_SRC}"]`
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = INTERCOM_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.intercomLoader = "deferred";
    script.addEventListener("load", () => resolve(true), { once: true });
    script.addEventListener("error", () => resolve(false), { once: true });
    document.body.appendChild(script);
  });

  return intercomScriptPromise;
};

/**
 * Intercom Messenger with JWT identity verification.
 * - Anonymous visitors: Intercom boots with just app_id
 * - Logged-in users: fetches JWT from /api/intercom/token, boots with verified identity
 */
export default function IntercomWidget() {
  const { user } = useAuth();
  // Tracks boot state: null = not booted, "anonymous" = anonymous boot, "<id>" = user boot.
  // Using "anonymous" as a sentinel ensures shutdown() is called before re-booting
  // as an authenticated user — without this, boot() is a no-op on an already-booted
  // anonymous session and the widget disappears after login.
  const bootedUserId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootIntercom = async () => {
      const loaded = await loadIntercomScript();
      if (!loaded || cancelled) return;

      if (user && bootedUserId.current !== user.id) {
        // Shutdown any existing session (anonymous or a different user)
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
        bootedUserId.current = "anonymous";
        return;
      }

      if (!user && !bootedUserId.current) {
        window.Intercom?.("boot", { app_id: APP_ID, ...LAUNCHER_POSITION });
        bootedUserId.current = "anonymous";
      }
    };

    const scheduleBoot = () => {
      if (cancelled) return;
      void bootIntercom();
    };

    const timer = globalThis.setTimeout(scheduleBoot, 1200);

    return () => {
      cancelled = true;
      globalThis.clearTimeout(timer);
    };
  }, [user]);

  return null;
}
