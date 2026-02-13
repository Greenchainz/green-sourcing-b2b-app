import { createContext, useContext, useState, ReactNode } from "react";

interface ChatWidgetContextType {
  isOpen: boolean;
  selectedConversationId: number | null;
  pendingConversation: { rfqId?: number; supplierId?: number; buyerId?: number } | null;
  openWidget: () => void;
  closeWidget: () => void;
  toggleWidget: () => void;
  openWithConversation: (params: { rfqId?: number; supplierId?: number; buyerId?: number }) => void;
  selectConversation: (conversationId: number | null) => void;
  clearPendingConversation: () => void;
}

const ChatWidgetContext = createContext<ChatWidgetContextType | undefined>(undefined);

export function ChatWidgetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [pendingConversation, setPendingConversation] = useState<{ rfqId?: number; supplierId?: number; buyerId?: number } | null>(null);

  const openWidget = () => setIsOpen(true);
  const closeWidget = () => setIsOpen(false);
  const toggleWidget = () => setIsOpen((prev) => !prev);

  const openWithConversation = (params: { rfqId?: number; supplierId?: number; buyerId?: number }) => {
    // Store the conversation params for the widget to process
    setPendingConversation(params);
    setIsOpen(true);
  };

  const selectConversation = (conversationId: number | null) => {
    setSelectedConversationId(conversationId);
  };

  const clearPendingConversation = () => setPendingConversation(null);

  const value = {
    isOpen,
    selectedConversationId,
    pendingConversation,
    openWidget,
    closeWidget,
    toggleWidget,
    openWithConversation,
    selectConversation,
    clearPendingConversation,
  };

  return <ChatWidgetContext.Provider value={value}>{children}</ChatWidgetContext.Provider>;
}

export function useChatWidget() {
  const context = useContext(ChatWidgetContext);
  if (context === undefined) {
    throw new Error("useChatWidget must be used within a ChatWidgetProvider");
  }
  return context;
}

// Export pending conversation state separately for widget to consume
export function usePendingConversation() {
  const context = useContext(ChatWidgetContext);
  if (context === undefined) {
    throw new Error("usePendingConversation must be used within a ChatWidgetProvider");
  }
  // This is a hack to expose internal state - in production, refactor to proper state management
  return (context as any).pendingConversation;
}
