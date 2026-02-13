import { useState, useEffect } from "react";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
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

export function CallModal({
  isOpen,
  onClose,
  callType,
  callId,
  otherPartyName,
  isOutgoing,
}: CallModalProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === "video");
  const [callStatus, setCallStatus] = useState<"connecting" | "ringing" | "active" | "ended">(
    isOutgoing ? "ringing" : "connecting"
  );

  const endCallMutation = trpc.messaging.endCall.useMutation({
    onSuccess: (data) => {
      setCallStatus("ended");
      setTimeout(() => {
        onClose();
      }, 2000);
    },
  });

  const acceptCallMutation = trpc.messaging.acceptCall.useMutation({
    onSuccess: () => {
      setCallStatus("active");
    },
  });

  const rejectCallMutation = trpc.messaging.rejectCall.useMutation({
    onSuccess: () => {
      onClose();
    },
  });

  // Duration timer
  useEffect(() => {
    if (callStatus !== "active") return;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStatus]);

  // Auto-accept for outgoing calls (simulated)
  useEffect(() => {
    if (isOutgoing && callStatus === "ringing") {
      // Simulate call being accepted after 2 seconds
      const timeout = setTimeout(() => {
        setCallStatus("active");
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isOutgoing, callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    endCallMutation.mutate({ callId });
  };

  const handleAcceptCall = () => {
    acceptCallMutation.mutate({ callId });
  };

  const handleRejectCall = () => {
    rejectCallMutation.mutate({ callId });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {callType === "voice" ? "Voice Call" : "Video Call"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {/* Call Status */}
          <div className="text-center">
            <h3 className="text-xl font-semibold">{otherPartyName}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {callStatus === "connecting" && "Connecting..."}
              {callStatus === "ringing" && "Ringing..."}
              {callStatus === "active" && formatDuration(callDuration)}
              {callStatus === "ended" && "Call Ended"}
            </p>
          </div>

          {/* Video Feed Placeholder */}
          {callType === "video" && isVideoEnabled && (
            <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
              <Video className="h-12 w-12 text-gray-500" />
              <p className="text-gray-400 ml-2">Video feed (placeholder)</p>
            </div>
          )}

          {/* Call Controls */}
          <div className="flex items-center gap-4">
            {/* Mute Button */}
            {callStatus === "active" && (
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
            )}

            {/* Video Toggle (for video calls) */}
            {callType === "video" && callStatus === "active" && (
              <Button
                variant={!isVideoEnabled ? "destructive" : "outline"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
            )}

            {/* End Call / Reject Button */}
            {(callStatus === "active" || callStatus === "ringing") && (
              <Button
                variant="destructive"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={isOutgoing || callStatus === "active" ? handleEndCall : handleRejectCall}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            )}

            {/* Accept Button (for incoming calls) */}
            {!isOutgoing && callStatus === "connecting" && (
              <Button
                variant="default"
                size="icon"
                className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600"
                onClick={handleAcceptCall}
              >
                <Phone className="h-6 w-6" />
              </Button>
            )}
          </div>

          {/* Call Stats */}
          {callStatus === "active" && (
            <div className="text-xs text-muted-foreground">
              {isMuted && "🔇 Muted"}
              {!isVideoEnabled && callType === "video" && " • 📹 Video Off"}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
