import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Minimize2, Send, Phone, Video, User, Bot, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useChatWidget } from "@/contexts/ChatWidgetContext";
import { SupplierSearchModal } from "@/components/SupplierSearchModal";

interface Message {
  id: number;
  senderId: number;
  senderType: "user" | "agent" | "support";
  agentType?: string | null;
  content: string;
  createdAt: Date;
  isRead: number;
}

interface Conversation {
  id: number;
  rfqId?: number | null;
  buyerId: number;
  supplierId: number;
  agentMode: "agent_first" | "human_only" | "hybrid";
  handoffStatus: "agent" | "pending_handoff" | "human";
  agentMessageCount: number;
  otherPartyName?: string;
  rfqTitle?: string;
}

export function UnifiedChatWidget() {
  const { user } = useAuth();
  const { isOpen, selectedConversationId, pendingConversation, openWidget, closeWidget, toggleWidget, selectConversation, clearPendingConversation } = useChatWidget();
  const [isMinimized, setIsMinimized] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [conversationFilter, setConversationFilter] = useState<"all" | "rfq" | "direct" | "agent" | "human">("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = trpc.messaging.getConversations.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const { data: messages, refetch: refetchMessages } = trpc.messaging.getMessages.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: !!selectedConversationId, refetchInterval: 3000 }
  );

  const { data: unreadCount } = trpc.messaging.getUnreadMessageCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 5000,
  });

  const sendMessageMutation = trpc.messaging.sendWithAgent.useMutation({
    onSuccess: () => {
      setMessageInput("");
      refetchMessages();
    },
  });

  const requestHumanMutation = trpc.messaging.sendWithAgent.useMutation({
    onSuccess: () => {
      refetchMessages();
    },
  });

  const markAsReadMutation = trpc.messaging.markConversationAsRead.useMutation();

  const createDirectConversationMutation = trpc.messaging.createDirectConversation.useMutation({
    onSuccess: (data: { conversationId: number }) => {
      selectConversation(data.conversationId);
      setShowNewConversationModal(false);
    },
  });

  const handleSelectSupplier = (supplierId: number, supplierName: string) => {
    createDirectConversationMutation.mutate({ supplierId });
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle pending conversation from context (when opened via external trigger)
  useEffect(() => {
    if (isOpen && pendingConversation && conversations) {
      // Find conversation matching the pending params
      const matchingConv = conversations.find((conv) => {
        if (pendingConversation.rfqId && conv.rfqId === pendingConversation.rfqId) {
          // Match by RFQ and either buyer or supplier
          if (pendingConversation.supplierId && conv.supplierId === pendingConversation.supplierId) {
            return true;
          }
          if (pendingConversation.buyerId && conv.buyerId === pendingConversation.buyerId) {
            return true;
          }
        }
        return false;
      });

      if (matchingConv) {
        selectConversation(matchingConv.id);
        clearPendingConversation();
      }
    }
  }, [isOpen, pendingConversation, conversations]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversationId && isOpen && !isMinimized) {
      markAsReadMutation.mutate({ conversationId: selectedConversationId });
    }
  }, [selectedConversationId, isOpen, isMinimized]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversationId) return;

    const context = selectedConversation?.rfqTitle
      ? `RFQ: ${selectedConversation.rfqTitle}`
      : selectedConversation?.otherPartyName
      ? `Conversation with ${selectedConversation.otherPartyName}`
      : undefined;

    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      content: messageInput.trim(),
      conversationContext: context,
    });
  };

  const handleRequestHuman = () => {
    if (!selectedConversationId) return;

    requestHumanMutation.mutate({
      conversationId: selectedConversationId,
      content: "I'd like to speak with a human representative.",
      conversationContext: selectedConversation?.rfqTitle || undefined,
    });
  };

  const getAgentBadge = (agentType?: string | null) => {
    if (!agentType) return null;

    const badges: Record<string, { label: string; color: string }> = {
      material: { label: "🔬 Material Expert", color: "bg-blue-500" },
      rfq: { label: "📋 RFQ Assistant", color: "bg-green-500" },
      supplier: { label: "🏭 Supplier Agent", color: "bg-purple-500" },
      triage: { label: "🤖 Otto", color: "bg-orange-500" },
    };

    const badge = badges[agentType] || { label: "🤖 AI Assistant", color: "bg-gray-500" };

    return (
      <Badge variant="secondary" className={`${badge.color} text-white text-xs`}>
        {badge.label}
      </Badge>
    );
  };

  const getSenderIcon = (msg: Message) => {
    if (msg.senderType === "agent") {
      return <Bot className="h-4 w-4" />;
    } else if (msg.senderType === "support") {
      return <User className="h-4 w-4 text-green-600" />;
    } else {
      return <User className="h-4 w-4" />;
    }
  };

  // Filter conversations based on selected filter
  const filteredConversations = conversations?.filter((conv) => {
    if (conversationFilter === "all") return true;
    if (conversationFilter === "rfq") return conv.rfqId !== null;
    if (conversationFilter === "direct") return conv.rfqId === null;
    if (conversationFilter === "agent") return conv.handoffStatus === "agent";
    if (conversationFilter === "human") return conv.handoffStatus === "human" || conv.handoffStatus === "pending_handoff";
    return true;
  });

  const selectedConversation = conversations?.find((c) => c.id === selectedConversationId);

  if (!user) return null;

  return (
    <>
      {/* Floating Chat Bubble */}
      {!isOpen && (
        <button
          onClick={openWidget}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 w-96 bg-background border border-border rounded-lg shadow-2xl z-50 flex flex-col transition-all duration-200 ${
            isMinimized ? "h-14" : "h-[600px]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-semibold">
                {selectedConversation
                  ? selectedConversation.otherPartyName || "Conversation"
                  : "Messages"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={closeWidget}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Conversation List or Message Thread */}
              {!selectedConversationId ? (
                <div className="flex-1 flex flex-col">
                  {/* New Conversation Button */}
                  <div className="p-4 pb-2 space-y-2">
                    <Button
                      onClick={() => setShowNewConversationModal(true)}
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Conversation
                    </Button>

                    {/* Filter Dropdown */}
                    <Select value={conversationFilter} onValueChange={(value: any) => setConversationFilter(value)}>
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue placeholder="Filter conversations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Conversations</SelectItem>
                        <SelectItem value="rfq">RFQ Only</SelectItem>
                        <SelectItem value="direct">Direct Only</SelectItem>
                        <SelectItem value="agent">AI Agent</SelectItem>
                        <SelectItem value="human">Human Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <ScrollArea className="flex-1 px-4 pb-4">
                    {filteredConversations && filteredConversations.length > 0 ? (
                    <div className="space-y-2">
                      {filteredConversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => selectConversation(conv.id)}
                          className="w-full p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{conv.otherPartyName || "Unknown"}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {conv.rfqId ? (
                                  <Badge variant="outline" className="text-xs">
                                    📋 RFQ: {conv.rfqTitle}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-blue-50">
                                    💬 Direct Inquiry
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {conv.handoffStatus === "agent" && (
                              <Badge variant="secondary" className="text-xs">
                                🤖 AI
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <MessageCircle className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">No conversations yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Click "New Conversation" to start chatting
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              ) : (
                <>
                  {/* Message Thread */}
                  <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="space-y-4">
                      {messages?.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${
                            msg.senderId === Number(user.id) ? "flex-row-reverse" : "flex-row"
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{getSenderIcon(msg)}</AvatarFallback>
                          </Avatar>
                          <div
                            className={`flex-1 max-w-[75%] ${
                              msg.senderId === Number(user.id) ? "items-end" : "items-start"
                            } flex flex-col gap-1`}
                          >
                            {msg.senderType === "agent" && getAgentBadge(msg.agentType)}
                            <div
                              className={`rounded-lg px-4 py-2 ${
                                msg.senderId === Number(user.id)
                                  ? "bg-green-500 text-white"
                                  : msg.senderType === "agent"
                                  ? "bg-blue-50 border border-blue-200"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || sendMessageMutation.isPending}
                        size="icon"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => selectConversation(null)}
                        className="text-xs"
                      >
                        ← Back to conversations
                      </Button>
                      {selectedConversation?.handoffStatus === "agent" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={handleRequestHuman}
                          disabled={requestHumanMutation.isPending}
                        >
                          👤 Request Human
                        </Button>
                      )}
                      {selectedConversation?.handoffStatus === "pending_handoff" && (
                        <span className="text-xs text-muted-foreground">
                          🟡 Waiting for human representative...
                        </span>
                      )}
                      {selectedConversation?.handoffStatus === "human" && (
                        <span className="text-xs text-green-600 font-medium">
                          ✓ Connected to human
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
      {/* Supplier Search Modal */}
      <SupplierSearchModal
        isOpen={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        onSelectSupplier={handleSelectSupplier}
      />
    </>
  );
}
