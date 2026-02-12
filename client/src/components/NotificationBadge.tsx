import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface NotificationBadgeProps {
  onClick: () => void;
}

export function NotificationBadge({ onClick }: NotificationBadgeProps) {
  const { data: unreadCount = 0 } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={onClick}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );
}
