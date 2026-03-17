import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff } from 'lucide-react';

interface VideoCallProps {
  remoteUserId: string;
  onCallEnd?: () => void;
  isInitiator?: boolean;
}

export const VideoCall: React.FC<VideoCallProps> = ({
  remoteUserId,
  onCallEnd,
  isInitiator = false,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callState, setCallState] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [error, setError] = useState<string | null>(null);

  // Initialize local media stream
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        });

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize peer connection
        initializePeerConnection(stream);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to access camera/microphone';
        setError(message);
        console.error('[VideoCall] Media error:', err);
      }
    };

    initializeMedia();

    return () => {
      // Cleanup: stop all tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Initialize WebRTC peer connection
  const initializePeerConnection = (localStream: MediaStream) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      ],
    });

    peerConnectionRef.current = peerConnection;

    // Add local stream tracks
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event: RTCTrackEvent) => {
      console.log('[VideoCall] Received remote track:', event.track.kind);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('[VideoCall] Connection state:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'connected') {
        setCallState('connected');
      } else if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        setError('Connection lost');
        handleEndCall();
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        console.log('[VideoCall] New ICE candidate:', event.candidate);
        // TODO: Send ICE candidate to remote peer via signaling server
      }
    };

    // If initiator, create offer
    if (isInitiator) {
      createOffer(peerConnection);
    }
  };

  // Create and send offer
  const createOffer = async (peerConnection: RTCPeerConnection) => {
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      console.log('[VideoCall] Offer created:', offer);
      // TODO: Send offer to remote peer via signaling server
    } catch (err) {
      console.error('[VideoCall] Error creating offer:', err);
      setError('Failed to create call');
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // End call
  const handleEndCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setCallState('ended');
    onCallEnd?.();
  };

  if (callState === 'ended') {
    return (
      <div className="flex items-center justify-center h-96 bg-background rounded-lg border border-border">
        <div className="text-center">
          <p className="text-foreground mb-4">Call ended</p>
          <Button onClick={onCallEnd}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background rounded-lg border border-border overflow-hidden">
      {/* Video Container */}
      <div className="relative w-full aspect-video bg-black">
        {/* Remote video (main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Local video (pip) */}
        <div className="absolute bottom-4 right-4 w-32 h-24 bg-black rounded-lg overflow-hidden border-2 border-accent">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={handleEndCall} variant="destructive">
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Connection status */}
        {callState === 'connecting' && (
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-white text-sm">Connecting...</span>
          </div>
        )}

        {callState === 'connected' && (
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-white text-sm">Connected</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 bg-card border-t border-border">
        {/* Mute Audio */}
        <Button
          size="lg"
          variant={isAudioEnabled ? 'default' : 'destructive'}
          onClick={toggleAudio}
          className="rounded-full w-12 h-12 p-0"
        >
          {isAudioEnabled ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
        </Button>

        {/* Toggle Video */}
        <Button
          size="lg"
          variant={isVideoEnabled ? 'default' : 'destructive'}
          onClick={toggleVideo}
          className="rounded-full w-12 h-12 p-0"
        >
          {isVideoEnabled ? (
            <Video className="w-5 h-5" />
          ) : (
            <VideoOff className="w-5 h-5" />
          )}
        </Button>

        {/* End Call */}
        <Button
          size="lg"
          variant="destructive"
          onClick={handleEndCall}
          className="rounded-full w-12 h-12 p-0"
        >
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default VideoCall;
