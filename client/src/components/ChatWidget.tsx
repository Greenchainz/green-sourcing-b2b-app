import { useEffect, useState, useRef } from "react";
import { MessageCircle, X, ArrowLeft, Send } from "lucide-react";
import { useChatWidget } from "@/contexts/ChatWidgetContext";
import { useAuth } from "@/contexts/AuthContext";

type Conversation = {
  id: number;
  other_party_name: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
};

type Message = {
  id: number;
  sender_id: string;
  content: string;
  created_at: string;
};

export function ChatWidget() {
  const {
    isOpen,
    selectedConversationId,
    pendingConversation,
    toggleWidget,
    closeWidget,
    selectConversation,
    clearPendingConversation,
  } = useChatWidget();

  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputContent, setInputContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (selectedConversationId) {
      scrollToBottom();
    }
  }, [messages, selectedConversationId]);

  // Handle pending conversation mapping
  useEffect(() => {
    async function handlePending() {
      if (isOpen && pendingConversation?.rfqId && pendingConversation?.supplierId) {
        try {
          const res = await fetch("/api/conversations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              rfq_id: pendingConversation.rfqId,
              supplier_id: pendingConversation.supplierId,
            }),
            credentials: "include",
          });
          const data = await res.json();
          if (data.success && data.data) {
            selectConversation(data.data.id);
            clearPendingConversation();
          }
        } catch (error) {
          console.error("Failed to handle pending conversation:", error);
        }
      }
    }
    handlePending();
  }, [isOpen, pendingConversation, selectConversation, clearPendingConversation]);

  // Fetch conversations when list is visible
  useEffect(() => {
    let active = true;

    async function fetchConversations() {
      try {
        const res = await fetch("/api/conversations", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && active) {
          setConversations(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch conversations", error);
      }
    }

    if (isOpen && selectedConversationId === null) {
      fetchConversations();
    }

    return () => {
      active = false;
    };
  }, [isOpen, selectedConversationId]);

  // Fetch messages when a conversation is selected (with polling)
  useEffect(() => {
    if (!isOpen || selectedConversationId === null) return;

    let active = true;

    async function fetchMessages() {
      try {
        const res = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && active) {
          setMessages(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch messages", error);
      }
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isOpen, selectedConversationId]);

  const sendMessage = async () => {
    if (!inputContent.trim() || !selectedConversationId) return;

    const content = inputContent;
    setInputContent("");

    try {
      const res = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMessages((prev) => [...prev, data.data]);
      }
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggleWidget}
        className="fixed bottom-4 right-4 z-50 flex items-center justify-center w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-xl transition-transform hover:scale-105"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-[520px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-green-600 text-white">
        <div className="flex items-center gap-2">
          {selectedConversationId && (
            <button
              onClick={() => selectConversation(null)}
              className="p-1 hover:bg-green-700 rounded-full transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <span className="font-semibold text-sm">Messages</span>
        </div>
        <button
          onClick={closeWidget}
          className="p-1 hover:bg-green-700 rounded-full transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConversationId === null ? (
          // Conversation List
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageCircle size={48} className="mb-2 opacity-20" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {conversations.map((conv) => (
                  <li key={conv.id}>
                    <button
                      onClick={() => selectConversation(conv.id)}
                      className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex flex-col gap-1"
                    >
                      <div className="flex justify-between items-baseline w-full">
                        <span className="font-medium text-gray-900 truncate pr-2">
                          {conv.other_party_name || "Unknown"}
                        </span>
                        {conv.last_message_at && (
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {new Date(conv.last_message_at).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center w-full">
                        <span className="text-sm text-gray-500 truncate pr-2">
                          {conv.last_message || "No messages yet"}
                        </span>
                        {conv.unread_count > 0 && (
                          <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          // Thread View
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  No messages yet.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          isMine
                            ? "bg-green-600 text-white rounded-tr-sm"
                            : "bg-gray-200 text-gray-900 rounded-tl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
              <textarea
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 min-h-[40px] max-h-[100px]"
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={!inputContent.trim()}
                className="p-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-colors flex-shrink-0"
              >
                <Send size={18} className="ml-0.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
