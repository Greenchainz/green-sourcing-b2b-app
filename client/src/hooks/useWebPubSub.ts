import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 5_000;
const MAX_DELAY_MS = 60_000;

/**
 * Hook to listen for WebPubSub notifications.
 * Handles incoming video calls and other real-time events.
 * Degrades gracefully when Azure WebPubSub is not configured:
 * - Skips silently if endpoint env var is missing or invalid
 * - Exponential backoff with hard cap of 5 retries to prevent console spam
 */
export function useWebPubSub() {
  const { user } = useAuth();
  const retryCount = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;

    const endpoint = import.meta.env.VITE_FRONTEND_WEBPUBSUB_ENDPOINT;
    const hub = import.meta.env.VITE_FRONTEND_WEBPUBSUB_HUB;

    // Silently skip if not configured
    if (!endpoint || !hub) return;
    if (!endpoint.startsWith("wss://") && !endpoint.startsWith("ws://")) {
      console.warn("[WebPubSub] Invalid endpoint URL — skipping");
      return;
    }

    const connect = () => {
      if (retryCount.current >= MAX_RETRIES) {
        console.warn(`[WebPubSub] Giving up after ${MAX_RETRIES} attempts. Real-time notifications disabled.`);
        return;
      }
      try {
        const wsUrl = `${endpoint}/client/hubs/${hub}?userId=${user.id}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          retryCount.current = 0;
          console.log("[WebPubSub] Connected");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle incoming video call notification
            if (data.type === "video_call_incoming") {
              // Fetch caller details
              const callerName = data.callerName || "Unknown User";
              
              // Dispatch custom event for IncomingCallNotification component
              const callEvent = new CustomEvent("incoming-video-call", {
                detail: {
                  callId: data.callId,
                  callerId: data.callerId,
                  callerName,
                  conversationId: data.conversationId,
                  timestamp: Date.now(),
                },
              });
              window.dispatchEvent(callEvent);
            }

            // Handle call accepted notification
            if (data.type === "video_call_accepted") {
              const acceptedEvent = new CustomEvent("video-call-accepted", {
                detail: {
                  callId: data.callId,
                  calleeId: data.calleeId,
                },
              });
              window.dispatchEvent(acceptedEvent);
            }

            // Handle call rejected notification
            if (data.type === "video_call_rejected") {
              const rejectedEvent = new CustomEvent("video-call-rejected", {
                detail: {
                  callId: data.callId,
                },
              });
              window.dispatchEvent(rejectedEvent);
            }

            // Handle WebRTC signaling data
            if (data.type === "webrtc_signal") {
              const signalEvent = new CustomEvent("webrtc-signal", {
                detail: {
                  callId: data.callId,
                  senderId: data.senderId,
                  signalType: data.signalType,
                  signalData: data.signalData,
                },
              });
              window.dispatchEvent(signalEvent);
            }
          } catch {
            // Malformed message — ignore silently
          }
        };

        ws.onerror = () => {
          // onerror always fires before onclose — handled there
        };

        ws.onclose = () => {
          retryCount.current += 1;
          if (retryCount.current >= MAX_RETRIES) {
            console.warn(`[WebPubSub] Connection closed (${retryCount.current}/${MAX_RETRIES}). Real-time notifications disabled.`);
            return;
          }
          const delay = Math.min(BASE_DELAY_MS * 2 ** (retryCount.current - 1), MAX_DELAY_MS);
          reconnectTimeout.current = setTimeout(connect, delay);
        };
      } catch (error) {
        console.error("[WebPubSub] Failed to create WebSocket:", error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent retry on intentional unmount
        wsRef.current.close();
      }
      retryCount.current = 0;
    };
  }, [user]);
}
