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
  HeartPulse,
  ClipboardList,
  Target,
  Pill,
  Stethoscope,
  ListChecks,
  CircleDot,
  Brain,
  Users,
  type LucideIcon,
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
  const { data: overview } = useQuery<any>({ queryKey: ["/api/visits", visitId, "overview"] });

  const [activeTab, setActiveTab] = useState("record");
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
            onProcessingComplete={() => setActiveTab("review")}
            overview={overview}
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

interface DiscussionItem {
  id: string;
  label: string;
  icon: LucideIcon;
  category: string;
  prompts: string[];
  done?: boolean;
}

function buildDiscussionItems(overview: any): DiscussionItem[] {
  if (!overview) return [];
  const items: DiscussionItem[] = [];
  const checklist = overview.checklist || [];
  const vitals = overview.vitals;
  const assessmentItems = checklist.filter((c: any) => c.itemType === "assessment");
  const measureItems = checklist.filter((c: any) => c.itemType === "measure");
  const medRecon = overview.medRecon || [];

  items.push({
    id: "vitals",
    label: "Vitals & Physical Exam",
    icon: HeartPulse,
    category: "vitals",
    done: !!vitals,
    prompts: [
      "Blood pressure (systolic / diastolic)",
      "Heart rate",
      "Respiratory rate",
      "Temperature",
      "Oxygen saturation (SpO2)",
      "Weight / Height / BMI",
      "Pain level (0-10)",
      "General physical exam findings",
    ],
  });

  items.push({
    id: "medications",
    label: "Medication Reconciliation",
    icon: Pill,
    category: "medication",
    done: medRecon.length > 0,
    prompts: [
      "Review current medications",
      "New medications started",
      "Medications discontinued",
      "Medication adherence concerns",
      "Over-the-counter supplements",
      "Side effects reported",
    ],
  });

  for (const a of assessmentItems) {
    const isPhq2 = (a.itemId || "").toLowerCase().includes("phq") && (a.itemId || "").includes("2");
    const isPhq9 = (a.itemId || "").toLowerCase().includes("phq") && (a.itemId || "").includes("9");
    const isPrapare = (a.itemId || "").toLowerCase().includes("prapare");
    const isAwv = (a.itemId || "").toLowerCase().includes("awv");

    let prompts: string[] = [];
    if (isPhq2) {
      prompts = [
        "Little interest or pleasure in doing things (frequency over last 2 weeks)",
        "Feeling down, depressed, or hopeless (frequency over last 2 weeks)",
      ];
    } else if (isPhq9) {
      prompts = [
        "Mood and depression screening (9 items)",
        "Interest in activities, sleep, appetite, energy, concentration",
        "Thoughts of self-harm (safety screening)",
      ];
    } else if (isPrapare) {
      prompts = [
        "Housing stability and living situation",
        "Education level and employment",
        "Food insecurity and transportation needs",
        "Social support and isolation",
      ];
    } else if (isAwv) {
      prompts = [
        "Health risk assessment",
        "Functional ability and safety",
        "Fall risk screening",
        "Advance care planning discussion",
        "Preventive services review",
      ];
    } else {
      prompts = [`Complete ${a.itemName || a.itemId} assessment`, "Document responses and scoring"];
    }

    items.push({
      id: `assessment-${a.itemId}`,
      label: a.itemName || a.itemId,
      icon: ClipboardList,
      category: "assessment",
      done: a.status === "complete" || a.status === "unable_to_assess",
      prompts,
    });
  }

  for (const m of measureItems) {
    const mid = (m.itemId || "").toUpperCase();
    let prompts: string[] = [];
    if (mid === "BCS") {
      prompts = ["Breast cancer screening - last mammogram date", "Results and follow-up"];
    } else if (mid === "COL") {
      prompts = ["Colorectal cancer screening - last colonoscopy/FIT date", "Results and follow-up"];
    } else if (mid === "CBP") {
      prompts = ["Blood pressure control - confirm latest reading", "Medication compliance"];
    } else if (mid.includes("CDC") || mid.includes("A1C")) {
      prompts = ["Diabetes care - HbA1c, eye exam, kidney screening", "Foot exam findings"];
    } else {
      prompts = [`Document ${m.itemName || m.itemId} measure`, "Evidence source and findings"];
    }

    items.push({
      id: `measure-${m.itemId}`,
      label: m.itemName || m.itemId,
      icon: Target,
      category: "hedis",
      done: m.status === "complete" || m.status === "unable_to_assess",
      prompts,
    });
  }

  items.push({
    id: "conditions",
    label: "Conditions & Diagnoses",
    icon: Stethoscope,
    category: "condition",
    prompts: [
      "Chronic conditions - status updates",
      "New symptoms or complaints",
      "Condition management changes",
    ],
  });

  items.push({
    id: "social",
    label: "Social & Functional Status",
    icon: Users,
    category: "social",
    prompts: [
      "ADL / IADL functional status",
      "Caregiver support",
      "Home safety concerns",
    ],
  });

  items.push({
    id: "plan",
    label: "Care Plan & Follow-Up",
    icon: ListChecks,
    category: "plan",
    prompts: [
      "Referrals needed",
      "Lab orders",
      "Follow-up visit scheduling",
      "Patient education provided",
    ],
  });

  return items;
}

