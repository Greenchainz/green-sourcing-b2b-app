import { useEffect, useState } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface IncomingCallData {
  callId: string;
  callerId: number;
  callerName: string;
  conversationId: number;
  timestamp: number;
}

interface IncomingCallNotificationProps {
  onAccept: (callData: IncomingCallData) => void;
}

export function IncomingCallNotification({ onAccept }: IncomingCallNotificationProps) {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const declineCallMutation = trpc.videoCalling.endWebRTCCall.useMutation();

  // Listen for incoming call events via WebSocket/polling
  // TODO: Replace with WebSocket subscription when available
  useEffect(() => {
    // This is a placeholder - in production, this would listen to WebSocket events
    // For now, we'll rely on the backend broadcasting via Web PubSub
    
    const handleIncomingCall = (event: CustomEvent<IncomingCallData>) => {
      const callData = event.detail;
      setIncomingCall(callData);

      // Auto-dismiss after 30 seconds
      const timeout = setTimeout(() => {
        handleDecline();
      }, 30000);
      setTimeoutId(timeout);
    };

    window.addEventListener("incoming-video-call" as any, handleIncomingCall);

    return () => {
      window.removeEventListener("incoming-video-call" as any, handleIncomingCall);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleAccept = () => {
    if (!incomingCall) return;

    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }

    toast.success("Call accepted");
    onAccept(incomingCall);
    setIncomingCall(null);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;

    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }

    try {
      await declineCallMutation.mutateAsync({
        callId: incomingCall.callId,
      });
      toast.info("Call declined");
    } catch (error) {
      console.error("Failed to decline call:", error);
    }

    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  const callerInitials = incomingCall.callerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={!!incomingCall} onOpenChange={(open) => !open && handleDecline()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Video className="h-6 w-6 text-green-600 animate-pulse" />
            Incoming Video Call
          </DialogTitle>
          <DialogDescription>
            {incomingCall.callerName} is calling you
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-6">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="text-2xl bg-green-100 text-green-700">
              {callerInitials}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <p className="text-xl font-semibold">{incomingCall.callerName}</p>
            <p className="text-sm text-muted-foreground">Video Call</p>
          </div>

          {/* Ringing animation */}
          <div className="flex gap-1">
            <div className="h-2 w-2 rounded-full bg-green-600 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-2 w-2 rounded-full bg-green-600 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-2 w-2 rounded-full bg-green-600 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-center">
          <Button
            variant="destructive"
            size="lg"
            onClick={handleDecline}
            className="flex-1"
          >
            <PhoneOff className="h-5 w-5 mr-2" />
            Decline
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={handleAccept}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Phone className="h-5 w-5 mr-2" />
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
