"use client";
import { useState, useEffect, useRef } from "react";
import { Send, ArrowLeft } from "lucide-react";

interface Conversation {
  id: string;
  rfq_id: string;
  project_name: string;
  other_party_name: string;
  other_party_type: "buyer" | "supplier";
  unread_count: number;
  last_message: string;
  last_message_at: string;
}

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  read: boolean;
  created_at: string;
}

export default function MessagingUI() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations");
      const data = await response.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.data);
        scrollToBottom();
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || sending) return;

    try {
      setSending(true);
      const response = await fetch(
        `/api/conversations/${selectedConversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newMessage }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.data]);
        setNewMessage("");
        scrollToBottom();
        fetchConversations(); // Refresh conversation list
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  return (
    <div className="flex h-[600px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Conversations List */}
      <div
        className={`w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 bg-[#111111] dark:bg-gray-900 ${
          selectedConversation ? "hidden md:block" : ""
        }`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Messages
          </h2>
        </div>

        <div className="overflow-y-auto h-[calc(100%-60px)]">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  selectedConversation?.id === conv.id
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {conv.other_party_name}
                      </h3>
                      {conv.unread_count > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      RFQ: {conv.project_name}
                    </p>
                    {conv.last_message && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                        {conv.last_message}
                      </p>
                    )}
                  </div>
                  {conv.last_message_at && (
                    <span className="text-xs text-gray-500 dark:text-gray-500 ml-2">
                      {formatTime(conv.last_message_at)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Thread */}
      <div
        className={`flex-1 bg-gray-50 dark:bg-gray-800 flex flex-col ${
          !selectedConversation ? "hidden md:flex" : ""
        }`}
      >
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-[#111111] dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <button
                onClick={() => setSelectedConversation(null)}
                className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedConversation.other_party_name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  RFQ: {selectedConversation.project_name}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="text-center text-gray-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === "default-user-id"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        message.sender_id === "default-user-id"
                          ? "bg-blue-600 text-white"
                          : "bg-[#111111] dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.sender_id === "default-user-id"
                            ? "text-blue-100"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-[#111111] dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
