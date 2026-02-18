import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import {
  Mic,
  Square,
  Pause,
  Play,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getSupportedAudioMimeType, getAudioBlobType } from "@/lib/audio-utils";

interface MobileVoiceOverlayProps {
  visitId: string;
  open: boolean;
  onClose: () => void;
}

type OverlayPhase = "idle" | "recording" | "paused" | "saving" | "transcribing" | "extracting" | "done" | "error";

export function MobileVoiceOverlay({ visitId, open, onClose }: MobileVoiceOverlayProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: consents, refetch: refetchConsents } = useQuery<any[]>({ queryKey: [`/api/visits/${visitId}/consents`] });
  const { data: aiStatus } = useQuery<any>({ queryKey: ["/api/ai-providers/active"] });

  const voiceConsent = consents?.find((c: any) => c.consentType === "voice_transcription" && c.status === "granted");
  const hasConsent = !!voiceConsent;
  const aiReady = aiStatus?.configured && aiStatus?.hasKey;

  const [phase, setPhase] = useState<OverlayPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [resultMessage, setResultMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef<number>(0);

  useEffect(() => {
    if (open) {
      setPhase("idle");
      setElapsed(0);
      setResultMessage("");
      setErrorMessage("");
      refetchConsents();
    }
  }, [open, refetchConsents]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedMime = getSupportedAudioMimeType();
      const recorderOptions: MediaRecorderOptions = supportedMime ? { mimeType: supportedMime } : {};
      const recorder = new MediaRecorder(stream, recorderOptions);
      const actualMime = recorder.mimeType || supportedMime || "audio/webm";
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: getAudioBlobType(actualMime) });
        if (blob.size > 0) {
          saveAndProcess(blob);
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setPhase("recording");
      pausedElapsedRef.current = 0;
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(pausedElapsedRef.current + (Date.now() - startTimeRef.current) / 1000);
      }, 100);
    } catch (err: any) {
      const isNotSupported = err?.name === "NotSupportedError" || err?.name === "TypeError";
      toast({
        title: isNotSupported ? "Recording not supported" : "Microphone access denied",
        description: isNotSupported
          ? "Your browser does not support audio recording. Please use Safari on iOS 14.3+."
          : "Please allow microphone access in your device settings.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (phase === "paused") {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(pausedElapsedRef.current + (Date.now() - startTimeRef.current) / 1000);
      }, 100);
      setPhase("recording");
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      pausedElapsedRef.current = pausedElapsedRef.current + (Date.now() - startTimeRef.current) / 1000;
      setPhase("paused");
    }
  }, [phase]);

  const saveAndProcess = useCallback(async (audioBlob: Blob) => {
    try {
      setPhase("saving");
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(audioBlob);
      });

      const res = await apiRequest("POST", `/api/visits/${visitId}/recordings`, {
        recordedBy: user?.id,
        recordedByName: user?.fullName,
        mimeType: audioBlob.type,
        durationSec: Math.round(elapsed),
        audioData: base64,
      });
      const recording = await res.json();
      queryClient.invalidateQueries({ queryKey: [`/api/visits/${visitId}/recordings`] });

      setPhase("transcribing");
      const txRes = await apiRequest("POST", `/api/visits/${visitId}/transcribe`, {
        recordingId: recording.id,
        userId: user?.id,
        userName: user?.fullName,
      });
      const transcript = await txRes.json();
      queryClient.invalidateQueries({ queryKey: [`/api/visits/${visitId}/transcripts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/visits/${visitId}/recordings`] });

      if (transcript.status === "completed" && transcript.id) {
        setPhase("extracting");
        const extRes = await apiRequest("POST", `/api/visits/${visitId}/extract`, {
          transcriptId: transcript.id,
          userId: user?.id,
          userName: user?.fullName,
        });
        const extData = await extRes.json();
        queryClient.invalidateQueries({ queryKey: [`/api/visits/${visitId}/extracted-fields`] });
        setResultMessage(`Extracted ${extData?.count || 0} fields`);
      } else {
        setResultMessage("Transcription complete");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      setPhase("done");
    } catch (err: any) {
      setErrorMessage(err.message || "Processing failed");
      setPhase("error");
    }
  }, [visitId, user, elapsed]);

  const handleClose = useCallback(() => {
    if (phase === "recording" || phase === "paused") {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        mediaRecorderRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
    }
    onClose();
  }, [phase, onClose]);

  if (!open) return null;

  const isProcessing = phase === "saving" || phase === "transcribing" || phase === "extracting";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      data-testid="voice-overlay"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!isProcessing ? handleClose : undefined}
        data-testid="voice-overlay-backdrop"
      />
      <div
        className="relative w-full max-w-md bg-card rounded-t-2xl shadow-lg"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-sm font-semibold">Voice Capture</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={isProcessing}
            data-testid="button-close-voice-overlay"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 flex flex-col items-center gap-5">
          {!hasConsent && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4" />
              <span>Voice consent required</span>
            </div>
          )}

          {hasConsent && !aiReady && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4" />
              <span>AI provider not configured</span>
            </div>
          )}

          {/* Timer */}
          <div className="flex items-center gap-2">
            {(phase === "recording") && (
              <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            )}
            {(phase === "paused") && (
              <span className="w-3 h-3 rounded-full bg-muted-foreground" />
            )}
            <span className="text-4xl font-mono tabular-nums" data-testid="text-overlay-elapsed">
              {formatTime(elapsed)}
            </span>
          </div>

          {/* Controls */}
          {phase === "idle" && (
            <Button
              size="lg"
              onClick={startRecording}
              disabled={!hasConsent || !aiReady}
              className="rounded-full shadow-md"
              style={{ backgroundColor: "#FEA002", borderColor: "#FEA002" }}
              data-testid="button-overlay-start"
            >
              <Mic className="w-5 h-5 mr-2" /> Start Recording
            </Button>
          )}

          {(phase === "recording" || phase === "paused") && (
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={togglePause}
                data-testid="button-overlay-pause"
              >
                {phase === "paused" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={stopRecording}
                data-testid="button-overlay-stop"
              >
                <Square className="w-4 h-4 mr-2" /> Stop & Save
              </Button>
            </div>
          )}

          {/* Processing states */}
          {isProcessing && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground" data-testid="text-overlay-status">
                {phase === "saving" && "Saving recording..."}
                {phase === "transcribing" && "Transcribing audio..."}
                {phase === "extracting" && "Extracting clinical fields..."}
              </span>
            </div>
          )}

          {/* Done */}
          {phase === "done" && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10" style={{ color: "#2E456B" }} />
              <span className="text-sm font-medium" data-testid="text-overlay-result">
                {resultMessage}
              </span>
              <Button onClick={handleClose} data-testid="button-overlay-done">
                Done
              </Button>
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="flex flex-col items-center gap-3">
              <AlertTriangle className="w-10 h-10 text-destructive" />
              <span className="text-sm text-destructive" data-testid="text-overlay-error">
                {errorMessage}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPhase("idle")} data-testid="button-overlay-retry">
                  Try Again
                </Button>
                <Button onClick={handleClose} data-testid="button-overlay-dismiss">
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Phase label */}
          {(phase === "recording" || phase === "paused") && (
            <span className="text-xs text-muted-foreground">
              {phase === "recording" ? "Recording... Tap stop when finished" : "Paused"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
