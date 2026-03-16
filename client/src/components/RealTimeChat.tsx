import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface Message {
  id: number;
  senderId: number;
  senderType: "buyer" | "supplier";
  content: string;
  createdAt: Date;
  isRead: number | null;
}

interface RealTimeChatProps {
  threadId: number;
  isBuyer: boolean;
  recipientName: string;
}

export function RealTimeChat({ threadId, isBuyer, recipientName }: RealTimeChatProps) {
  const auth = useAuth({});
  const user = auth.user;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [recipientIsTyping, setRecipientIsTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getAccessTokenMutation = trpc.rfqMarketplace.getWebSocketToken.useMutation();
  const sendMessageMutation = trpc.rfqMarketplace.sendMessage.useMutation();
  const getMessagesMutation = trpc.rfqMarketplace.getThreadMessages.useQuery({ threadId, limit: 50, offset: 0 });
  const markReadMutation = trpc.rfqMarketplace.markMessageAsRead.useMutation();

  // Initialize WebSocket connection
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        if (!user) return;

        // Get access token
        const token = await getAccessTokenMutation.mutateAsync({
          threadId,
        });

        // Connect to Web PubSub
        const hubName = import.meta.env.VITE_WEBPUBSUB_HUB || "chat";
        const ws = new WebSocket(
          `${token.url}/client/hubs/${hubName}?access_token=${token.token}`
        );

        ws.onopen = () => {
          console.log("WebSocket connected");
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "message":
              setMessages((prev) => [
                ...prev,
                {
                  id: data.messageId || Date.now(),
                  senderId: data.senderId,
                  senderType: data.senderType,
                  content: data.content,
                  createdAt: new Date(data.timestamp),
                  isRead: 0,
                },
              ]);
              // Mark as read
              if (data.messageId) {
                markReadMutation.mutate({ messageId: data.messageId });
              }
              break;

            case "typing":
              setRecipientIsTyping(true);
              setTimeout(() => setRecipientIsTyping(false), 3000);
              break;

            case "thread_closed":
              console.log("Thread closed:", data.reason);
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
        };

        wsRef.current = ws;

        // Load message history
        if (getMessagesMutation.data) {
          setMessages(getMessagesMutation.data);
        }
      } catch (error) {
        console.error("Failed to initialize connection:", error);
      }
    };

    initializeConnection();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [threadId, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleTyping = () => {
    if (!isTyping && wsRef.current && isConnected) {
      setIsTyping(true);
      wsRef.current.send(
        JSON.stringify({
          type: "typing",
          threadId,
        })
      );

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || !user || isSending) return;

    setIsSending(true);
    try {
      await sendMessageMutation.mutateAsync({
        threadId,
        message: input,
        isBuyer,
      });

      // Add message to local state optimistically
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          senderId: user!.id,
          senderType: isBuyer ? "buyer" : "supplier",
          content: input,
          createdAt: new Date(),
          isRead: 1,
        },
      ]);

      setInput("");
      setIsTyping(false);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="flex flex-col h-[500px] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">{recipientName}</h3>
          <p className="text-xs text-gray-500">
            {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.senderId === user?.id
                    ? "bg-green-500 text-white rounded-br-none"
                    : "bg-gray-200 text-gray-900 rounded-bl-none"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {recipientIsTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg rounded-bl-none">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleTyping();
            }}
            placeholder="Keep it brief... (max 1000 chars)"
            maxLength={1000}
            disabled={!isConnected || isSending}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!isConnected || isSending || !input.trim()}
            size="icon"
            className="bg-green-600 hover:bg-green-700"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {input.length}/1000 characters
        </p>
      </form>
    </Card>
  );
}
