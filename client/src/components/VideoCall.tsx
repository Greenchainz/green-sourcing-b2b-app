/**
 * VideoCall.tsx
 *
 * Video calling is not yet live. This component renders a "Coming Soon" state
 * so that if it is ever mounted, users see a clear message rather than a broken
 * WebRTC connection attempt or a camera-permission prompt that goes nowhere.
 *
 * When ACS / WebRTC signaling is ready, replace this file with the full
 * implementation from WebRTCVideoCall.tsx as the base.
 */

import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface VideoCallProps {
  remoteUserId?: string;
  onCallEnd?: () => void;
  isInitiator?: boolean;
}

export const VideoCall: React.FC<VideoCallProps> = ({ onCallEnd }) => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Video calling coming soon</AlertTitle>
          <AlertDescription>
            Video calling is launching shortly. You'll be notified when it's available.
            Questions? Email{" "}
            <a
              href="mailto:support@greenchainz.com"
              className="underline text-foreground"
            >
              support@greenchainz.com
            </a>
          </AlertDescription>
        </Alert>
        {onCallEnd && (
          <Button variant="outline" className="w-full" onClick={onCallEnd}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
