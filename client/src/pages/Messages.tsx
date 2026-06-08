/**
 * Messages page — /messages
 *
 * Self-contained: all sub-views defined here so no broken child imports
 * can silently prevent the page from rendering.
 *
 * Layout:
 *   Desktop (≥ md):  Left panel 320 px (thread list) + Right panel flex-1 (active thread)
 *   Mobile:          Full-screen list OR full-screen thread, toggled by selectedId
 *
 * Role-awareness:
 *   architect / buyer → threads labelled with RFQ project name
 *   supplier           → threads labelled "Buyer: <name>" to highlight inbound leads
 *
 * Video calling:
 *   - App-level useWebPubSub() establishes WS for real-time call notifications
 *   - IncomingCallNotification handles callee-side incoming call dialog
 *   - VideoCallModal handles WebRTC peer connection + video streams
 *   - Call initiation button lives in ThreadPanel header
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { IncomingCallNotification } from "@/components/messaging/IncomingCallNotification";
import {
  ArrowLeft,
  Building2,
  Loader2,
  MessageCircle,
  MessageSquareDashed,
  Mic,
  MicOff,
  PhoneOff,
  Search,
  Send,
  Video,
  VideoOff,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Conv {
  id: number;
  rfqId: number | null;
  buyerId: number;
  supplierId: number;
  lastMessageAt: Date | string | null;
  lastMessage: string | null;
  isPinned: boolean;
  isArchived: boolean;
  rfqTitle: string | null;
  otherPartyId: number | null;
  otherPartyName: string | null;
  otherPartyEmail: string | null;
}

interface Msg {
  id: number;
  conversationId: number;
  senderId: number;
  senderType: string | null;
  agentType: string | null;
  content: string;
  isRead: boolean;
  readAt: Date | string | null;
  attachmentUrl: string | null;
  attachmentType: string | null;
  attachmentName: string | null;
  createdAt: Date | string;
  senderName: string | null;
  senderEmail: string | null;
}

interface ActiveCall {
  callId: string;
  remoteUserId: number;
  remoteName: string;
  isInitiator: boolean;
}

interface IncomingCallData {
  callId: string;
  callerId: number;
  callerName: string;
  conversationId: number;
  timestamp: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function relTime(d: Date | string | null | undefined): string {
  if (!d) return "";
  try {
    return formatDistanceToNow(new Date(d as string), { addSuffix: true });
  } catch {
    return "";
  }
}

function partyName(conv: Conv): string {
  return conv.otherPartyName || conv.otherPartyEmail || "Unknown";
}

// ── VideoCallModal ─────────────────────────────────────────────────────────────

const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function VideoCallModal({
  call,
  onEnd,
}: {
  call: ActiveCall;
  onEnd: () => void;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [callStatus, setCallStatus] = useState<"connecting" | "connected">("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const sendSignalMutation = trpc.videoCalling.sendWebRTCSignal.useMutation();
  const endCallMutation = trpc.videoCalling.endWebRTCCall.useMutation();

  const sendSignal = useCallback(
    (type: "offer" | "answer" | "ice-candidate", data: unknown) => {
      void sendSignalMutation
        .mutateAsync({
          callId: call.callId,
          recipientId: call.remoteUserId,
          type,
          data,
        })
        .catch((err: unknown) => console.error("[VideoCall] Signal error:", err));
    },
    [call.callId, call.remoteUserId, sendSignalMutation]
  );

  useEffect(() => {
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setCallStatus("connected");
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("ice-candidate", event.candidate);
      }
    };

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        if (call.isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal("offer", offer);
        }
      } catch (err) {
        console.error("[VideoCall] Media error:", err);
        toast.error("Could not access camera or microphone. Check browser permissions.");
        onEnd();
      }
    };

    void initMedia();

    const handleWebRTCSignal = (event: Event) => {
      const { callId, signalType, signalData } = (event as CustomEvent<{
        callId: string;
        senderId: number;
        signalType: string;
        signalData: RTCSessionDescriptionInit | RTCIceCandidateInit;
      }>).detail;

      if (callId !== call.callId) return;

      if (signalType === "offer") {
        void (async () => {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData as RTCSessionDescriptionInit));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal("answer", answer);
        })();
      } else if (signalType === "answer") {
        void pc.setRemoteDescription(new RTCSessionDescription(signalData as RTCSessionDescriptionInit));
      } else if (signalType === "ice-candidate") {
        void pc
          .addIceCandidate(new RTCIceCandidate(signalData as RTCIceCandidateInit))
          .catch((err: unknown) => console.error("[VideoCall] ICE error:", err));
      }
    };

    window.addEventListener("webrtc-signal", handleWebRTCSignal);

    return () => {
      window.removeEventListener("webrtc-signal", handleWebRTCSignal);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pc.close();
    };
    // sendSignal is stable (useCallback with stable deps) — safe to include
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.callId, call.isInitiator, call.remoteUserId]);

  const handleEnd = async () => {
    try {
      await endCallMutation.mutateAsync({ callId: call.callId });
    } catch (err) {
      console.error("[VideoCall] End call error:", err);
    }
    onEnd();
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((prev) => !prev);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOff((prev) => !prev);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full max-w-3xl mx-4 bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-zinc-800">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-green-400" />
            <span className="text-white text-sm font-medium">{call.remoteName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                callStatus === "connected"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-yellow-500/20 text-yellow-400"
              )}
            >
              {callStatus === "connected" ? "Connected" : "Connecting…"}
            </span>
          </div>
        </div>

        {/* Video area */}
        <div className="relative bg-zinc-950 aspect-video">
          {/* Remote video (full size) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Remote placeholder when connecting */}
          {callStatus === "connecting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="h-16 w-16 rounded-full bg-zinc-700 flex items-center justify-center text-2xl font-semibold text-white">
                {call.remoteName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {/* Local video (PiP) */}
          <div className="absolute bottom-3 right-3 w-32 aspect-video rounded-lg overflow-hidden border border-white/20 shadow-lg bg-zinc-800">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={cn("w-full h-full object-cover", isCameraOff && "invisible")}
            />
            {isCameraOff && (
              <div className="absolute inset-0 flex items-center justify-center">
                <VideoOff className="h-6 w-6 text-zinc-400" />
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 py-4 bg-zinc-800">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className={cn(
              "h-12 w-12 rounded-full",
              isMuted
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-zinc-700 text-white hover:bg-zinc-600"
            )}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCamera}
            className={cn(
              "h-12 w-12 rounded-full",
              isCameraOff
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-zinc-700 text-white hover:bg-zinc-600"
            )}
            title={isCameraOff ? "Turn camera on" : "Turn camera off"}
          >
            {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>

          <Button
            size="icon"
            onClick={handleEnd}
            disabled={endCallMutation.isPending}
            className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white"
            title="End call"
          >
            {endCallMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <PhoneOff className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── ConversationItem ───────────────────────────────────────────────────────────

function ConversationItem({
  conv,
  isSelected,
  role,
  onSelect,
}: {
  conv: Conv;
  isSelected: boolean;
  role: string;
  onSelect: () => void;
}) {
  const name = partyName(conv);

  const tag =
    role === "supplier"
      ? `Buyer: ${name}`
      : conv.rfqTitle
        ? `RFQ: ${conv.rfqTitle}`
        : null;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left px-4 py-3 border-b transition-colors",
        "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        isSelected && "bg-accent"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <span className="font-medium text-sm truncate flex-1">{name}</span>
        <span className="text-[10px] text-muted-foreground shrink-0 pt-0.5">
          {relTime(conv.lastMessageAt)}
        </span>
      </div>

      {tag && (
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 mb-1 font-normal">
          {tag}
        </Badge>
      )}

      {conv.lastMessage && (
        <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
      )}
    </button>
  );
}

// ── Left panel: conversation list ──────────────────────────────────────────────

function ConversationListPanel({
  selectedId,
  onSelect,
  role,
}: {
  selectedId?: number;
  onSelect: (id: number) => void;
  role: string;
}) {
  const [search, setSearch] = useState("");

  const { data: rawConvs, isLoading } = trpc.messaging.getConversations.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  const conversations = rawConvs as Conv[] | undefined;

  const filtered =
    conversations?.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        c.otherPartyName?.toLowerCase().includes(q) ||
        c.otherPartyEmail?.toLowerCase().includes(q) ||
        c.rfqTitle?.toLowerCase().includes(q) ||
        c.lastMessage?.toLowerCase().includes(q)
      );
    }) ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search conversations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-5 gap-2">
            <MessageCircle className="h-10 w-10 text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground">
              {search
                ? "No conversations match your search."
                : role === "supplier"
                  ? "No inbound buyer messages yet."
                  : "No conversations yet. Start one from an RFQ page."}
            </p>
          </div>
        ) : (
          filtered.map((c) => (
            <ConversationItem
              key={c.id}
              conv={c}
              isSelected={selectedId === c.id}
              role={role}
              onSelect={() => onSelect(c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg, isMine }: { msg: Msg; isMine: boolean }) {
  const isAgent = msg.senderType === "agent";

  return (
    <div
      className={cn(
        "flex flex-col max-w-[72%]",
        isMine ? "self-end items-end" : "self-start items-start"
      )}
    >
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words leading-relaxed",
          isMine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : isAgent
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-bl-sm"
              : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {msg.content}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 px-1 flex items-center gap-1">
        {!isMine && (
          <>
            <span className="font-medium">
              {isAgent ? "AI Assistant" : (msg.senderName ?? "Unknown")}
            </span>
            <span>·</span>
          </>
        )}
        {relTime(msg.createdAt)}
        {isMine && msg.isRead && (
          <span className="text-primary/60 ml-1">✓</span>
        )}
      </p>
    </div>
  );
}

// ── Right panel: active thread ─────────────────────────────────────────────────

function ThreadPanel({
  conversationId,
  userId,
  role,
  conversations,
  onBack,
  onStartCall,
}: {
  conversationId: number;
  userId: number;
  role: string;
  conversations: Conv[] | undefined;
  onBack: () => void;
  onStartCall: (remoteUserId: number, remoteName: string, conversationId: number) => void;
}) {
  const conv = conversations?.find((c) => c.id === conversationId);
  const endRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState("");

  const { data: rawMsgs, isLoading } = trpc.messaging.getMessages.useQuery(
    { conversationId },
    { refetchInterval: 3_000 }
  );
  const msgs = rawMsgs as Msg[] | undefined;

  const sendMutation = trpc.messaging.send.useMutation({
    onSuccess: () => {
      setDraft("");
      utils.messaging.getMessages.invalidate({ conversationId });
      utils.messaging.getConversations.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to send message"),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate({ conversationId, content: text });
  }, [draft, conversationId, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVideoCall = () => {
    if (!conv?.otherPartyId) {
      toast.error("Cannot start call — recipient not found");
      return;
    }
    onStartCall(conv.otherPartyId, partyName(conv), conversationId);
  };

  // Header details
  const name = conv ? partyName(conv) : "…";
  const subtitle =
    role === "supplier"
      ? conv?.rfqTitle ? `Re: ${conv.rfqTitle}` : "Direct message"
      : conv?.rfqTitle ?? "Direct message";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mobile: back button */}
      <div className="md:hidden h-10 px-3 border-b flex items-center shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 -ml-1 text-xs h-7"
          onClick={onBack}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All conversations
        </Button>
      </div>

      {/* Thread header */}
      <div className="h-14 px-4 border-b flex items-center gap-3 shrink-0">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          {role === "supplier" ? (
            <Building2 className="h-4 w-4 text-muted-foreground" />
          ) : (
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        </div>
        {/* Video call button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-green-600"
          onClick={handleVideoCall}
          title={`Start video call with ${name}`}
          disabled={!conv?.otherPartyId}
        >
          <Video className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !msgs || msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <MessageSquareDashed className="h-10 w-10 text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground">No messages yet — say hello!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {msgs.map((m) => (
              <MessageBubble
                key={m.id}
                msg={m}
                isMine={Number(m.senderId) === userId}
              />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Compose area */}
      <div className="border-t px-4 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send · Shift+Enter for newline)"
            className="min-h-[60px] max-h-[140px] resize-none text-sm"
            disabled={sendMutation.isPending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!draft.trim() || sendMutation.isPending}
            className="shrink-0 h-10 w-10"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Empty right-panel state ────────────────────────────────────────────────────

function EmptyThread({ role }: { role: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
      <MessageSquareDashed className="w-14 h-14 text-muted-foreground/20 mb-5" />
      <h3 className="font-semibold text-base mb-2">Select a conversation</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
        {role === "supplier"
          ? "Choose an inbound buyer thread from the list to view and reply to messages."
          : "Choose a conversation from the left to view messages. Threads are linked to your RFQs."}
      </p>
    </div>
  );
}

// ── Page root ──────────────────────────────────────────────────────────────────

export default function Messages() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const utils = trpc.useUtils();

  const { data: rawConvs } = trpc.messaging.getConversations.useQuery(undefined, {
    refetchInterval: 15_000,
    enabled: !!user,
  });
  const conversations = rawConvs as Conv[] | undefined;

  const markAsRead = trpc.messaging.markAsRead.useMutation({
    onSuccess: () => {
      utils.messaging.getUnreadCount.invalidate();
      utils.messaging.getConversations.invalidate();
    },
  });

  const initiateCallMutation = trpc.videoCalling.initiateWebRTCCall.useMutation();
  const acceptCallMutation = trpc.videoCalling.acceptWebRTCCall.useMutation();

  const handleSelect = (id: number) => {
    setSelectedId(id);
    markAsRead.mutate({ conversationId: id });
  };

  const handleBack = () => setSelectedId(undefined);

  const handleStartCall = useCallback(
    async (remoteUserId: number, remoteName: string, conversationId: number) => {
      if (activeCall) {
        toast.error("You're already in a call");
        return;
      }
      try {
        const session = await initiateCallMutation.mutateAsync({
          calleeId: remoteUserId,
          conversationId,
        });
        setActiveCall({
          callId: session.callId,
          remoteUserId,
          remoteName,
          isInitiator: true,
        });
        toast.success(`Calling ${remoteName}…`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to start call");
      }
    },
    [activeCall, initiateCallMutation]
  );

  const handleAcceptCall = useCallback(
    async (callData: IncomingCallData) => {
      try {
        await acceptCallMutation.mutateAsync({ callId: callData.callId });
        setActiveCall({
          callId: callData.callId,
          remoteUserId: callData.callerId,
          remoteName: callData.callerName,
          isInitiator: false,
        });
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to accept call");
      }
    },
    [acceptCallMutation]
  );

  const handleEndCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  const role = user?.role ?? "architect";
  const userId = user ? Number(user.id) : 0;

  // Unauthenticated guard
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/25" />
            <p className="text-muted-foreground text-sm">Sign in to view your messages.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Incoming call notification — listens for window events from useWebPubSub */}
      <IncomingCallNotification onAccept={handleAcceptCall} />

      {/* Active video call modal */}
      {activeCall && (
        <VideoCallModal call={activeCall} onEnd={handleEndCall} />
      )}

      {/* Chat layout — fills viewport below the 4rem header */}
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>

        {/* ── Left panel ── */}
        <div
          className={cn(
            "w-full md:w-80 shrink-0 border-r flex flex-col",
            selectedId !== undefined ? "hidden md:flex" : "flex"
          )}
        >
          {/* Panel header */}
          <div className="h-14 px-4 border-b flex items-center justify-between shrink-0">
            <h1 className="font-semibold text-sm flex items-center gap-2">
              {role === "supplier" ? (
                <Building2 className="w-4 h-4 text-muted-foreground" />
              ) : (
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
              )}
              {role === "supplier" ? "Buyer Messages" : "Messages"}
            </h1>
            <span className="text-[11px] text-muted-foreground">
              {role === "supplier" ? "Inbound threads" : "RFQ-linked"}
            </span>
          </div>

          <div className="flex-1 overflow-hidden">
            <ConversationListPanel
              selectedId={selectedId}
              onSelect={handleSelect}
              role={role}
            />
          </div>
        </div>

        {/* ── Right panel ── */}
        <div
          className={cn(
            "flex-1 flex flex-col overflow-hidden",
            selectedId === undefined ? "hidden md:flex" : "flex"
          )}
        >
          {selectedId !== undefined ? (
            <ThreadPanel
              conversationId={selectedId}
              userId={userId}
              role={role}
              conversations={conversations}
              onBack={handleBack}
              onStartCall={handleStartCall}
            />
          ) : (
            <EmptyThread role={role} />
          )}
        </div>
      </div>
    </div>
  );
}
