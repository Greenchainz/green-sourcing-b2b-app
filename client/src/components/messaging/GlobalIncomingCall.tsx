import { useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  IncomingCallNotification,
  type IncomingCallData,
} from "./IncomingCallNotification";

/**
 * App-level incoming call handler.
 *
 * Mounted once in App.tsx so incoming video calls surface on ANY page,
 * not just /messages. On accept it confirms the call with the server and
 * navigates to /messages with the call details in the query string —
 * Messages.tsx picks these up and opens the active call modal as callee.
 */
export function GlobalIncomingCall() {
  const [, navigate] = useLocation();
  const acceptCallMutation = trpc.videoCalling.acceptWebRTCCall.useMutation();

  const handleAccept = useCallback(
    async (callData: IncomingCallData) => {
      try {
        await acceptCallMutation.mutateAsync({ callId: callData.callId });
        const params = new URLSearchParams({
          callId: callData.callId,
          callerId: String(callData.callerId),
          callerName: callData.callerName,
        });
        navigate(`/messages?${params.toString()}`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to accept call");
      }
    },
    [acceptCallMutation, navigate]
  );

  return <IncomingCallNotification onAccept={handleAccept} />;
}
