import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

const APP_ID = "cqtm1euj";

declare global {
  interface Window {
    Intercom?: (...args: unknown[]) => void;
    intercomSettings?: Record<string, unknown>;
  }
}

/**
 * Intercom Messenger widget with JWT identity verification.
 * - Anonymous visitors: shows Intercom with no identity
 * - Logged-in users: fetches a JWT from /api/intercom/token and
 *   boots Intercom with verified user_id + email + name
 */
export default function IntercomWidget() {
  const { user } = useAuth();
  const bootedRef = useRef(false);

  // Load the Intercom script once
  useEffect(() => {
    if (window.Intercom) return;

    window.intercomSettings = { app_id: APP_ID };

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://widget.intercom.io/widget/${APP_ID}`;
    document.body.appendChild(script);

    script.onload = () => {
      window.Intercom?.("boot", { app_id: APP_ID });
    };
  }, []);

  // Update Intercom when user logs in/out
  useEffect(() => {
    if (!window.Intercom) return;

    if (user) {
      // Fetch JWT from our backend for identity verification
      fetch("/api/intercom/token", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.token) {
            window.Intercom?.("update", {
              app_id: APP_ID,
              intercom_user_jwt: data.token,
              name: user.name,
              email: user.email,
              user_id: user.id,
              role: user.role,
            });
            bootedRef.current = true;
          }
        })
        .catch(() => {
          // JWT fetch failed — still show Intercom without identity
          window.Intercom?.("update", { app_id: APP_ID });
        });
    } else if (bootedRef.current) {
      // User logged out — reset to anonymous
      window.Intercom?.("shutdown");
      window.Intercom?.("boot", { app_id: APP_ID });
      bootedRef.current = false;
    }
  }, [user]);

  return null; // Intercom renders its own UI
}
