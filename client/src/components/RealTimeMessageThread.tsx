import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: number;
  threadId: number;
  senderId: number;
  senderType: "buyer" | "supplier";
  content: string;
  createdAt: Date;
  isRead: number;
}

interface RealTimeMessageThreadProps {
  threadId: number;
  isBuyer: boolean;
  currentUserId: number;
}

export function RealTimeMessageThread({
  threadId,
  isBuyer,
  currentUserId,
}: RealTimeMessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Using sonner toast

  // tRPC mutations and queries
  const { data: accessTokenData } = trpc.messaging.getAccessToken.useQuery(
    { threadId },
    { refetchOnWindowFocus: false }
  );

  const { data: messageHistory, refetch: refetchMessages } =
    trpc.messaging.getThreadMessages.useQuery(
      { threadId, limit: 50, offset: 0 },
      { refetchOnWindowFocus: false }
    );

  const sendMessageMutation = trpc.messaging.sendMessage.useMutation();
  const markAsReadMutation = trpc.messaging.markAsRead.useMutation();
  const broadcastTypingMutation = trpc.messaging.broadcastTyping.useMutation();

  // Initialize messages from history
  useEffect(() => {
    if (messageHistory) {
      setMessages(
        messageHistory.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }))
      );
    }
  }, [messageHistory]);

  // WebSocket connection with reconnection logic
  useEffect(() => {
    if (!accessTokenData) return;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(
          `${accessTokenData.url}?access_token=${accessTokenData.token}`
        );

        ws.onopen = () => {
          console.log("WebSocket connected");
          setIsConnected(true);
          setIsReconnecting(false);
          reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "message":
              // New message received
              const newMsg: Message = {
                id: Date.now(), // Temporary ID until we get real one
                threadId: data.threadId,
                senderId: data.senderId,
                senderType: data.senderType,
                content: data.content,
                createdAt: new Date(data.timestamp),
                isRead: 0,
              };
              setMessages((prev) => [...prev, newMsg]);

              // Mark as read if not from current user
              if (data.senderId !== currentUserId) {
                // Auto-mark as read after a short delay
                setTimeout(() => {
                  markAsReadMutation.mutate({ messageId: newMsg.id });
                }, 1000);
              }
              break;

            case "message_sent":
              // Confirmation that our message was sent
              console.log("Message sent confirmation:", data);
              break;

            case "typing":
              // Someone is typing
              if (data.userId !== currentUserId) {
                setIsTyping(true);
                // Clear typing indicator after 3 seconds
                setTimeout(() => setIsTyping(false), 3000);
              }
              break;

            case "thread_closed":
              // Thread has been closed
              toast.info(data.reason || "This conversation has been closed.");
              break;

            default:
              console.log("Unknown message type:", data.type);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log("WebSocket disconnected");
          setIsConnected(false);

          // Attempt to reconnect with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            setIsReconnecting(true);
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            reconnectAttemptsRef.current++;

            setTimeout(() => {
              console.log(
                `Reconnecting... Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`
              );
              connectWebSocket();
            }, delay);
          } else {
            toast.error("Unable to reconnect. Please refresh the page.");
          }
        };

        wsRef.current = ws;
      } catch (error) {
        console.error("Error connecting WebSocket:", error);
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [accessTokenData, currentUserId, toast, markAsReadMutation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle typing indicator
  const handleTyping = () => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Broadcast typing indicator
    broadcastTypingMutation.mutate({ threadId, isBuyer });

    // Set timeout to stop typing indicator after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      // Typing stopped
    }, 3000);
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const result = await sendMessageMutation.mutateAsync({
        threadId,
        message: newMessage.trim(),
        isBuyer,
      });

      // Add message to local state immediately (optimistic update)
      const optimisticMessage: Message = {
        id: result.messageId || Date.now(),
        threadId,
        senderId: currentUserId,
        senderType: isBuyer ? "buyer" : "supplier",
        content: newMessage.trim(),
        createdAt: new Date(),
        isRead: 0,
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setNewMessage("");

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-[600px] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">
            {isBuyer ? "Supplier" : "Buyer"} Conversation
          </h3>
          <p className="text-sm text-muted-foreground">Thread #{threadId}</p>
        </div>
        <div className="flex items-center gap-2">
          {isReconnecting && (
            <span className="text-sm text-yellow-600 flex items-center gap-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              Reconnecting...
            </span>
          )}
          {isConnected && !isReconnecting && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <span className="h-2 w-2 bg-green-600 rounded-full animate-pulse" />
              Connected
            </span>
          )}
          {!isConnected && !isReconnecting && (
            <span className="text-sm text-red-600 flex items-center gap-1">
              <span className="h-2 w-2 bg-red-600 rounded-full" />
              Disconnected
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </div>
        )}

        {messages.map((msg) => {
          const isOwnMessage = msg.senderId === currentUserId;

          return (
            <div
              key={msg.id}
              className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  isOwnMessage
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <p className="text-sm break-words">{msg.content}</p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-xs opacity-70">
                    {msg.createdAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isOwnMessage && (
                    <span className="text-xs opacity-70">
                      {msg.isRead ? "Read" : "Sent"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" />
                <span
                  className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
                <span
                  className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (max 1000 characters)"
            maxLength={1000}
            disabled={!isConnected || sendMessageMutation.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={
              !newMessage.trim() || !isConnected || sendMessageMutation.isPending
            }
            size="icon"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {newMessage.length}/1000 characters
        </p>
      </div>
    </Card>
  );
}
