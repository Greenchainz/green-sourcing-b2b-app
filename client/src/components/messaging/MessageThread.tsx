import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface MessageThreadProps {
  conversationId: number;
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: messages, isLoading } = trpc.messaging.getMessages.useQuery(
    { conversationId },
    {
      refetchInterval: 3000, // Poll every 3 seconds for new messages
    }
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">No messages yet</h3>
        <p className="text-sm text-muted-foreground">
          Send a message to start the conversation
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {messages.map((message: any) => {
        const isOwnMessage = Number(message.senderId) === Number(user?.id);
        
        return (
          <div
            key={message.id}
            className={cn(
              "flex flex-col max-w-[70%]",
              isOwnMessage ? "self-end items-end" : "self-start items-start"
            )}
          >
            <div
              className={cn(
                "rounded-lg px-4 py-2",
                isOwnMessage
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1 px-1">
              <span className="text-xs text-muted-foreground">
                {message.senderName}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(message.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
