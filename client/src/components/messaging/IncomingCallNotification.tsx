import { useCallback, useEffect, useState } from "react";
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

export type { IncomingCallData };

interface IncomingCallNotificationProps {
  onAccept: (callData: IncomingCallData) => void;
}

export function IncomingCallNotification({ onAccept }: IncomingCallNotificationProps) {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  const declineCallMutation = trpc.videoCalling.rejectWebRTCCall.useMutation();

  const handleDecline = useCallback(
    async (callId?: string) => {
      const idToDecline = callId ?? incomingCall?.callId;
      if (!idToDecline) return;

      try {
        await declineCallMutation.mutateAsync({
          callId: idToDecline,
        });
        toast.info("Call declined");
      } catch (error) {
        console.error("Failed to decline call:", error);
      }

      setIncomingCall((current) => (current?.callId === idToDecline ? null : current));
    },
    [declineCallMutation, incomingCall?.callId],
  );

  // Incoming call events arrive over the app-level Web PubSub WebSocket
  // (useWebPubSub in App.tsx), which dispatches "incoming-video-call"
  // CustomEvents on window. This component just renders the dialog.
  useEffect(() => {
    const handleIncomingCall = (event: CustomEvent<IncomingCallData>) => {
      const callData = event.detail;
      setIncomingCall(callData);
    };

    window.addEventListener("incoming-video-call" as any, handleIncomingCall);

    return () => {
      window.removeEventListener("incoming-video-call" as any, handleIncomingCall);
    };
  }, []);

  useEffect(() => {
    if (!incomingCall) return;
    const timeout = setTimeout(() => {
      void handleDecline(incomingCall.callId);
    }, 30000);
    return () => clearTimeout(timeout);
  }, [incomingCall, handleDecline]);

  const handleAccept = () => {
    if (!incomingCall) return;

    toast.success("Call accepted");
    onAccept(incomingCall);
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
    <Dialog open={!!incomingCall} onOpenChange={(open) => !open && void handleDecline()}>
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
            onClick={() => void handleDecline()}
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
