import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  Mic,
  Square,
  Loader2,
  AlertTriangle,
  Pen,
} from "lucide-react";
import { apiRequest, queryClient, resolveUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { usePlatform } from "@/hooks/use-platform";

type ResponseSource = "manual" | "voice";

function InlineVoiceCapture({
  visitId,
  assessmentId,
  questions,
  onAnswersExtracted,
}: {
  visitId: string;
  assessmentId: string;
  questions: any[];
  onAnswersExtracted: (answers: Record<string, string>, sourceSnippets: Record<string, string>) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const { data: consents } = useQuery<any[]>({ queryKey: [`/api/visits/${visitId}/consents`] });
  const { data: aiStatus } = useQuery<any>({ queryKey: ["/api/ai-providers/active"] });

  const voiceConsent = consents?.find((c: any) => c.consentType === "voice_transcription" && c.status === "granted");
  const hasConsent = !!voiceConsent;
  const aiReady = aiStatus?.configured && aiStatus?.hasKey;

  const autoProcess = useCallback(async (recording: any) => {
    try {
      setProcessingStatus("Transcribing audio...");
      const txRes = await apiRequest("POST", `/api/visits/${visitId}/transcribe`, {
        recordingId: recording.id,
        userId: user?.id,
        userName: user?.fullName,
      });
      const transcript = await txRes.json();

      if (transcript.status === "completed" && transcript.id) {
        setProcessingStatus("Mapping responses to questions...");
        const extRes = await apiRequest("POST", `/api/visits/${visitId}/extract-assessment`, {
          transcriptId: transcript.id,
          assessmentId,
          questions: questions.map((q: any) => ({
            id: q.id,
            text: q.text,
            options: (q.options || []).map((o: any) => ({ value: o.value, label: o.label, score: o.score })),
          })),
          userId: user?.id,
          userName: user?.fullName,
        });
        const extData = await extRes.json();

        if (extData.answers && extData.answers.length > 0) {
          const mapped: Record<string, string> = {};
          const snippets: Record<string, string> = {};
          for (const a of extData.answers) {
            if (a.questionId && a.selectedValue) {
              mapped[a.questionId] = a.selectedValue;
              if (a.sourceSnippet) snippets[a.questionId] = a.sourceSnippet;
            }
          }
          onAnswersExtracted(mapped, snippets);
          toast({
            title: "Voice capture complete",
            description: `Mapped ${extData.count} of ${questions.length} responses from voice`,
          });
        } else {
          toast({ title: "No responses detected", description: "Could not map any responses from the recording. Try speaking more clearly.", variant: "destructive" });
        }
      } else {
        toast({ title: "Transcription issue", description: "No text was transcribed from the recording.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Processing failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessingStatus(null);
    }
  }, [visitId, assessmentId, questions, user, toast, onAnswersExtracted]);

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
      setElapsed(0);
      autoProcess(recording);
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
        if (blob.size > 0) saveMutation.mutate(blob);
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    } catch (err: any) {
      toast({ title: "Microphone access denied", description: "Please allow microphone access to use voice capture.", variant: "destructive" });
    }
  }, [saveMutation, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!hasConsent) {
    return (
      <Card>
        <CardContent className="p-3 flex items-center gap-3 flex-wrap">
          <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground">Voice capture requires patient consent.</span>
          <Link href={`/visits/${visitId}/intake/consents`}>
            <Button variant="outline" size="sm" data-testid="button-goto-consents-assessment">Go to Consents</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!aiReady) {
    return (
      <Card>
        <CardContent className="p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground">AI provider not configured. Voice capture requires an active AI provider.</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-voice-capture">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Mic className="w-4 h-4 flex-shrink-0" style={{ color: isRecording ? "#ef4444" : "#7c3aed" }} />
            <div>
              <span className="text-sm font-semibold">Voice Capture</span>
              <p className="text-xs text-muted-foreground">Read questions aloud and capture patient responses</p>
            </div>
          </div>

          {processingStatus ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#7c3aed" }} />
              <span className="text-sm" style={{ color: "#7c3aed" }}>{processingStatus}</span>
            </div>
          ) : isRecording ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-mono tabular-nums">{formatTime(elapsed)}</span>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={stopRecording}
                data-testid="button-stop-recording"
              >
                <Square className="w-3.5 h-3.5 mr-1" /> Stop
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={startRecording}
              disabled={saveMutation.isPending}
              style={{ backgroundColor: "#7c3aed", borderColor: "#7c3aed" }}
              data-testid="button-start-recording"
            >
              <Mic className="w-3.5 h-3.5 mr-1" /> Record
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SourceIndicator({ source, snippet }: { source: ResponseSource; snippet?: string }) {
  if (source === "voice") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="text-[10px] h-4 no-default-hover-elevate no-default-active-elevate gap-0.5"
            style={{ backgroundColor: "#7c3aed20", color: "#7c3aed", border: "none" }}
            data-testid="badge-voice-source"
          >
            <Mic className="w-2.5 h-2.5" /> Voice
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs font-medium">Voice Captured</p>
          {snippet && <p className="text-xs text-muted-foreground mt-0.5">"{snippet}"</p>}
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          className="text-[10px] h-4 no-default-hover-elevate no-default-active-elevate gap-0.5"
          data-testid="badge-manual-source"
        >
          <Pen className="w-2.5 h-2.5" /> Manual
        </Badge>
      </TooltipTrigger>
      <TooltipContent>Manually entered by NP</TooltipContent>
    </Tooltip>
  );
}

export default function AssessmentRunner() {
  const { isMobileLayout } = usePlatform();
  const [, params] = useRoute("/visits/:id/intake/assessment/:aid");
  const visitId = params?.id;
  const assessmentId = params?.aid;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: definition, isLoading: loadingDef } = useQuery<any>({
    queryKey: ["/api/assessments/definitions", assessmentId],
    enabled: !!assessmentId,
  });

  const { data: existingResponse } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "assessments", assessmentId],
    enabled: !!visitId && !!assessmentId,
  });

  const { data: visitData } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "overview"],
    enabled: !!visitId,
  });

  const checklistItem = useMemo(() => {
    const checklist = visitData?.checklist || [];
    return checklist.find((c: any) => c.itemId === assessmentId);
  }, [visitData, assessmentId]);

  const isDeclined = checklistItem?.status === "unable_to_assess";
  const visitSigned = !!visitData?.visit?.signedAt;
  const visitLocked = !!visitData?.visit?.lockedAt;

  const { data: reasonCodes } = useQuery<any[]>({
    queryKey: ["/api/reason-codes", { category: "unable_to_assess" }],
    queryFn: async () => {
      const res = await fetch(resolveUrl("/api/reason-codes?category=unable_to_assess"));
      if (!res.ok) return [];
      const data = await res.json();
      const declined = await fetch(resolveUrl("/api/reason-codes?category=patient_declined"));
      if (declined.ok) {
        const d = await declined.json();
        return [...data, ...d];
      }
      return data;
    },
  });

  const [responses, setResponses] = useState<Record<string, string>>({});
  const [responseSources, setResponseSources] = useState<Record<string, ResponseSource>>({});
  const [sourceSnippets, setSourceSnippets] = useState<Record<string, string>>({});
  const [unableReason, setUnableReason] = useState("");
  const [unableNote, setUnableNote] = useState("");
  const [showUnableForm, setShowUnableForm] = useState(false);

  useEffect(() => {
    if (existingResponse?.responses) {
      const raw = existingResponse.responses as Record<string, any>;
      const savedSources = raw._sources as Record<string, ResponseSource> | undefined;
      const normalized: Record<string, string> = {};
      const sources: Record<string, ResponseSource> = {};
      for (const [key, val] of Object.entries(raw)) {
        if (key.startsWith("_")) continue;
        if (typeof val === "object" && val !== null && "value" in val) {
          normalized[key] = String(val.value);
        } else if (typeof val === "string" || typeof val === "number") {
          normalized[key] = String(val);
        }
        sources[key] = savedSources?.[key] || "manual";
      }
      setResponses(normalized);
      setResponseSources(sources);
    }
  }, [existingResponse]);

  const questions: any[] = useMemo(() => {
    if (!definition?.questions) return [];
    return Array.isArray(definition.questions) ? definition.questions : [];
  }, [definition]);

  const computedScore = useMemo(() => {
    if (!questions.length) return 0;
    let total = 0;
    questions.forEach((q: any) => {
      const answer = responses[q.id];
      if (answer !== undefined && q.options) {
        const opt = q.options.find((o: any) => o.value === answer);
        if (opt?.score !== undefined) total += opt.score;
      }
    });
    return total;
  }, [responses, questions]);

  const answeredCount = Object.keys(responses).length;
  const voiceCount = Object.values(responseSources).filter(s => s === "voice").length;
  const manualCount = Object.values(responseSources).filter(s => s === "manual").length;
  const progressPct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  const interpretation = useMemo(() => {
    if (!definition?.interpretationBands) return null;
    const bands = definition.interpretationBands as any[];
    for (const band of bands) {
      if (computedScore >= band.min && computedScore <= band.max) {
        return band;
      }
    }
    return null;
  }, [computedScore, definition]);

  const handleVoiceAnswers = useCallback((answers: Record<string, string>, snippets: Record<string, string>) => {
    setResponses(prev => ({ ...prev, ...answers }));
    setResponseSources(prev => {
      const updated = { ...prev };
      for (const key of Object.keys(answers)) {
        updated[key] = "voice";
      }
      return updated;
    });
    setSourceSnippets(prev => ({ ...prev, ...snippets }));
  }, []);

  const handleManualChange = useCallback((questionId: string, value: string) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
    setResponseSources(prev => ({ ...prev, [questionId]: "manual" }));
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (opts: { status: string }) => {
      const responsesWithMeta = { ...responses, _sources: responseSources };
      const res = await apiRequest("POST", `/api/visits/${visitId}/assessments`, {
        instrumentId: assessmentId,
        instrumentVersion: definition?.version || "1.0",
        responses: responsesWithMeta,
        computedScore,
        interpretation: interpretation?.label || null,
        status: opts.status,
      });
      const data = await res.json();

      if (opts.status === "complete") {
        await apiRequest("POST", `/api/visits/${visitId}/evaluate-rules`, {
          source: "assessment",
          data: { instrumentId: assessmentId, score: computedScore },
        });
        await apiRequest("POST", `/api/visits/${visitId}/generate-codes`, {});
      }
      return data;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "tasks"] });
      toast({ title: vars.status === "complete" ? "Assessment completed" : "Draft saved" });
      if (vars.status === "complete" && data?.branchingTriggered?.length > 0) {
        toast({ title: "Follow-up Recommended", description: "Follow-up assessments or referrals have been recommended based on assessment results." });
      }
      if (vars.status === "complete") setLocation(`/visits/${visitId}/intake`);
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const unableMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/visits/${visitId}/assessments/unable`, {
        instrumentId: assessmentId,
        reason: unableReason,
        note: unableNote,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId] });
      toast({ title: "Marked as unable to assess" });
      setLocation(`/visits/${visitId}/intake`);
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const revertDeclineMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/visits/${visitId}/assessments/revert-decline`, {
        instrumentId: assessmentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      toast({ title: "Decline reverted - you can now complete this assessment" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to revert", description: err.message, variant: "destructive" });
    },
  });

  if (loadingDef) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!definition) {
    return (
      <div className="space-y-6">
        <Link href={`/visits/${visitId}/intake`}>
          <Button variant="ghost" size="sm"><ChevronLeft className="w-4 h-4 mr-1" /> Intake</Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <AlertCircle className="w-10 h-10 mb-3 text-muted-foreground opacity-40" />
            <span className="text-sm text-muted-foreground">Assessment definition not found</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isMobileLayout ? "pb-20 px-4" : ""}`}>
      {isMobileLayout ? (
        <h1 className="text-lg font-bold px-4 pt-2" data-testid="text-assessment-title">{definition.name}</h1>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/visits/${visitId}/intake`}>
            <Button variant="ghost" size="sm" data-testid="button-back-intake">
              <ChevronLeft className="w-4 h-4 mr-1" /> Intake
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-assessment-title">{definition.name}</h1>
            <p className="text-sm text-muted-foreground">Version {definition.version} - {definition.category}</p>
          </div>
        </div>
      )}

      {isDeclined && (
        <Card data-testid="card-decline-info">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" style={{ color: "#E74C3C" }} />
                <span className="text-sm font-semibold" style={{ color: "#E74C3C" }}>
                  Assessment Declined
                </span>
              </div>
              {!visitSigned && !visitLocked && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => revertDeclineMutation.mutate()}
                  disabled={revertDeclineMutation.isPending}
                  data-testid="button-revert-decline"
                >
                  {revertDeclineMutation.isPending ? "Reverting..." : "Revert & Complete Assessment"}
                </Button>
              )}
            </div>
            <div className="space-y-1 ml-6">
              {checklistItem?.unableToAssessReason && (
                <p className="text-sm" data-testid="text-decline-reason">
                  <span className="text-muted-foreground">Reason:</span> {checklistItem.unableToAssessReason}
                </p>
              )}
              {checklistItem?.unableToAssessNote && (
                <p className="text-sm" data-testid="text-decline-note">
                  <span className="text-muted-foreground">Notes:</span> {checklistItem.unableToAssessNote}
                </p>
              )}
              {checklistItem?.completedAt && (
                <p className="text-xs text-muted-foreground" data-testid="text-decline-date">
                  Declined on {new Date(checklistItem.completedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            {visitSigned && (
              <p className="text-xs text-muted-foreground ml-6">
                This visit has been signed. Decline cannot be changed.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Progress</span>
            <div className="flex items-center gap-2">
              {voiceCount > 0 && (
                <span className="text-[10px] flex items-center gap-0.5" style={{ color: "#7c3aed" }}>
                  <Mic className="w-2.5 h-2.5" /> {voiceCount}
                </span>
              )}
              {manualCount > 0 && (
                <span className="text-[10px] flex items-center gap-0.5 text-muted-foreground">
                  <Pen className="w-2.5 h-2.5" /> {manualCount}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{answeredCount}/{questions.length}</span>
            </div>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
        <Card className="flex-shrink-0">
          <CardContent className="p-3 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Score:</span>
            <span className="text-xl font-bold" data-testid="text-assessment-score">{computedScore}</span>
            {interpretation && (
              <Badge variant={interpretation.severity === "severe" ? "destructive" : "secondary"} className="text-xs">
                {interpretation.label}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {visitId && assessmentId && (
        <InlineVoiceCapture
          visitId={visitId}
          assessmentId={assessmentId}
          questions={questions}
          onAnswersExtracted={handleVoiceAnswers}
        />
      )}

      <div className="space-y-4">
        {questions.map((q: any, idx: number) => {
          const source = responseSources[q.id];
          const hasResponse = responses[q.id] !== undefined;
          const isVoice = source === "voice";

          return (
            <Card key={q.id} style={isVoice ? { borderColor: "#7c3aed30" } : undefined}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-muted-foreground flex-shrink-0 mt-0.5">
                      Q{idx + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label className="text-sm font-medium leading-snug">{q.text}</Label>
                        {hasResponse && source && (
                          <SourceIndicator source={source} snippet={sourceSnippets[q.id]} />
                        )}
                      </div>
                    </div>
                  </div>
                  <RadioGroup
                    value={responses[q.id] || ""}
                    onValueChange={(val) => handleManualChange(q.id, val)}
                    className="space-y-2 pl-6"
                  >
                    {(q.options || []).map((opt: any) => (
                      <div key={opt.value} className="flex items-center gap-2">
                        <RadioGroupItem value={opt.value} id={`${q.id}-${opt.value}`} data-testid={`radio-${q.id}-${opt.value}`} />
                        <Label htmlFor={`${q.id}-${opt.value}`} className="text-sm cursor-pointer">
                          {opt.label}
                          {opt.score !== undefined && (
                            <span className="text-xs text-muted-foreground ml-1">({opt.score})</span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showUnableForm ? (
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-sm font-semibold">Unable to Assess</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={unableReason} onValueChange={setUnableReason}>
                <SelectTrigger data-testid="select-unable-reason">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {(reasonCodes || []).map((r: any) => (
                    <SelectItem key={r.id} value={r.label}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional Notes (optional)</Label>
              <Textarea value={unableNote} onChange={(e) => setUnableNote(e.target.value)} data-testid="input-unable-note" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setShowUnableForm(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => unableMutation.mutate()}
                disabled={!unableReason || unableMutation.isPending}
                data-testid="button-confirm-unable"
              >
                {unableMutation.isPending ? "Saving..." : "Confirm Unable to Assess"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={`flex ${isMobileLayout ? "flex-col" : "items-center justify-between"} gap-3 flex-wrap`}>
          <Button className={isMobileLayout ? "w-full" : ""} variant="outline" onClick={() => setShowUnableForm(true)} data-testid="button-unable-to-assess">
            Unable to Assess
          </Button>
          <div className={`flex gap-2 ${isMobileLayout ? "flex-col" : "flex-wrap"}`}>
            <Button
              className={isMobileLayout ? "w-full" : ""}
              variant="outline"
              onClick={() => saveMutation.mutate({ status: "in_progress" })}
              disabled={saveMutation.isPending}
              data-testid="button-save-draft"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              className={isMobileLayout ? "w-full" : ""}
              onClick={() => saveMutation.mutate({ status: "complete" })}
              disabled={answeredCount < questions.length || saveMutation.isPending}
              data-testid="button-complete-assessment"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Complete Assessment"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
