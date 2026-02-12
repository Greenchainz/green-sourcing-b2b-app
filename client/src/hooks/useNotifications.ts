import { useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface NotificationMessage {
  id: number;
  title: string;
  content: string;
  type: string;
  createdAt: string;
}

export function useNotifications() {
  const utils = trpc.useUtils();

  const handleNewNotification = useCallback(
    (notification: NotificationMessage) => {
      // Show toast for new notification
      toast.info(notification.title, {
        description: notification.content,
        duration: 5000,
      });

      // Invalidate queries to refresh notification list and count
      utils.notifications.getAll.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
    [utils]
  );

  useEffect(() => {
    // Get WebPubSub connection info
    const connectWebPubSub = async () => {
      try {
        const endpoint = import.meta.env.VITE_FRONTEND_WEBPUBSUB_ENDPOINT;
        const hub = import.meta.env.VITE_FRONTEND_WEBPUBSUB_HUB;

        if (!endpoint || !hub) {
          console.warn("WebPubSub not configured");
          return;
        }

        // Create WebSocket connection
        const ws = new WebSocket(`${endpoint}/client/hubs/${hub}`);

        ws.onopen = () => {
          console.log("WebPubSub connected");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle notification message
            if (data.type === "notification" && data.data) {
              handleNewNotification(data.data);
            }
          } catch (error) {
            console.error("Failed to parse WebPubSub message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("WebPubSub error:", error);
        };

        ws.onclose = () => {
          console.log("WebPubSub disconnected");
          // Attempt to reconnect after 5 seconds
          setTimeout(connectWebPubSub, 5000);
        };

        return () => {
          ws.close();
        };
      } catch (error) {
        console.error("Failed to connect to WebPubSub:", error);
      }
    };

    connectWebPubSub();
  }, [handleNewNotification]);

  return {
    // Hook can be extended with additional notification methods
  };
}
