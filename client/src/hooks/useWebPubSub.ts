import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 5_000;
const MAX_DELAY_MS = 60_000;

/**
 * Hook to listen for WebPubSub notifications.
 * Fetches a signed client access URL from the server (JWT embedded),
 * then opens a WebSocket to Azure Web PubSub.
 *
 * Handles incoming video calls, call accepted/rejected, and WebRTC signaling
 * by dispatching CustomEvents on window — consumed by IncomingCallNotification
 * and VideoCallModal.
 *
 * Degrades gracefully when Web PubSub is not configured on the server.
 */
export function useWebPubSub() {
  const { user } = useAuth();
  const retryCount = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch a signed WebSocket URL from the server.
  // The server generates a JWT-signed URL via Azure Web PubSub SDK.
  // Skip if user is not logged in.
  const { data: tokenData } = trpc.messaging.getNotificationToken.useQuery(undefined, {
    enabled: !!user,
    // Token is valid 60 min — refetch every 50 min to stay ahead of expiry
    staleTime: 50 * 60 * 1_000,
    retry: false,
  });

  useEffect(() => {
    if (!user || !tokenData?.url) return;

    const wsUrl = tokenData.url; // full wss://... with access_token param included

    const connect = () => {
      if (retryCount.current >= MAX_RETRIES) {
        console.warn(
          `[WebPubSub] Giving up after ${MAX_RETRIES} attempts. Real-time notifications disabled.`
        );
        return;
      }

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          retryCount.current = 0;
          console.log("[WebPubSub] Connected");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string) as Record<string, unknown>;

            if (data.type === "video_call_incoming") {
              window.dispatchEvent(
                new CustomEvent("incoming-video-call", {
                  detail: {
                    callId: data.callId,
                    callerId: data.callerId,
                    callerName: data.callerName ?? "Unknown User",
                    conversationId: data.conversationId,
                    timestamp: Date.now(),
                  },
                })
              );
            }

            if (data.type === "video_call_accepted") {
              window.dispatchEvent(
                new CustomEvent("video-call-accepted", {
                  detail: { callId: data.callId, calleeId: data.calleeId },
                })
              );
            }

            if (data.type === "video_call_rejected") {
              window.dispatchEvent(
                new CustomEvent("video-call-rejected", {
                  detail: { callId: data.callId },
                })
              );
            }

            if (data.type === "webrtc_signaling") {
              window.dispatchEvent(
                new CustomEvent("webrtc-signal", {
                  detail: {
                    callId: data.callId,
                    senderId: data.senderId,
                    signalType: data.signalType,
                    signalData: data.signalData,
                  },
                })
              );
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
            console.warn(
              `[WebPubSub] Connection closed (${retryCount.current}/${MAX_RETRIES}). Real-time notifications disabled.`
            );
            return;
          }
          const delay = Math.min(
            BASE_DELAY_MS * 2 ** (retryCount.current - 1),
            MAX_DELAY_MS
          );
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
  }, [user, tokenData?.url]);
}
