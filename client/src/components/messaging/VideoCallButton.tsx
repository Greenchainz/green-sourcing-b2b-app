import { useState } from "react";
import { Video, VideoOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { WebRTCVideoCall } from "./WebRTCVideoCall";

interface VideoCallButtonProps {
  conversationId: number;
  otherPartyId: number;
  otherPartyName: string;
}

export function VideoCallButton({ conversationId, otherPartyId, otherPartyName }: VideoCallButtonProps) {

  const [isInitiating, setIsInitiating] = useState(false);
  const [isInCall, setIsInCall] = useState(false);

  // Get user's usage stats to determine tier and remaining video hours
  const { data: usageStats } = trpc.messaging.getUserUsageStats.useQuery();
  const { data: videoLimit } = trpc.messaging.checkVideoLimit.useQuery();

  const initiateWebRTCCall = trpc.videoCalling.initiateWebRTCCall.useMutation();
  const initiateACSCall = trpc.videoCalling.initiateACSCall.useMutation();

  const handleStartCall = async () => {
    if (!usageStats || !videoLimit) return;

    // Check if user can make video calls
    if (!videoLimit.canCall) {
      toast.error(videoLimit.reason || "You've reached your video calling limit.");
      return;
    }

    setIsInitiating(true);

    try {
      // Route to correct video system based on tier
      if (usageStats.tier === "premium") {
        // Use Azure Communication Services for Premium
        const result = await initiateACSCall.mutateAsync({
          calleeId: otherPartyId,
          conversationId,
          recordingEnabled: false,
        });

        toast.success(`Calling ${otherPartyName}...`, {
          description: "HD Quality, Recording Available",
        });

        // TODO: Open ACS video call UI
        console.log("ACS call initiated:", result);
      } else if (usageStats.tier === "standard") {
        // Use WebRTC for Standard
        const result = await initiateWebRTCCall.mutateAsync({
          calleeId: otherPartyId,
          conversationId,
        });

        toast.success(`Calling ${otherPartyName}...`);

        // Open WebRTC video call UI
        setIsInCall(true);
      } else {
        // Free tier - should not reach here due to videoLimit.canCall check
        toast.error("Video calling is available on Standard and Premium plans.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate video call");
    } finally {
      setIsInitiating(false);
    }
  };

  // Don't show button for free tier
  if (usageStats?.tier === "free") {
    return (
      <Button variant="outline" size="sm" disabled>
        <VideoOff className="h-4 w-4 mr-2" />
        Video (Premium)
      </Button>
    );
  }

  const remainingHours = videoLimit?.minutesLimit
    ? Math.floor((videoLimit.minutesLimit - (videoLimit.minutesUsed || 0)) / 60)
    : 0;

  return (
    <>
      {isInCall && (
        <WebRTCVideoCall
          conversationId={conversationId}
          calleeId={otherPartyId}
          calleeName={otherPartyName}
          onCallEnd={() => setIsInCall(false)}
        />
      )}

      <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleStartCall}
        disabled={isInitiating || !videoLimit?.canCall}
      >
        {isInitiating ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Video className="h-4 w-4 mr-2" />
        )}
        {usageStats?.tier === "premium" ? "HD Video Call" : "Video Call"}
      </Button>

      {videoLimit && (
        <span className="text-xs text-muted-foreground">
          {remainingHours}h remaining
        </span>
      )}
    </div>
    </>
  );
}
