import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Loader2,
} from "lucide-react";

interface WebRTCVideoCallProps {
  conversationId: number;
  calleeId: number;
  calleeName: string;
  onCallEnd: () => void;
}

type ConnectionStatus = "initializing" | "connecting" | "connected" | "disconnected" | "failed";

export function WebRTCVideoCall({
  conversationId,
  calleeId,
  calleeName,
  onCallEnd,
}: WebRTCVideoCallProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("initializing");
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0); // in seconds
  const [isCallActive, setIsCallActive] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [callId, setCallId] = useState<string | null>(null);
  const initiateCallMutation = trpc.videoCalling.initiateWebRTCCall.useMutation();
  const sendSignalMutation = trpc.videoCalling.sendWebRTCSignal.useMutation();
  const endCallMutation = trpc.videoCalling.endWebRTCCall.useMutation();

  // ICE servers configuration (using public STUN servers)
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Initialize media devices and peer connection
  useEffect(() => {
    initializeCall();

    return () => {
      cleanup();
    };
  }, []);

  // Duration tracking
  useEffect(() => {
    if (isCallActive) {
      callStartTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        if (callStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
          setCallDuration(elapsed);
        }
      }, 1000);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isCallActive]);

  async function initializeCall() {
    try {
      setConnectionStatus("initializing");

      // Get user media (camera + microphone)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;

      // Display local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = peerConnection;

      // Add local stream tracks to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setConnectionStatus("connected");
          setIsCallActive(true);
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate && callId) {
          await sendSignalMutation.mutateAsync({
            callId,
            recipientId: calleeId,
            type: "ice-candidate",
            data: event.candidate.toJSON(),
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log("[WebRTC] Connection state:", state);

        switch (state) {
          case "connecting":
            setConnectionStatus("connecting");
            break;
          case "connected":
            setConnectionStatus("connected");
            setIsCallActive(true);
            break;
          case "disconnected":
          case "failed":
          case "closed":
            setConnectionStatus("disconnected");
            handleCallEnd();
            break;
        }
      };

      // Create and send offer
      setConnectionStatus("connecting");
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send offer to backend and get callId
      const callResponse = await initiateCallMutation.mutateAsync({
        calleeId,
        conversationId,
      });

      const generatedCallId = callResponse.callId;
      setCallId(generatedCallId);

      await sendSignalMutation.mutateAsync({
        callId: generatedCallId,
        recipientId: calleeId,
        type: "offer",
        data: { sdp: offer.sdp || "" },
      });

      toast.success("Call initiated. Waiting for response...");
    } catch (error) {
      console.error("[WebRTC] Initialization error:", error);
      setConnectionStatus("failed");
      
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        toast.error("Camera/microphone permission denied. Please allow access and try again.");
      } else {
        toast.error("Failed to initialize call. Please check your camera and microphone.");
      }
      
      setTimeout(() => onCallEnd(), 2000);
    }
  }

  async function handleCallEnd() {
    if (!isCallActive) return;

    try {
      // Calculate final duration
      const finalDuration = callStartTimeRef.current
        ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
        : 0;

      // Report call duration to backend
      if (finalDuration > 0 && callId) {
        await endCallMutation.mutateAsync({
          callId,
        });
      }

      cleanup();
      onCallEnd();
      toast.success(`Call ended. Duration: ${formatDuration(finalDuration)}`);
    } catch (error) {
      console.error("[WebRTC] Error ending call:", error);
      cleanup();
      onCallEnd();
    }
  }

  function cleanup() {
    // Stop all media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setIsCallActive(false);
  }

  function toggleCamera() {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
        toast.success(videoTrack.enabled ? "Camera on" : "Camera off");
      }
    }
  }

  function toggleMic() {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
        toast.success(audioTrack.enabled ? "Microphone on" : "Microphone muted");
      }
    }
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  function getStatusColor(): string {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "disconnected":
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  }

  function getStatusText(): string {
    switch (connectionStatus) {
      case "initializing":
        return "Initializing...";
      case "connecting":
        return "Connecting...";
      case "connected":
        return "Connected";
      case "disconnected":
        return "Disconnected";
      case "failed":
        return "Connection failed";
      default:
        return "Unknown";
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <Card className="w-full max-w-5xl h-[80vh] bg-gray-900 border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Video Call with {calleeName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              <span className="text-sm text-gray-400">{getStatusText()}</span>
            </div>
          </div>
          <div className="text-2xl font-mono text-white">
            {formatDuration(callDuration)}
          </div>
        </div>

        {/* Video Container */}
        <div className="flex-1 relative bg-black">
          {/* Remote Video (main) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />

          {/* Local Video (picture-in-picture) */}
          <div className="absolute top-4 right-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600 shadow-xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!isCameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <VideoOff className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>

          {/* Connection Status Overlay */}
          {connectionStatus === "connecting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-4" />
                <p className="text-white text-lg">Connecting to {calleeName}...</p>
              </div>
            </div>
          )}

          {connectionStatus === "failed" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center">
                <p className="text-red-400 text-lg mb-4">Connection failed</p>
                <p className="text-gray-400">Please check your internet connection and try again</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 border-t border-gray-700 bg-gray-900">
          <div className="flex items-center justify-center gap-4">
            {/* Camera Toggle */}
            <Button
              size="lg"
              variant={isCameraOn ? "default" : "destructive"}
              className="rounded-full w-14 h-14"
              onClick={toggleCamera}
            >
              {isCameraOn ? (
                <Video className="h-6 w-6" />
              ) : (
                <VideoOff className="h-6 w-6" />
              )}
            </Button>

            {/* Microphone Toggle */}
            <Button
              size="lg"
              variant={isMicOn ? "default" : "destructive"}
              className="rounded-full w-14 h-14"
              onClick={toggleMic}
            >
              {isMicOn ? (
                <Mic className="h-6 w-6" />
              ) : (
                <MicOff className="h-6 w-6" />
              )}
            </Button>

            {/* Hang Up */}
            <Button
              size="lg"
              variant="destructive"
              className="rounded-full w-16 h-16"
              onClick={handleCallEnd}
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
          </div>

          <p className="text-center text-sm text-gray-400 mt-4">
            Standard tier: {Math.floor(callDuration / 60)} of 600 minutes used this month
          </p>
        </div>
      </Card>
    </div>
  );
}
