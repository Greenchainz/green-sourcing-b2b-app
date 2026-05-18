import { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

// @azure/communication-react and its peer deps are lazy-imported so they
// only load when a video call is actually initiated (~2 MB savings on initial bundle).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CallCompositeType = React.ComponentType<{ adapter: any; options?: Record<string, unknown> }>;

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callType: "voice" | "video";
  callId: string;
  otherPartyName: string;
  isOutgoing: boolean;
  currentUserName?: string;
}

type CallStatus = "connecting" | "ringing" | "active" | "ended";

export function CallModal({
  isOpen,
  onClose,
  callType,
  callId,
  otherPartyName,
  isOutgoing,
  currentUserName = "You",
}: CallModalProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>(isOutgoing ? "ringing" : "connecting");
  const [callDuration, setCallDuration] = useState(0);

  // ACS adapter state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [acsAdapter, setAcsAdapter] = useState<any>(null);
  const [acsLoading, setAcsLoading] = useState(false);
  const [acsError, setAcsError] = useState<string | null>(null);
  const [CallComposite, setCallComposite] = useState<CallCompositeType | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapterRef = useRef<any>(null);

  const utils = trpc.useUtils();

  const endCallMutation = trpc.messaging.endCall.useMutation({
    onSuccess: () => {
      setCallStatus("ended");
      adapterRef.current?.dispose?.();
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

  // When call becomes active + it's video, fetch ACS token and boot the compositor
  useEffect(() => {
    if (callStatus !== "active" || callType !== "video" || acsAdapter) return;

    setAcsLoading(true);
    setAcsError(null);

    void (async () => {
      try {
        const tokenData = await utils.messaging.getCallToken.fetch({ callId });

        const [
          { createAzureCommunicationCallAdapter, CallComposite: Composite },
          { AzureCommunicationTokenCredential },
        ] = await Promise.all([
          import("@azure/communication-react"),
          import("@azure/communication-common"),
        ]);

        // Store component in state (wrapped in arrow so React doesn't call it as init fn)
        setCallComposite(() => Composite as CallCompositeType);

        const adapter = await createAzureCommunicationCallAdapter({
          userId: { communicationUserId: tokenData.acsUserId },
          displayName: currentUserName,
          credential: new AzureCommunicationTokenCredential(tokenData.token),
          locator: { groupId: tokenData.groupCallId },
        });

        adapterRef.current = adapter;
        setAcsAdapter(adapter);
      } catch (err) {
        setAcsError(err instanceof Error ? err.message : "Failed to start video call");
      } finally {
        setAcsLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatus, callType, callId]);

  // Dispose adapter on unmount
  useEffect(() => {
    return () => {
      adapterRef.current?.dispose?.();
    };
  }, []);

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

          {/* ── Video: real ACS CallComposite ─────────────────────── */}
          {callType === "video" && callStatus === "active" && (
            <div className="w-full rounded-lg overflow-hidden" style={{ height: 480 }}>
              {acsLoading && (
                <div className="flex h-full items-center justify-center bg-gray-900">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                  <span className="ml-3 text-white text-sm">Starting video…</span>
                </div>
              )}

              {acsError && (
                <div className="flex h-full items-center justify-center bg-gray-900">
                  <p className="text-red-400 text-sm px-6 text-center">{acsError}</p>
                </div>
              )}

              {!acsLoading && !acsError && acsAdapter && CallComposite && (
                <CallComposite
                  adapter={acsAdapter}
                  options={{
                    callControls: {
                      // We render our own End Call button below for consistency
                      endCallButton: false,
                    },
                  }}
                />
              )}
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
