import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MessageInputProps {
  conversationId: number;
  onMessageSent?: () => void;
}

export function MessageInput({ conversationId, onMessageSent }: MessageInputProps) {
  const [content, setContent] = useState("");
  const utils = trpc.useUtils();

  const sendMessageMutation = trpc.messaging.send.useMutation({
    onSuccess: () => {
      setContent("");
      utils.messaging.getMessages.invalidate({ conversationId });
      utils.messaging.getConversations.invalidate();
      onMessageSent?.();
      toast.success("Message sent");
    },
    onError: (error) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    sendMessageMutation.mutate({
      conversationId,
      content: content.trim(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 p-4 border-t">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
        className="min-h-[60px] max-h-[120px] resize-none"
        disabled={sendMessageMutation.isPending}
      />
      <Button
        type="submit"
        size="icon"
        disabled={!content.trim() || sendMessageMutation.isPending}
        className="shrink-0"
      >
        {sendMessageMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
}
