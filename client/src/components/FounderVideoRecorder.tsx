import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Circle, Square, RotateCcw, Send, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const MAX_DURATION_SEC = 60;

interface FounderVideoRecorderProps {
  /** Called when user clicks "Send" with the recorded blob + duration. */
  onSend: (blob: Blob, durationSec: number) => Promise<void>;
  /** Disable controls while parent is uploading. */
  isSending: boolean;
}

type RecorderState =
  | { kind: "idle" }
  | { kind: "previewing"; stream: MediaStream }
  | { kind: "recording"; stream: MediaStream; startedAt: number }
  | { kind: "recorded"; blob: Blob; previewUrl: string; durationSec: number };

export function FounderVideoRecorder({ onSend, isSending }: FounderVideoRecorderProps) {
  const [state, setState] = useState<RecorderState>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Attach the live stream to the <video> element when previewing/recording
  useEffect(() => {
    if ((state.kind === "previewing" || state.kind === "recording") && videoRef.current) {
      videoRef.current.srcObject = state.stream;
      videoRef.current.muted = true;
      void videoRef.current.play().catch(() => {
        /* user gesture needed — ignore */
      });
    }
  }, [state]);

  // Cleanup on unmount: stop tracks, clear timer
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (state.kind === "previewing" || state.kind === "recording") {
        state.stream.getTracks().forEach((t) => t.stop());
      }
      if (state.kind === "recorded") {
        URL.revokeObjectURL(state.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      setState({ kind: "previewing", stream });
    } catch (err) {
      console.error("[recorder] getUserMedia failed:", err);
      setError("Could not access camera/microphone. Check browser permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startRecording = useCallback(() => {
    if (state.kind !== "previewing") return;

    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";

    const recorder = new MediaRecorder(state.stream, { mimeType: mime });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const previewUrl = URL.createObjectURL(blob);
      const finalDuration = Math.min(MAX_DURATION_SEC, Math.max(1, elapsed));

      // Stop the live stream
      state.stream.getTracks().forEach((t) => t.stop());

      setState({ kind: "recorded", blob, previewUrl, durationSec: finalDuration });
      setElapsed(0);
    };

    recorder.start();
    const startedAt = Date.now();
    setState({ kind: "recording", stream: state.stream, startedAt });
    setElapsed(0);

    tickRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(secs);
      if (secs >= MAX_DURATION_SEC) {
        stopRecording();
      }
    }, 250);
  }, [state, elapsed, stopRecording]);

  const reset = useCallback(() => {
    if (state.kind === "recorded") URL.revokeObjectURL(state.previewUrl);
    setState({ kind: "idle" });
    setElapsed(0);
    setError(null);
  }, [state]);

  const handleSend = useCallback(async () => {
    if (state.kind !== "recorded") return;
    try {
      await onSend(state.blob, state.durationSec);
    } catch (err) {
      console.error("[recorder] send failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to send video");
    }
  }, [state, onSend]);

  const playbackUrl = state.kind === "recorded" ? state.previewUrl : null;

  return (
    <Card className="overflow-hidden">
      <div className="relative bg-black aspect-video">
        {state.kind === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-center px-6">
            <div>
              <Circle className="w-12 h-12 mx-auto mb-3 opacity-60" />
              <p className="text-sm opacity-80">Click below to start your camera</p>
            </div>
          </div>
        )}

        {(state.kind === "previewing" || state.kind === "recording") && (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            autoPlay
            muted
          />
        )}

        {state.kind === "recorded" && playbackUrl && (
          <video
            src={playbackUrl}
            className="w-full h-full object-contain bg-black"
            controls
            playsInline
          />
        )}

        {state.kind === "recording" && (
          <div className="absolute top-3 left-3 bg-red-600 text-white text-sm font-mono px-3 py-1 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {String(elapsed).padStart(2, "0")} / {MAX_DURATION_SEC}s
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border-t border-red-200 dark:border-red-900 p-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="p-4 flex flex-wrap gap-2 border-t bg-muted/30">
        {state.kind === "idle" && (
          <Button onClick={startCamera} disabled={isSending}>
            <Circle className="w-4 h-4 mr-2" />
            Start Camera
          </Button>
        )}

        {state.kind === "previewing" && (
          <>
            <Button onClick={startRecording} disabled={isSending}>
              <Circle className="w-4 h-4 mr-2 fill-red-500 text-red-500" />
              Start Recording
            </Button>
            <Button variant="ghost" onClick={reset} disabled={isSending}>
              Cancel
            </Button>
          </>
        )}

        {state.kind === "recording" && (
          <Button onClick={stopRecording} variant="destructive">
            <Square className="w-4 h-4 mr-2" />
            Stop ({elapsed}s)
          </Button>
        )}

        {state.kind === "recorded" && (
          <>
            <Button onClick={handleSend} disabled={isSending}>
              <Send className="w-4 h-4 mr-2" />
              {isSending ? "Sending…" : "Send Video"}
            </Button>
            <Button variant="outline" onClick={reset} disabled={isSending}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Re-record
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
