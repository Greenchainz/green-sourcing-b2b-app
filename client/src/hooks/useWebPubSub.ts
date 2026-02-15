import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to listen for WebPubSub notifications
 * Handles incoming video calls and other real-time events
 */
export function useWebPubSub() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // WebPubSub endpoint from environment
    const endpoint = import.meta.env.VITE_FRONTEND_WEBPUBSUB_ENDPOINT;
    const hub = import.meta.env.VITE_FRONTEND_WEBPUBSUB_HUB;

    if (!endpoint || !hub) {
      console.warn("[WebPubSub] Missing configuration");
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        // Connect to WebPubSub
        const wsUrl = `${endpoint}/client/hubs/${hub}?userId=${user.id}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
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
          } catch (error) {
            console.error("[WebPubSub] Failed to parse message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("[WebPubSub] Error:", error);
        };

        ws.onclose = () => {
          console.log("[WebPubSub] Disconnected");
          
          // Attempt to reconnect after 5 seconds
          reconnectTimeout = setTimeout(() => {
            console.log("[WebPubSub] Reconnecting...");
            connect();
          }, 5000);
        };
      } catch (error) {
        console.error("[WebPubSub] Connection failed:", error);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [user]);
}
