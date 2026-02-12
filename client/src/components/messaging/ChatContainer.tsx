import { useState } from "react";
import { ConversationList } from "./ConversationList";
import { MessageThread } from "./MessageThread";
import { MessageInput } from "./MessageInput";
import { MessageCircle } from "lucide-react";

export function ChatContainer() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | undefined>();

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Conversation List Sidebar */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </h2>
        </div>
        <ConversationList
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
        />
      </div>

      {/* Message Thread and Input */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <>
            <div className="flex-1 overflow-hidden">
              <MessageThread conversationId={selectedConversationId} />
            </div>
            <MessageInput conversationId={selectedConversationId} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-center px-4">
            <div>
              <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-xl mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
