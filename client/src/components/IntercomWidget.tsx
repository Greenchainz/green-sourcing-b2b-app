import { useEffect, useRef } from "react";
import Intercom from "@intercom/messenger-js-sdk";
import { useAuth } from "@/contexts/AuthContext";

const APP_ID = "cqtm1euj";

/**
 * Intercom Messenger with JWT identity verification.
 * - Anonymous visitors: Intercom boots with just app_id
 * - Logged-in users: fetches JWT from /api/intercom/token, boots with verified identity
 */
export default function IntercomWidget() {
  const { user } = useAuth();
  const bootedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (user && bootedUserId.current !== user.id) {
      // Logged in — get JWT and boot with verified identity
      fetch("/api/intercom/token", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          Intercom({
            app_id: APP_ID,
            user_id: user.id,
            name: user.name,
            email: user.email,
            intercom_user_jwt: data?.token,
          });
          bootedUserId.current = user.id;
        })
        .catch(() => {
          // JWT fetch failed — boot without identity verification
          Intercom({
            app_id: APP_ID,
            user_id: user.id,
            name: user.name,
            email: user.email,
          });
          bootedUserId.current = user.id;
        });
    } else if (!user && bootedUserId.current) {
      // Logged out — reset to anonymous
      Intercom({ app_id: APP_ID });
      bootedUserId.current = null;
    } else if (!user && !bootedUserId.current) {
      // Anonymous visitor
      Intercom({ app_id: APP_ID });
    }
  }, [user]);

  return null;
}
