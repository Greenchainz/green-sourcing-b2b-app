import { useState, useEffect } from "react";
import { Phone, PhoneOff, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callType: "voice" | "video";
  callId: string;
  otherPartyName: string;
  isOutgoing: boolean;
}

type CallStatus = "connecting" | "ringing" | "active" | "ended";

export function CallModal({
  isOpen,
  onClose,
  callType,
  callId,
  otherPartyName,
  isOutgoing,
}: CallModalProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>(isOutgoing ? "ringing" : "connecting");
  const [callDuration, setCallDuration] = useState(0);

  const endCallMutation = trpc.messaging.endCall.useMutation({
    onSuccess: () => {
      setCallStatus("ended");
      setTimeout(onClose, 2000);
    },
  });

  const acceptCallMutation = trpc.messaging.acceptCall.useMutation({
    onSuccess: () => setCallStatus("active"),
  });

  const rejectCallMutation = trpc.messaging.rejectCall.useMutation({
    onSuccess: onClose,
  });

  // Duration timer (voice calls / active state)
  useEffect(() => {
    if (callStatus !== "active") return;
    const interval = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  // Outgoing: auto-transition ringing → active (real accept via WebPubSub in prod)
  useEffect(() => {
    if (isOutgoing && callStatus === "ringing") {
      const t = setTimeout(() => setCallStatus("active"), 3000);
      return () => clearTimeout(t);
    }
  }, [isOutgoing, callStatus]);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const isWideModal = callType === "video" && callStatus === "active";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={isWideModal ? "sm:max-w-4xl" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>
            {callType === "voice" ? "Voice Call" : "Video Call"} — {otherPartyName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Status line */}
          <p className="text-sm text-muted-foreground">
            {callStatus === "connecting" && "Incoming call…"}
            {callStatus === "ringing" && "Ringing…"}
            {callStatus === "active" && callType === "voice" && formatDuration(callDuration)}
            {callStatus === "ended" && "Call ended"}
          </p>

          {/* ── Video: unavailable (ACS packages removed) ──────────── */}
          {callType === "video" && callStatus === "active" && (
            <div className="w-full rounded-lg overflow-hidden flex items-center justify-center bg-gray-900" style={{ height: 480 }}>
              <div className="flex flex-col items-center gap-3 text-white">
                <VideoOff className="h-12 w-12 text-gray-400" />
                <p className="text-sm text-gray-400">Video calling is not available</p>
              </div>
            </div>
          )}

          {/* ── Call controls ──────────────────────────────────────── */}
          <div className="flex items-center gap-4 mt-2">
            {/* Incoming: accept / reject */}
            {!isOutgoing && callStatus === "connecting" && (
              <>
                <Button
                  variant="default"
                  size="icon"
                  className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600"
                  onClick={() => acceptCallMutation.mutate({ callId })}
                  disabled={acceptCallMutation.isPending}
                >
                  <Phone className="h-6 w-6" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-14 w-14 rounded-full"
                  onClick={() => rejectCallMutation.mutate({ callId })}
                  disabled={rejectCallMutation.isPending}
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Active or outgoing-ringing: end call */}
            {(callStatus === "active" || (isOutgoing && callStatus === "ringing")) && (
              <Button
                variant="destructive"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={() => endCallMutation.mutate({ callId })}
                disabled={endCallMutation.isPending}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
