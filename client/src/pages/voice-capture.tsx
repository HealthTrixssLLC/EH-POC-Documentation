import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import {
  Mic,
  Square,
  Pause,
  Play,
  FileText,
  Wand2,
  CheckCircle2,
  XCircle,
  Edit3,
  ArrowLeft,
  Clock,
  AlertTriangle,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function VoiceCapture() {
  const params = useParams<{ id: string }>();
  const visitId = params.id!;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: consents } = useQuery<any[]>({ queryKey: [`/api/visits/${visitId}/consents`] });
  const { data: recordings, isLoading: loadingRecordings } = useQuery<any[]>({ queryKey: [`/api/visits/${visitId}/recordings`] });
  const { data: txs, isLoading: loadingTxs } = useQuery<any[]>({ queryKey: [`/api/visits/${visitId}/transcripts`] });
  const { data: extractedFields, isLoading: loadingFields } = useQuery<any[]>({ queryKey: [`/api/visits/${visitId}/extracted-fields`] });
  const { data: aiStatus } = useQuery<any>({ queryKey: ["/api/ai-providers/active"] });

  const voiceConsent = consents?.find((c: any) => c.consentType === "voice_transcription" && c.status === "granted");
  const hasConsent = !!voiceConsent;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/visits/${visitId}/intake`)} data-testid="button-back-to-intake">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-voice-title">Voice Capture</h1>
          <p className="text-sm text-muted-foreground">Record clinical notes, transcribe, and extract structured data</p>
        </div>
      </div>

      {!hasConsent && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <ShieldCheck className="w-5 h-5 text-muted-foreground" />
              <div>
                <span className="text-sm font-semibold">Voice Transcription Consent Required</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Voice recording requires patient consent. Navigate to NOPP & Consents to grant consent before recording.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setLocation(`/visits/${visitId}/intake/consents`)} data-testid="button-goto-consents">
                Go to Consents
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!aiStatus?.configured && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">AI provider not configured. Transcription and extraction require an active AI provider.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {aiStatus?.configured && !aiStatus?.hasKey && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                AI API key not found. Set the <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{aiStatus?.provider?.apiKeySecretName}</code> secret.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="record">
        <TabsList className="flex-wrap">
          <TabsTrigger value="record" data-testid="tab-record">
            <Mic className="w-3 h-3 mr-1" /> Record
          </TabsTrigger>
          <TabsTrigger value="transcripts" data-testid="tab-transcripts">
            <FileText className="w-3 h-3 mr-1" /> Transcripts
            {txs?.length ? <Badge variant="secondary" className="ml-1 text-xs">{txs.length}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="review" data-testid="tab-review">
            <Wand2 className="w-3 h-3 mr-1" /> Extracted Fields
            {extractedFields?.length ? <Badge variant="secondary" className="ml-1 text-xs">{extractedFields.length}</Badge> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="record" className="mt-4">
          <RecordingPanel
            visitId={visitId}
            hasConsent={hasConsent}
            user={user}
            recordings={recordings || []}
            isLoading={loadingRecordings}
          />
        </TabsContent>

        <TabsContent value="transcripts" className="mt-4">
          <TranscriptsPanel
            visitId={visitId}
            transcripts={txs || []}
            recordings={recordings || []}
            isLoading={loadingTxs}
            user={user}
            aiConfigured={aiStatus?.configured && aiStatus?.hasKey}
          />
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <ExtractedFieldsPanel
            visitId={visitId}
            fields={extractedFields || []}
            transcripts={txs || []}
            isLoading={loadingFields}
            user={user}
            aiConfigured={aiStatus?.configured && aiStatus?.hasKey}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecordingPanel({ visitId, hasConsent, user, recordings, isLoading }: any) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const saveMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(audioBlob);
      });
      return apiRequest("POST", `/api/visits/${visitId}/recordings`, {
        recordedBy: user?.id,
        recordedByName: user?.fullName,
        mimeType: audioBlob.type,
        durationSec: Math.round(elapsed),
        audioData: base64,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/visits/${visitId}/recordings`] });
      toast({ title: "Recording saved" });
      setElapsed(0);
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(t => t.stop());
        if (blob.size > 0) {
          saveMutation.mutate(blob);
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    } catch (err: any) {
      toast({ title: "Microphone access denied", description: "Please allow microphone access to record.", variant: "destructive" });
    }
  }, [visitId, user, toast, saveMutation]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now() - elapsed * 1000;
      timerRef.current = setInterval(() => {
        setElapsed((Date.now() - startTimeRef.current) / 1000);
      }, 100);
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPaused(true);
    }
  }, [isPaused, elapsed]);

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

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            {isRecording && (
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            )}
            <span className="text-2xl font-mono tabular-nums" data-testid="text-elapsed-time">
              {formatTime(elapsed)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <Button
                size="lg"
                onClick={startRecording}
                disabled={!hasConsent || saveMutation.isPending}
                data-testid="button-start-recording"
              >
                <Mic className="w-4 h-4 mr-2" /> Start Recording
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={togglePause}
                  data-testid="button-pause-resume"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={stopRecording}
                  data-testid="button-stop-recording"
                >
                  <Square className="w-4 h-4 mr-2" /> Stop & Save
                </Button>
              </>
            )}
          </div>
          {saveMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving recording...
            </div>
          )}
          {!hasConsent && (
            <p className="text-xs text-muted-foreground text-center">
              Voice transcription consent must be granted before recording
            </p>
          )}
        </CardContent>
      </Card>

      <div>
        <span className="text-sm font-semibold">Previous Recordings</span>
        {isLoading ? (
          <div className="space-y-2 mt-2">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : recordings.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-2">No recordings yet</p>
        ) : (
          <div className="space-y-2 mt-2">
            {recordings.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3 h-3 text-muted-foreground" />
                    <div>
                      <span className="text-xs font-medium" data-testid={`text-recording-${r.id}`}>
                        {r.recordedByName || "NP"} - {r.durationSec ? `${Math.round(r.durationSec)}s` : "Unknown duration"}
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={r.status === "transcribed" ? "default" : "secondary"} className="text-xs">
                      {r.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TranscriptsPanel({ visitId, transcripts, recordings, isLoading, user, aiConfigured }: any) {
  const { toast } = useToast();

  const transcribeMutation = useMutation({
    mutationFn: async (recordingId: string) => {
      const res = await apiRequest("POST", `/api/visits/${visitId}/transcribe`, {
        recordingId,
        userId: user?.id,
        userName: user?.fullName,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/visits/${visitId}/transcripts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/visits/${visitId}/recordings`] });
      toast({ title: "Transcription complete" });
    },
    onError: (err: any) => {
      toast({ title: "Transcription failed", description: err.message, variant: "destructive" });
    },
  });

  const extractMutation = useMutation({
    mutationFn: async (transcriptId: string) => {
      const res = await apiRequest("POST", `/api/visits/${visitId}/extract`, {
        transcriptId,
        userId: user?.id,
        userName: user?.fullName,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/visits/${visitId}/extracted-fields`] });
      toast({ title: `${data?.count || 0} fields extracted` });
    },
    onError: (err: any) => {
      toast({ title: "Extraction failed", description: err.message, variant: "destructive" });
    },
  });

  const pendingRecordings = recordings.filter((r: any) => r.status === "completed");

  return (
    <div className="space-y-4">
      {pendingRecordings.length > 0 && aiConfigured && (
        <Card>
          <CardContent className="p-4">
            <span className="text-sm font-semibold">Ready for Transcription</span>
            <div className="space-y-2 mt-2">
              {pendingRecordings.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {r.recordedByName} - {r.durationSec ? `${Math.round(r.durationSec)}s` : "?"} ({r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : ""})
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => transcribeMutation.mutate(r.id)}
                    disabled={transcribeMutation.isPending}
                    data-testid={`button-transcribe-${r.id}`}
                  >
                    {transcribeMutation.isPending ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Transcribing...</>
                    ) : (
                      <><FileText className="w-3 h-3 mr-1" /> Transcribe</>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
      ) : transcripts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
            <FileText className="w-8 h-8 mb-2 opacity-40" />
            <span className="text-sm">No transcripts yet</span>
            <span className="text-xs mt-1">Record and transcribe to see results here</span>
          </CardContent>
        </Card>
      ) : (
        transcripts.map((t: any) => (
          <TranscriptCard
            key={t.id}
            transcript={t}
            onExtract={() => extractMutation.mutate(t.id)}
            extractPending={extractMutation.isPending}
            aiConfigured={aiConfigured}
          />
        ))
      )}
    </div>
  );
}

function TranscriptCard({ transcript, onExtract, extractPending, aiConfigured }: any) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card data-testid={`card-transcript-${transcript.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Transcript</span>
            <Badge variant={transcript.status === "completed" ? "default" : "secondary"} className="text-xs">
              {transcript.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {transcript.status === "completed" && aiConfigured && (
              <Button
                size="sm"
                variant="outline"
                onClick={onExtract}
                disabled={extractPending}
                data-testid={`button-extract-${transcript.id}`}
              >
                {extractPending ? (
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Extracting...</>
                ) : (
                  <><Wand2 className="w-3 h-3 mr-1" /> Extract Fields</>
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <>
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span><Clock className="w-3 h-3 inline mr-1" />{transcript.createdAt ? new Date(transcript.createdAt).toLocaleString() : ""}</span>
              {transcript.model && <span>Model: {transcript.model}</span>}
              {transcript.providerType && <span>Provider: {transcript.providerType}</span>}
            </div>
            {transcript.status === "completed" && transcript.text ? (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm whitespace-pre-wrap leading-relaxed" data-testid={`text-transcript-content-${transcript.id}`}>
                  {transcript.text}
                </p>
              </div>
            ) : transcript.status === "error" ? (
              <div className="p-3 bg-destructive/10 rounded-md flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">{transcript.errorMessage || "Transcription failed"}</span>
              </div>
            ) : transcript.status === "processing" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Processing...
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ExtractedFieldsPanel({ visitId, fields, transcripts, isLoading, user, aiConfigured }: any) {
  const { toast } = useToast();

  const updateFieldMutation = useMutation({
    mutationFn: async ({ fieldId, updates }: { fieldId: string; updates: any }) => {
      return apiRequest("PATCH", `/api/extracted-fields/${fieldId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/visits/${visitId}/extracted-fields`] });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const bulkAcceptMutation = useMutation({
    mutationFn: async (fieldIds: string[]) => {
      return apiRequest("POST", `/api/visits/${visitId}/extracted-fields/bulk-accept`, {
        fieldIds,
        acceptedBy: user?.id,
        acceptedByName: user?.fullName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/visits/${visitId}/extracted-fields`] });
      toast({ title: "Fields accepted" });
    },
    onError: (err: any) => {
      toast({ title: "Bulk accept failed", description: err.message, variant: "destructive" });
    },
  });

  const pendingFields = fields.filter((f: any) => f.status === "pending");
  const acceptedFields = fields.filter((f: any) => f.status === "accepted");
  const rejectedFields = fields.filter((f: any) => f.status === "rejected");

  const categories = Array.from(new Set(fields.map((f: any) => f.category || "other"))).sort() as string[];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
          <Wand2 className="w-8 h-8 mb-2 opacity-40" />
          <span className="text-sm">No extracted fields yet</span>
          <span className="text-xs mt-1">Transcribe a recording and extract fields to review them here</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs" data-testid="badge-pending-count">{pendingFields.length} pending</Badge>
          <Badge variant="default" className="text-xs" data-testid="badge-accepted-count">{acceptedFields.length} accepted</Badge>
          {rejectedFields.length > 0 && <Badge variant="outline" className="text-xs">{rejectedFields.length} rejected</Badge>}
        </div>
        {pendingFields.length > 0 && (
          <Button
            size="sm"
            onClick={() => bulkAcceptMutation.mutate(pendingFields.map((f: any) => f.id))}
            disabled={bulkAcceptMutation.isPending}
            data-testid="button-bulk-accept"
          >
            {bulkAcceptMutation.isPending ? (
              <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Accepting...</>
            ) : (
              <><CheckCircle2 className="w-3 h-3 mr-1" /> Accept All ({pendingFields.length})</>
            )}
          </Button>
        )}
      </div>

      {categories.map((cat) => {
        const catFields = fields.filter((f: any) => (f.category || "other") === cat);
        return (
          <div key={cat}>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat}</span>
            <div className="space-y-1 mt-1">
              {catFields.map((field: any) => (
                <ExtractedFieldRow
                  key={field.id}
                  field={field}
                  onAccept={() => updateFieldMutation.mutate({
                    fieldId: field.id,
                    updates: { status: "accepted", acceptedBy: user?.id, acceptedByName: user?.fullName },
                  })}
                  onReject={() => updateFieldMutation.mutate({
                    fieldId: field.id,
                    updates: { status: "rejected" },
                  })}
                  onEdit={(editedValue: string) => updateFieldMutation.mutate({
                    fieldId: field.id,
                    updates: { status: "edited", editedValue, acceptedBy: user?.id, acceptedByName: user?.fullName },
                  })}
                  isPending={updateFieldMutation.isPending}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExtractedFieldRow({ field, onAccept, onReject, onEdit, isPending }: any) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(field.proposedValue || "");

  const confidenceColor = field.confidence >= 0.8 ? "text-green-600 dark:text-green-400" :
    field.confidence >= 0.5 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  return (
    <Card data-testid={`card-field-${field.id}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold" data-testid={`text-field-label-${field.id}`}>{field.fieldLabel}</span>
              <span className={`text-xs font-mono ${confidenceColor}`}>
                {Math.round((field.confidence || 0) * 100)}%
              </span>
              <Badge
                variant={field.status === "accepted" || field.status === "edited" ? "default" : field.status === "rejected" ? "destructive" : "secondary"}
                className="text-xs"
                data-testid={`badge-field-status-${field.id}`}
              >
                {field.status}
              </Badge>
            </div>
            {editing ? (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="text-xs font-mono"
                  data-testid={`input-field-edit-${field.id}`}
                />
                <Button
                  size="sm"
                  onClick={() => { onEdit(editValue); setEditing(false); }}
                  disabled={isPending}
                  data-testid={`button-save-edit-${field.id}`}
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <span className="text-sm font-mono" data-testid={`text-field-value-${field.id}`}>
                {field.editedValue || field.proposedValue}
              </span>
            )}
            {field.sourceSnippet && (
              <span className="text-xs text-muted-foreground mt-0.5 italic">
                &ldquo;{field.sourceSnippet.substring(0, 120)}{field.sourceSnippet.length > 120 ? "..." : ""}&rdquo;
              </span>
            )}
          </div>
          {field.status === "pending" && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onAccept}
                disabled={isPending}
                data-testid={`button-accept-field-${field.id}`}
              >
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing(true)}
                disabled={isPending}
                data-testid={`button-edit-field-${field.id}`}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onReject}
                disabled={isPending}
                data-testid={`button-reject-field-${field.id}`}
              >
                <XCircle className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
