import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Minimize2, Send, Phone, Video, User, Bot, Plus, Paperclip, FileText, Image as ImageIcon, X as XIcon, Smile, Pin, Archive } from "lucide-react";
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
import { CallModal } from "@/components/CallModal";
import { getRelativeTime } from "@/lib/timeUtils";

interface Message {
  id: number;
  senderId: number;
  senderType: "user" | "agent" | "support";
  agentType?: string | null;
  content: string;
  createdAt: Date;
  isRead: number;
  readAt?: Date | null;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
}

interface Conversation {
  id: number;
  rfqId?: number | null;
  buyerId: number;
  supplierId: number;
  agentMode: "agent_first" | "human_only" | "hybrid";
  isPinned: number;
  isArchived: number;
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
  const [conversationSort, setConversationSort] = useState<"newest" | "oldest" | "unread">("newest");
  const [showCallModal, setShowCallModal] = useState(false);
  const [activeCallType, setActiveCallType] = useState<"voice" | "video" | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  // Check call limits
  const { data: callLimit } = trpc.messaging.checkCallLimit.useQuery(undefined, {
    enabled: !!user,
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations, refetch: refetchConversations } = trpc.messaging.getConversations.useQuery(undefined, {
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

  const sendMessageWithAttachmentMutation = trpc.messaging.sendMessageWithAttachment.useMutation({
    onSuccess: () => {
      setMessageInput("");
      setSelectedFile(null);
      setUploadingFile(false);
      refetchMessages();
    },
  });

  const addReactionMutation = trpc.messaging.addReaction.useMutation({
    onSuccess: () => {
      refetchMessages();
      setShowReactionPicker(null);
    },
  });

  const pinConversationMutation = trpc.messaging.pinConversation.useMutation({
    onSuccess: () => {
      refetchConversations();
    },
  });

  const archiveConversationMutation = trpc.messaging.archiveConversation.useMutation({
    onSuccess: () => {
      refetchConversations();
      selectConversation(null);
    },
  });

  const handlePinConversation = (conversationId: number, pinned: boolean) => {
    pinConversationMutation.mutate({ conversationId, pinned });
  };

  const handleArchiveConversation = (conversationId: number, archived: boolean) => {
    archiveConversationMutation.mutate({ conversationId, archived });
  };

  const initiateCallMutation = trpc.messaging.initiateCall.useMutation({
    onSuccess: (data) => {
      setActiveCallType(data.session.callType);
      setActiveCallId(data.callId);
      setShowCallModal(true);
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const handleInitiateCall = (callType: "voice" | "video") => {
    if (!selectedConversation) return;
    
    const receiverId = selectedConversation.buyerId === Number(user?.id) 
      ? selectedConversation.supplierId 
      : selectedConversation.buyerId;

    initiateCallMutation.mutate({
      conversationId: selectedConversation.id,
      receiverId,
      callType,
    });
  };

  const handleAddReaction = (messageId: number, reactionType: "thumbs_up" | "thumbs_down" | "heart" | "party" | "check") => {
    addReactionMutation.mutate({ messageId, reactionType });
  };

  const reactionEmojis = {
    thumbs_up: "👍",
    thumbs_down: "👎",
    heart: "❤️",
    party: "🎉",
    check: "✅",
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendWithAttachment = async () => {
    if (!selectedConversationId || !selectedFile) return;

    setUploadingFile(true);
    try {
      // Upload file to S3
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error("Upload failed");
      
      const { url } = await uploadResponse.json();

      // Send message with attachment
      await sendMessageWithAttachmentMutation.mutateAsync({
        conversationId: selectedConversationId,
        content: messageInput || "Sent an attachment",
        attachmentUrl: url,
        attachmentType: selectedFile.type.startsWith("image/") ? "image" : "document",
        attachmentName: selectedFile.name,
      });
    } catch (error) {
      console.error("File upload error:", error);
      alert("Failed to upload file");
      setUploadingFile(false);
    }
  };

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
    if (selectedFile) {
      handleSendWithAttachment();
      return;
    }

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

  // Filter and sort conversations
  const filteredConversations = conversations
    ?.filter((conv) => {
      if (conversationFilter === "all") return true;
      if (conversationFilter === "rfq") return conv.rfqId !== null;
      if (conversationFilter === "direct") return conv.rfqId === null;
      if (conversationFilter === "agent") return conv.handoffStatus === "agent";
      if (conversationFilter === "human") return conv.handoffStatus === "human" || conv.handoffStatus === "pending_handoff";
      return true;
    })
    .sort((a, b) => {
      // Pinned conversations always first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // Then sort by selected option
      if (conversationSort === "newest") {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      } else if (conversationSort === "oldest") {
        return new Date(a.lastMessageAt).getTime() - new Date(b.lastMessageAt).getTime();
      } else if (conversationSort === "unread") {
        // Unread first (assuming we'll add unread count later)
        return 0; // For now, no unread sorting
      }
      return 0;
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
              {selectedConversation && (
                <>
                  {/* Voice Call Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={() => handleInitiateCall("voice")}
                    title={callLimit?.allowed ? `Voice call (${callLimit.remainingMinutes !== null ? `${callLimit.remainingMinutes} min remaining` : "unlimited"})` : "Upgrade to make calls"}
                    disabled={!callLimit?.allowed}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  {/* Video Call Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={() => handleInitiateCall("video")}
                    title={callLimit?.allowed ? `Video call (${callLimit.remainingMinutes !== null ? `${callLimit.remainingMinutes} min remaining` : "unlimited"})` : "Upgrade to make calls"}
                    disabled={!callLimit?.allowed}
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={() => handlePinConversation(selectedConversation.id, !selectedConversation.isPinned)}
                    title={selectedConversation.isPinned ? "Unpin conversation" : "Pin conversation"}
                  >
                    <Pin className={`h-4 w-4 ${selectedConversation.isPinned ? "fill-white" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={() => handleArchiveConversation(selectedConversation.id, true)}
                    title="Archive conversation"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </>
              )}
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

                    {/* Filter & Sort Dropdowns */}
                    <div className="flex gap-2">
                      <Select value={conversationFilter} onValueChange={(value: any) => setConversationFilter(value)}>
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="rfq">RFQ</SelectItem>
                          <SelectItem value="direct">Direct</SelectItem>
                          <SelectItem value="agent">AI</SelectItem>
                          <SelectItem value="human">Human</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={conversationSort} onValueChange={(value: any) => setConversationSort(value)}>
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest</SelectItem>
                          <SelectItem value="oldest">Oldest</SelectItem>
                          <SelectItem value="unread">Unread</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-sm">{conv.otherPartyName || "Unknown"}</p>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {getRelativeTime(conv.lastMessageAt)}
                                </span>
                              </div>
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
                                {conv.handoffStatus === "agent" && (
                                  <Badge variant="secondary" className="text-xs">
                                    🤖 AI
                                  </Badge>
                                )}
                              </div>
                              {conv.lastMessage && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {conv.lastMessage}
                                </p>
                              )}
                            </div>
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
                          className={`flex gap-3 group ${msg.senderId === Number(user.id) ? "flex-row-reverse" : ""}`}
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
                              {msg.attachmentUrl && (
                                <div className="mb-2">
                                  {msg.attachmentType === "image" ? (
                                    <img
                                      src={msg.attachmentUrl}
                                      alt={msg.attachmentName || "Attachment"}
                                      className="max-w-full rounded-lg max-h-64 object-contain"
                                    />
                                  ) : (
                                    <a
                                      href={msg.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 p-2 bg-white/10 rounded hover:bg-white/20 transition-colors"
                                    >
                                      <FileText className="h-4 w-4" />
                                      <span className="text-xs">{msg.attachmentName || "Download"}</span>
                                    </a>
                                  )}
                                </div>
                              )}
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {msg.senderId === Number(user.id) && (
                                <span className="text-xs text-muted-foreground">
                                  {msg.isRead ? (
                                    <span className="text-blue-500" title={msg.readAt ? `Seen ${new Date(msg.readAt).toLocaleString()}` : "Seen"}>
                                      ✓✓
                                    </span>
                                  ) : (
                                    <span title="Sent">✓</span>
                                  )}
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                              >
                                <Smile className="h-3 w-3" />
                              </Button>
                            </div>
                            {/* Reaction Picker */}
                            {showReactionPicker === msg.id && (
                              <div className="flex gap-1 mt-1 p-1 bg-white border rounded-lg shadow-lg">
                                {Object.entries(reactionEmojis).map(([type, emoji]) => (
                                  <button
                                    key={type}
                                    onClick={() => handleAddReaction(msg.id, type as any)}
                                    className="hover:bg-accent rounded p-1 text-lg"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t">
                    {/* File Preview */}
                    {selectedFile && (
                      <div className="mb-2 p-2 bg-accent rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {selectedFile.type.startsWith("image/") ? (
                            <ImageIcon className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="text-xs truncate max-w-[200px]">{selectedFile.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(selectedFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={handleRemoveFile}
                        >
                          <XIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
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
                        disabled={uploadingFile}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={(!messageInput.trim() && !selectedFile) || uploadingFile}
                        size="icon"
                      >
                        {uploadingFile ? (
                          <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
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

      {/* Call Modal */}
      {showCallModal && activeCallType && selectedConversation && (
        <CallModal
          isOpen={showCallModal}
          onClose={() => {
            setShowCallModal(false);
            setActiveCallType(null);
          }}
          callType={activeCallType}
          callId={activeCallId || ""}
          otherPartyName={selectedConversation.otherPartyName || "Unknown"}
          isOutgoing={true}
        />
      )}
    </>
  );
}