function DiscussionPrompts({ overview }: { overview: any }) {
  const items = buildDiscussionItems(overview);
  const [collapsed, setCollapsed] = useState(false);

  if (items.length === 0) return null;

  const completedCount = items.filter(i => i.done).length;
  const totalItems = items.length;

  return (
    <Card data-testid="card-discussion-prompts">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Discussion Prompts</span>
            <Badge variant="secondary" className="text-xs">
              {completedCount}/{totalItems} captured
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} data-testid="button-toggle-prompts">
            {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </Button>
        </div>

        {!collapsed && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Use this checklist as a guide while recording. Mention each item to ensure complete clinical documentation.
            </p>
            <div className="grid gap-2">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className={`rounded-md border p-3 space-y-1.5 ${item.done ? "opacity-60" : ""}`}
                    data-testid={`prompt-group-${item.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.done && (
                        <Badge variant="default" className="text-xs ml-auto">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Done
                        </Badge>
                      )}
                    </div>
                    <ul className="ml-6 space-y-0.5">
                      {item.prompts.map((prompt, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CircleDot className="w-2.5 h-2.5 mt-1 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">{prompt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecordingPanel({ visitId, hasConsent, user, recordings, isLoading, onProcessingComplete, overview }: any) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const autoProcessRecording = useCallback(async (recording: any) => {
    try {
      setProcessingStatus("Transcribing...");
      const txRes = await apiRequest("POST", `/api/visits/${visitId}/transcribe`, {
        recordingId: recording.id,
        userId: user?.id,
        userName: user?.fullName,
      });
      const transcript = await txRes.json();
      queryClient.invalidateQueries({ queryKey: [`/api/visits/${visitId}/transcripts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/visits/${visitId}/recordings`] });

      if (transcript.status === "completed" && transcript.id) {
        setProcessingStatus("Extracting fields...");
        const extRes = await apiRequest("POST", `/api/visits/${visitId}/extract`, {
          transcriptId: transcript.id,
          userId: user?.id,
          userName: user?.fullName,
        });
        const extData = await extRes.json();
        queryClient.invalidateQueries({ queryKey: [`/api/visits/${visitId}/extracted-fields`] });
        toast({ title: "Processing complete", description: `Transcribed and extracted ${extData?.count || 0} fields` });
        onProcessingComplete?.();
      } else {
        toast({ title: "Transcription complete", description: "No fields to extract" });
      }
    } catch (err: any) {
      toast({ title: "Auto-processing failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessingStatus(null);
    }
  }, [visitId, user, toast, onProcessingComplete]);

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
      const res = await apiRequest("POST", `/api/visits/${visitId}/recordings`, {
        recordedBy: user?.id,
        recordedByName: user?.fullName,
        mimeType: audioBlob.type,
        durationSec: Math.round(elapsed),
        audioData: base64,
      });
      return res.json();
    },
    onSuccess: (recording) => {
      queryClient.invalidateQueries({ queryKey: [`/api/visits/${visitId}/recordings`] });
      toast({ title: "Recording saved, processing..." });
      setElapsed(0);
      autoProcessRecording(recording);
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
                disabled={!hasConsent || saveMutation.isPending || !!processingStatus}
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
          {(saveMutation.isPending || processingStatus) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-processing-status">
              <Loader2 className="w-3 h-3 animate-spin" /> {processingStatus || "Saving recording..."}
            </div>
          )}
          {!hasConsent && (
            <p className="text-xs text-muted-foreground text-center">
              Voice transcription consent must be granted before recording
            </p>
          )}
        </CardContent>
      </Card>

      <DiscussionPrompts overview={overview} />

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
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "bundle"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "bundle"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      toast({ title: "Fields accepted and applied to forms" });
    },
    onError: (err: any) => {
      toast({ title: "Bulk accept failed", description: err.message, variant: "destructive" });
    },
  });

  const pendingFields = fields.filter((f: any) => f.status === "pending");
  const acceptedFields = fields.filter((f: any) => f.status === "accepted");
  const rejectedFields = fields.filter((f: any) => f.status === "rejected");

  const categoryConfig: Record<string, { label: string; icon: LucideIcon; order: number }> = {
    vitals: { label: "Vitals & Physical Exam", icon: HeartPulse, order: 1 },
    assessment: { label: "Clinical Assessments", icon: ClipboardList, order: 2 },
    medication: { label: "Medications", icon: Pill, order: 3 },
    condition: { label: "Conditions & Diagnoses", icon: Stethoscope, order: 4 },
    social: { label: "Social & Functional", icon: Users, order: 5 },
    plan: { label: "Care Plan & Follow-Up", icon: ListChecks, order: 6 },
    other: { label: "Other Findings", icon: Brain, order: 7 },
  };

  const categories = (Array.from(new Set(fields.map((f: any) => f.category || "other"))) as string[])
    .sort((a: string, b: string) => (categoryConfig[a]?.order || 99) - (categoryConfig[b]?.order || 99));

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
        const config = categoryConfig[cat] || categoryConfig.other;
        const CatIcon = config.icon;
        const catPending = catFields.filter((f: any) => f.status === "pending").length;
        const catAccepted = catFields.filter((f: any) => f.status === "accepted" || f.status === "edited").length;

        return (
          <Card key={cat} data-testid={`card-category-${cat}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CatIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{config.label}</span>
                  <Badge variant="secondary" className="text-xs">{catFields.length} field{catFields.length !== 1 ? "s" : ""}</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  {catAccepted > 0 && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">{catAccepted} accepted</span>
                  )}
                  {catPending > 0 && (
                    <span className="text-xs text-muted-foreground">{catPending} pending</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ExtractedFieldRow({ field, onAccept, onReject, onEdit, isPending }: any) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(field.editedValue || field.proposedValue || "");

  const confidenceColor = field.confidence >= 0.8 ? "text-green-600 dark:text-green-400" :
    field.confidence >= 0.5 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  const statusIcon = field.status === "accepted" || field.status === "edited"
    ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
    : field.status === "rejected"
    ? <XCircle className="w-4 h-4 text-destructive" />
    : null;

  return (
    <Card data-testid={`card-field-${field.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {statusIcon}
              <span className="text-sm font-semibold" data-testid={`text-field-label-${field.id}`}>{field.fieldLabel}</span>
              <span className={`text-xs font-mono ${confidenceColor}`}>
                {Math.round((field.confidence || 0) * 100)}% confidence
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
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="font-mono text-sm flex-1"
                  autoFocus
                  data-testid={`input-field-edit-${field.id}`}
                />
                <Button
                  size="sm"
                  onClick={() => { onEdit(editValue); setEditing(false); }}
                  disabled={isPending}
                  data-testid={`button-save-edit-${field.id}`}
                >
                  <Check className="w-3 h-3 mr-1" /> Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEditValue(field.editedValue || field.proposedValue || ""); }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="bg-muted px-3 py-1.5 rounded-md flex-1">
                  <span className="text-base font-mono font-medium" data-testid={`text-field-value-${field.id}`}>
                    {field.editedValue || field.proposedValue}
                  </span>
                  {field.unit && <span className="text-sm text-muted-foreground ml-1">{field.unit}</span>}
                </div>
                {(field.status === "pending" || field.status === "accepted" || field.status === "edited") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(true)}
                    disabled={isPending}
                    data-testid={`button-edit-field-${field.id}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            {field.sourceSnippet && (
              <p className="text-xs text-muted-foreground italic">
                Source: &ldquo;{field.sourceSnippet.substring(0, 150)}{field.sourceSnippet.length > 150 ? "..." : ""}&rdquo;
              </p>
            )}
          </div>

          {field.status === "pending" && (
            <div className="flex flex-col gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onAccept}
                disabled={isPending}
                className="text-green-600 dark:text-green-400"
                data-testid={`button-accept-field-${field.id}`}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" /> Accept
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onReject}
                disabled={isPending}
                className="text-destructive"
                data-testid={`button-reject-field-${field.id}`}
              >
                <XCircle className="w-3 h-3 mr-1" /> Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
