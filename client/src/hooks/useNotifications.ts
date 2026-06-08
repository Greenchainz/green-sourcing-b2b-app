import { useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationMessage {
  id: number;
  title: string;
  content: string;
  type: string;
  createdAt: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNewNotification = useCallback(
    (notification: NotificationMessage) => {
      // Show toast for new notification
      toast.info(notification.title, {
        description: notification.content,
        duration: 5000,
      });

      // Invalidate queries to refresh notification list and count
      utils.notifications.getUnread.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
    [utils]
  );

  const { data: tokenData } = trpc.messaging.getNotificationToken.useQuery(undefined, {
    enabled: !!user,
    staleTime: 50 * 60 * 1_000,
    retry: false,
  });

  useEffect(() => {
    if (!user) return;
    const wsUrl = tokenData?.url;
    if (!wsUrl) return;

    const connectWebPubSub = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (!data || typeof data !== "object") return;

            // Some sends are direct payloads; others may wrap under { type: "notification", data: {...} }.
            if (data.type === "notification" && data.data) {
              handleNewNotification(data.data as NotificationMessage);
              return;
            }

            if ("title" in data && "content" in data && "type" in data) {
              handleNewNotification(data as NotificationMessage);
            }
          } catch (error) {
            console.error("Failed to parse WebPubSub message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("WebPubSub error:", error);
        };

        ws.onclose = () => {
          reconnectTimeoutRef.current = setTimeout(connectWebPubSub, 5000);
        };
      } catch (error) {
        console.error("Failed to connect to WebPubSub:", error);
      }
    };

    connectWebPubSub();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [user, tokenData?.url, handleNewNotification]);

  return {
    // Hook can be extended with additional notification methods
  };
}
