import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  User,

  ChevronDown,
  Minimize2,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";
import { usePaywallCheck } from "@/components/paywall/PaywallGate";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  agent?: string;
  toolsUsed?: string[];
  timestamp?: Date;
}

// Generate a session ID that persists for the browser session
function getSessionId(): string {
  let id = sessionStorage.getItem("chainbot-session");
  if (!id) {
    id = `cb-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem("chainbot-session", id);
  }
  return id;
}

const SUGGESTED_PROMPTS = [
  "What insulation has the lowest embodied carbon?",
  "Compare mineral wool vs fiberglass",
  "Help me build an RFQ for a LEED Gold project",
  "What does the CCPS score mean?",
];

export function ChainBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId] = useState(getSessionId);
  const [location] = useLocation();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // Parse page context from current URL
  const getPageContext = useCallback(() => {
    const ctx: {
      currentPage: string;
      materialId?: number;
      assemblyId?: number;
      cartItems?: number[];
    } = {
      currentPage: location,
    };

    // Extract material ID from /materials/:id
    const materialMatch = location.match(/\/materials\/(\d+)/);
    if (materialMatch) ctx.materialId = parseInt(materialMatch[1]);

    // Extract assembly ID from /assemblies/:id
    const assemblyMatch = location.match(/\/assemblies\/(\d+)/);
    if (assemblyMatch) ctx.assemblyId = parseInt(assemblyMatch[1]);

    // Get cart items from localStorage
    try {
      const cart = JSON.parse(localStorage.getItem("rfq-cart") || "[]");
      if (cart.length > 0) ctx.cartItems = cart;
    } catch {}

    return ctx;
  }, [location]);

  // Load conversation history on mount
  const { data: historyData } = trpc.agent.history.useQuery(
    { sessionId },
    { enabled: isOpen && messages.length === 0 }
  );

  useEffect(() => {
    if (historyData && historyData.length > 0 && messages.length === 0) {
      setMessages(
        historyData.map((h: any) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
          agent: h.agent,
          timestamp: new Date(h.createdAt),
        }))
      );
    }
  }, [historyData, messages.length]);

  // Chat mutation
  const chatMutation = trpc.agent.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.content,
          agent: data.agent,
          toolsUsed: data.toolsUsed,
          timestamp: new Date(),
        },
      ]);
      if (!isOpen || isMinimized) setHasNewMessage(true);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm having trouble processing that right now. Please try again in a moment.",
          agent: "system",
          timestamp: new Date(),
        },
      ]);
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLDivElement;
      if (viewport) {
        requestAnimationFrame(() => {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
        });
      }
    }
  }, [messages, chatMutation.isPending]);

  const { checkUsage, setShowUpgradeModal } = usePaywallCheck();

  const handleSend = async (content: string) => {
    if (!content.trim() || chatMutation.isPending) return;

    // Check AI query usage limit
    const allowed = await checkUsage("ai_queries");
    if (!allowed) {
      setShowUpgradeModal(true);
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    chatMutation.mutate({
      message: content.trim(),
      sessionId,
      context: getPageContext(),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const toggleOpen = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
      setHasNewMessage(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      setIsOpen(false);
    }
  };

  const agentLabel = (agent?: string) => {
    switch (agent) {
      case "materials":
        return "Material Intelligence";
      case "rfq":
        return "RFQ Assistant";
      case "compliance":
        return "Compliance Auditor";
      case "support":
        return "Support";
      default:
        return "ChainBot";
    }
  };

  const agentColor = (agent?: string) => {
    switch (agent) {
      case "materials":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "rfq":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "compliance":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "support":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const displayMessages = messages.filter((m) => m.role !== "system");

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-20 left-4 z-50 flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300",
            isMinimized ? "w-80 h-14" : "w-[420px] h-[600px] max-h-[80vh]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                <img src="/brand/greenchainz-icon.png" alt="ChainBot" className="w-5 h-5 object-contain" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">ChainBot</h3>
                {!isMinimized && (
                  <p className="text-xs text-emerald-100">
                    {user
                      ? `Hi ${user.name?.split(" ")[0] || "there"}`
                      : "AI Material Intelligence"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                {isMinimized ? (
                  <ChevronDown className="w-4 h-4 rotate-180" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          {!isMinimized && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-hidden">
                {displayMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
                      <Sparkles className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Welcome to ChainBot
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                      Your AI-powered sustainable materials advisor. Ask me
                      about materials, assemblies, carbon data, or help with
                      your RFQ.
                    </p>
                    <div className="grid grid-cols-1 gap-2 w-full">
                      {SUGGESTED_PROMPTS.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(prompt)}
                          disabled={chatMutation.isPending}
                          className="text-left px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="flex flex-col gap-3 p-4">
                      {displayMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex gap-2.5",
                            msg.role === "user"
                              ? "justify-end"
                              : "justify-start"
                          )}
                        >
                          {msg.role === "assistant" && (
                            <div className="w-7 h-7 shrink-0 mt-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center overflow-hidden">
                              <img src="/brand/greenchainz-icon.png" alt="ChainBot" className="w-4 h-4 object-contain" />
                            </div>
                          )}

                          <div className="flex flex-col max-w-[80%]">
                            {msg.role === "assistant" && msg.agent && (
                              <span
                                className={cn(
                                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full w-fit mb-1",
                                  agentColor(msg.agent)
                                )}
                              >
                                {agentLabel(msg.agent)}
                              </span>
                            )}
                            <div
                              className={cn(
                                "rounded-2xl px-3.5 py-2.5 text-sm",
                                msg.role === "user"
                                  ? "bg-emerald-600 text-white rounded-br-md"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md"
                              )}
                            >
                              {msg.role === "assistant" ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_table]:text-xs [&_th]:px-2 [&_td]:px-2">
                                  <Streamdown>{msg.content}</Streamdown>
                                </div>
                              ) : (
                                <p className="whitespace-pre-wrap">
                                  {msg.content}
                                </p>
                              )}
                            </div>
                          </div>

                          {msg.role === "user" && (
                            <div className="w-7 h-7 shrink-0 mt-0.5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                            </div>
                          )}
                        </div>
                      ))}

                      {chatMutation.isPending && (
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center overflow-hidden">
                            <img src="/brand/greenchainz-icon.png" alt="ChainBot" className="w-4 h-4 object-contain" />
                          </div>
                          <div className="rounded-2xl rounded-bl-md bg-gray-100 dark:bg-gray-800 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Analyzing materials data...
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Input */}
              <form
                onSubmit={handleSubmit}
                className="flex items-end gap-2 p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about materials, assemblies, or RFQs..."
                  className="flex-1 max-h-24 resize-none min-h-[38px] text-sm rounded-xl border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500/20"
                  rows={1}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || chatMutation.isPending}
                  className="shrink-0 h-[38px] w-[38px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={toggleOpen}
        className={cn(
          "fixed bottom-4 left-4 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110",
          isOpen
            ? "bg-gray-700 hover:bg-gray-800 shadow-lg"
            : "bg-[#9FE870] hover:bg-[#8DD85F] shadow-[0_0_20px_rgba(159,232,112,0.6)] hover:shadow-[0_0_30px_rgba(159,232,112,0.8)] animate-pulse"
        )}
        style={!isOpen ? {
          boxShadow: '0 0 20px rgba(159, 232, 112, 0.6), 0 0 40px rgba(159, 232, 112, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.2)'
        } : undefined}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <>
            <img src="/brand/greenchainz-icon.png" alt="ChainBot" className="w-7 h-7 object-contain" />
            {hasNewMessage && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
            )}
          </>
        )}
      </button>
    </>
  );
}
