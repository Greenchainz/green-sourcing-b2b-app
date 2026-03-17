import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

interface ConversationListProps {
  selectedConversationId?: number;
  onSelectConversation: (conversationId: number) => void;
}

export function ConversationList({
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: conversations, isLoading } = trpc.messaging.getConversations.useQuery();
  
  const filteredConversations = conversations?.filter((conv: any) =>
    conv.otherPartyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.rfqTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">No conversations yet</h3>
        <p className="text-sm text-muted-foreground">
          Start a conversation by messaging a supplier from an RFQ
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No conversations match your search</p>
          </div>
        )}
        {filteredConversations.map((conversation: any) => (
        <button
          key={conversation.id}
          onClick={() => onSelectConversation(conversation.id)}
          className={cn(
            "flex flex-col p-4 border-b hover:bg-accent transition-colors text-left",
            selectedConversationId === conversation.id && "bg-accent"
          )}
        >
          <div className="flex items-start justify-between mb-1">
            <span className="font-semibold text-sm truncate flex-1">
              {conversation.otherPartyName || "Unknown User"}
            </span>
            {conversation.lastMessageAt && (
              <span className="text-xs text-muted-foreground ml-2">
                {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                  addSuffix: true,
                })}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            RFQ: {conversation.rfqTitle || "Untitled Project"}
          </div>
        </button>
      ))}
      </div>
    </div>
  );
}
