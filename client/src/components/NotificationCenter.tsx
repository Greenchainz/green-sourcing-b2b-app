import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NotificationBadge } from "./NotificationBadge";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: notifications = [], isLoading } = trpc.notifications.getAll.useQuery(
    undefined,
    {
      enabled: open, // Only fetch when popover is open
    }
  );

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getAll.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getAll.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate({ notificationId });
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div>
          <NotificationBadge onClick={() => setOpen(!open)} />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h3 className="font-semibold">Notifications</h3>
          </div>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              className="h-auto p-1 text-xs"
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="mb-2 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="mt-1 text-xs text-muted-foreground">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group relative px-4 py-3 transition-colors hover:bg-accent ${
                    !notification.isRead ? "bg-accent/50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {notification.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => handleMarkAsRead(notification.id)}
                        disabled={markAsReadMutation.isPending}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {!notification.isRead && (
                    <div className="absolute right-2 top-3 h-2 w-2 rounded-full bg-blue-600" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
