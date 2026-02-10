import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ShieldCheck,
  HeartPulse,
  ClipboardList,
  Target,
  FileText,
  CheckCircle2,
  Circle,
  ArrowRight,
  AlertCircle,
  Activity,
  Pill,
  Plus,
  Clock,
  AlertTriangle,
  User,
  Clipboard,
  Lightbulb,
  Copy,
  Check,
  ExternalLink,
  Ban,
  XCircle,
  Trash2,
  Lock,
  Mic,
  Download,
  History,
  Pen,
  ChevronDown,
  ChevronUp,
  FileCheck,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import type { ReasonCode, VisitAlert } from "@shared/schema";

const taskTypes = [
  { value: "referral", label: "Referral" },
  { value: "follow_up", label: "Follow-Up" },
  { value: "lab_order", label: "Lab Order" },
  { value: "medication", label: "Medication" },
  { value: "social_services", label: "Social Services" },
  { value: "other", label: "Other" },
];

const priorityColors: Record<string, string> = {
  low: "#277493",
  medium: "#FEA002",
  high: "#E74C3C",
  urgent: "#E74C3C",
};

const statusIcons: Record<string, any> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
};

const stepIcons: Record<string, any> = {
  identity: ShieldCheck,
  vitals: HeartPulse,
  assessments: ClipboardList,
  measures: Target,
  medications: Pill,
  timeline: Activity,
  careplan: FileText,
};

export default function IntakeDashboard() {
  const [, params] = useRoute("/visits/:id/intake");
  const visitId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exclusionDialog, setExclusionDialog] = useState<{ open: boolean; objectiveKey: string; objectiveLabel: string }>({ open: false, objectiveKey: "", objectiveLabel: "" });
  const [exclusionReason, setExclusionReason] = useState("");
  const [exclusionNotes, setExclusionNotes] = useState("");
  const [noteCopied, setNoteCopied] = useState(false);
  const [editHistoryOpen, setEditHistoryOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    taskType: "follow_up",
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
  });

  const { data: overview, isLoading } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "overview"],
    enabled: !!visitId,
  });

  const { data: reasonCodesData } = useQuery<ReasonCode[]>({
    queryKey: ["/api/reason-codes"],
  });

  const exclusionReasonOptions = (reasonCodesData || []).filter(
    (rc) => rc.category === "unable_to_assess" || rc.category === "patient_declined" || rc.category === "environmental"
  );

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/visits/${visitId}/tasks`, {
        ...newTask,
        memberId: overview?.member?.id,
        visitId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      toast({ title: "Task created" });
      setDialogOpen(false);
      setNewTask({ taskType: "follow_up", title: "", description: "", priority: "medium", dueDate: "" });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const dismissRecMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/recommendations/${id}`, { status: "dismissed", dismissReason: "Reviewed and noted" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
    },
  });

  const createExclusionMutation = useMutation({
    mutationFn: async (data: { objectiveKey: string; objectiveLabel: string; reason: string; notes: string }) => {
      await apiRequest("POST", `/api/visits/${visitId}/exclusions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      toast({ title: "Exclusion documented" });
      setExclusionDialog({ open: false, objectiveKey: "", objectiveLabel: "" });
      setExclusionReason("");
      setExclusionNotes("");
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteExclusionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/exclusions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      toast({ title: "Exclusion removed" });
    },
  });

  const { user } = useAuth();

  const { data: visitAlerts = [] } = useQuery<VisitAlert[]>({
    queryKey: ["/api/visits", visitId, "alerts"],
    enabled: !!visitId,
  });

  const { data: noteEdits = [] } = useQuery<any[]>({
    queryKey: ["/api/visits", visitId, "note-edits"],
    enabled: !!visitId && editHistoryOpen,
  });

  const { data: noteSignatures = [] } = useQuery<any[]>({
    queryKey: ["/api/visits", visitId, "note-signatures"],
    enabled: !!visitId && editHistoryOpen,
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await apiRequest("POST", `/api/alerts/${alertId}/acknowledge`, {
        userId: user?.id,
        userName: user?.fullName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "alerts"] });
      toast({ title: "Alert acknowledged" });
    },
  });

  const dismissAlertMutation = useMutation({
    mutationFn: async ({ alertId, reason }: { alertId: string; reason: string }) => {
      await apiRequest("POST", `/api/alerts/${alertId}/dismiss`, {
        userId: user?.id,
        userName: user?.fullName,
        reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "alerts"] });
      toast({ title: "Alert dismissed" });
    },
  });

  const progressNoteRaw = overview?.progressNote || [];
  const noteCompletionSummary = useMemo(() => {
    const total = progressNoteRaw.length;
    const complete = progressNoteRaw.filter((s: any) => s.completeness === "Complete").length;
    const incomplete = progressNoteRaw.filter((s: any) => s.completeness === "Incomplete").length;
    const exception = progressNoteRaw.filter((s: any) => s.completeness === "Exception").length;
    return { total, complete, incomplete, exception };
  }, [progressNoteRaw]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const visit = overview?.visit;
  const member = overview?.member;
  const checklist = overview?.checklist || [];
  const vitals = overview?.vitals;
  const tasks = overview?.tasks || [];
  const recommendations = overview?.recommendations || [];
  const medRecon = overview?.medRecon || [];
  const assessmentResponses = overview?.assessmentResponses || [];
  const vitalsFlags = overview?.vitalsFlags || [];
  const assessmentFlags = overview?.assessmentFlags || [];
  const progressNote = overview?.progressNote || [];
  const targets = overview?.targets || [];
  const exclusions = overview?.exclusions || [];
  const consents = overview?.consents || [];

  const noppConsent = consents.find((c: any) => c.consentType === "nopp");
  const voiceConsent = consents.find((c: any) => c.consentType === "voice_transcription");
  const noppDone = noppConsent && (noppConsent.status === "granted" || noppConsent.status === "exception");
  const voiceDone = voiceConsent && (voiceConsent.status === "granted" || voiceConsent.status === "declined");
  const complianceStatus: "completed" | "partial" | "pending" = noppDone && voiceDone ? "completed" : (noppDone || voiceDone) ? "partial" : "pending";

  const assessmentItems = checklist.filter((c: any) => c.itemType === "assessment");
  const measureItems = checklist.filter((c: any) => c.itemType === "measure");

  const pendingRecs = recommendations.filter((r: any) => r.status === "pending");
  const pendingTasks = tasks.filter((t: any) => t.status !== "completed");
  const completedTasks = tasks.filter((t: any) => t.status === "completed");

  const objectiveSteps = [
    {
      id: "identity",
      label: "Identity Verification",
      href: `/visits/${visitId}/intake/identity`,
      done: visit?.identityVerified,
      required: true,
    },
    {
      id: "vitals",
      label: "Vitals & Physical Exam",
      href: `/visits/${visitId}/intake/vitals`,
      done: !!vitals,
      required: true,
    },
    {
      id: "medications",
      label: "Medication Reconciliation",
      href: `/visits/${visitId}/intake/medications`,
      done: medRecon.length > 0,
      required: true,
    },
    ...assessmentItems.map((a: any) => ({
      id: `assessment-${a.itemId}`,
      label: a.itemName,
      href: `/visits/${visitId}/intake/assessment/${a.itemId}`,
      done: a.status === "complete" || a.status === "unable_to_assess",
      status: a.status,
      required: true,
    })),
    ...measureItems.map((m: any) => ({
      id: `measure-${m.itemId}`,
      label: m.itemName,
      href: `/visits/${visitId}/intake/measure/${m.itemId}`,
      done: m.status === "complete" || m.status === "unable_to_assess",
      status: m.status,
      required: true,
    })),
  ];

  const getExclusionForObjective = (objectiveKey: string) =>
    exclusions.find((e: any) => e.objectiveKey === objectiveKey);

  const getObjectiveStatus = (step: any): "completed" | "excluded" | "pending" => {
    if (step.done) return "completed";
    if (getExclusionForObjective(step.id)) return "excluded";
    return "pending";
  };

  const completedCount = objectiveSteps.filter(s => getObjectiveStatus(s) === "completed").length;
  const excludedCount = objectiveSteps.filter(s => getObjectiveStatus(s) === "excluded").length;
  const pendingCount = objectiveSteps.filter(s => getObjectiveStatus(s) === "pending").length;
  const totalSteps = objectiveSteps.length;
  const resolvedCount = completedCount + excludedCount;
  const progressPct = totalSteps > 0 ? Math.round((resolvedCount / totalSteps) * 100) : 0;
  const gateReady = pendingCount === 0 && totalSteps > 0;

  const allFlags = [...vitalsFlags, ...assessmentFlags.map((f: any) => ({ ...f, message: `${f.instrumentId}: Score ${f.score} - ${f.interpretation}`, label: f.instrumentId }))];

  const categoryLabels: Record<string, string> = {
    header: "ENCOUNTER",
    subjective: "SUBJECTIVE",
    objective: "OBJECTIVE",
    assessment: "ASSESSMENT & PLAN",
    plan: "PLAN",
    quality: "QUALITY MEASURES",
    attestation: "ATTESTATION",
  };
  const categoryOrder = ["header", "subjective", "objective", "assessment", "plan", "quality", "attestation"];
  const groupedNote = categoryOrder.map(cat => ({
    category: cat,
    label: categoryLabels[cat],
    sections: progressNote.filter((s: any) => s.category === cat),
  })).filter(g => g.sections.length > 0);

  const fullNoteText = groupedNote.map(g => {
    const header = `=== ${g.label} ===`;
    const body = g.sections.map((s: any) => {
      let text = `${s.section}:\n${s.content}`;
      if (s.meatTags && s.meatTags.length > 0) {
        text += `\n[MEAT: ${s.meatTags.join(", ")}]`;
      }
      return text;
    }).join("\n\n");
    return `${header}\n${body}`;
  }).join("\n\n");

  const copyNote = () => {
    navigator.clipboard.writeText(fullNoteText);
    setNoteCopied(true);
    setTimeout(() => setNoteCopied(false), 2000);
  };

  const downloadNote = () => {
    if (!visitId) return;
    window.open(`/api/visits/${visitId}/progress-note/export`, "_blank");
  };


  const statusColors = {
    completed: { bg: "#27749315", border: "#277493", text: "#277493", icon: CheckCircle2 },
    excluded: { bg: "#FEA00215", border: "#FEA002", text: "#9a6700", icon: Ban },
    pending: { bg: "#2E456B08", border: "transparent", text: "#64748b", icon: Circle },
  };

  return (
    <div className="space-y-4">
      {visit?.lockedAt && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700 p-3" data-testid="banner-visit-locked">
          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Visit Locked {visit.lockedBy ? `by ${visit.lockedBy}` : ""} {visit.lockedAt ? `on ${new Date(visit.lockedAt).toLocaleDateString()}` : ""}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/visits/${visitId}/summary`}>
            <Button variant="ghost" size="sm" data-testid="button-back-summary">
              <ChevronLeft className="w-4 h-4 mr-1" /> Summary
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-intake-title">
              Visit Intake {member ? `- ${member.firstName} ${member.lastName}` : ""}
            </h1>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {completedCount} done, {excludedCount > 0 ? `${excludedCount} excluded, ` : ""}{pendingCount} pending
              </span>
              {allFlags.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {allFlags.length} alert{allFlags.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/visits/${visitId}/intake/timeline`}>
            <Button variant="outline" size="sm" data-testid="button-open-timeline">
              <Activity className="w-4 h-4 mr-1" /> Clinical Timeline
            </Button>
          </Link>
          <Link href={`/visits/${visitId}/intake/careplan`}>
            <Button variant="outline" size="sm" data-testid="button-open-careplan">
              <FileText className="w-4 h-4 mr-1" /> Full Care Plan
            </Button>
          </Link>
          <Link href={`/visits/${visitId}/intake/voice-capture`}>
            <Button variant="outline" size="sm" data-testid="button-open-voice-capture">
              <Mic className="w-4 h-4 mr-1" /> Voice Capture
            </Button>
          </Link>
          <Link href={`/visits/${visitId}/intake/patient-context`}>
            <Button variant="outline" size="sm" data-testid="button-patient-context">
              <User className="w-4 h-4 mr-1" /> Patient Context
              {allFlags.length > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">{allFlags.length}</Badge>
              )}
            </Button>
          </Link>
          <Link href={`/visits/${visitId}/finalize`}>
            <Button data-testid="button-review-finalize" variant={gateReady ? "default" : "outline"}>
              Review & Finalize <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      <Progress value={progressPct} className="h-2" data-testid="progress-bar" />

      {allFlags.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-md border" style={{ borderColor: "#FEA002", backgroundColor: "rgba(254, 160, 2, 0.05)" }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#FEA002" }} />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">{allFlags.length} Clinical Alert{allFlags.length !== 1 ? "s" : ""}</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allFlags.slice(0, 3).map((f: any) => f.message).join(" | ")}
              {allFlags.length > 3 && ` +${allFlags.length - 3} more`}
            </p>
          </div>
          <Link href={`/visits/${visitId}/intake/patient-context`}>
            <Button variant="ghost" size="sm" data-testid="button-view-alerts">
              View <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ====== LEFT PANEL: NP TASKS + PROGRESS NOTES ====== */}
        <div className="lg:col-span-5 space-y-4">

          {/* NP Tasks - Action Items */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" style={{ color: "#2E456B" }} />
                  <h2 className="text-sm font-semibold">Tasks</h2>
                  <span className="text-xs text-muted-foreground">What to do</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-0">
              <Link href={`/visits/${visitId}/intake/consents`}>
                <div className="flex items-center gap-3 p-2.5 rounded-md border hover-elevate" style={{
                  borderColor: complianceStatus === "completed" ? "#27749340" : complianceStatus === "partial" ? "#FEA00240" : undefined,
                  backgroundColor: complianceStatus === "completed" ? "#27749308" : complianceStatus === "partial" ? "#FEA00208" : undefined,
                  opacity: complianceStatus === "completed" ? 0.7 : 1,
                }} data-testid="task-compliance">
                  <div className="flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0" style={{
                    backgroundColor: complianceStatus === "completed" ? "#27749315" : complianceStatus === "partial" ? "#FEA00215" : "#2E456B08",
                  }}>
                    <ShieldCheck className="w-3.5 h-3.5" style={{ color: complianceStatus === "completed" ? "#277493" : complianceStatus === "partial" ? "#9a6700" : "#64748b" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${complianceStatus === "completed" ? "line-through text-muted-foreground" : ""}`}>
                      NOPP & Consents
                    </span>
                    {complianceStatus === "partial" && (
                      <p className="text-[11px] mt-0.5" style={{ color: "#9a6700" }}>Partially complete</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {complianceStatus === "completed" && (
                      <CheckCircle2 className="w-4 h-4" style={{ color: "#277493" }} data-testid="status-done-compliance" />
                    )}
                    {complianceStatus === "partial" && (
                      <AlertTriangle className="w-4 h-4" style={{ color: "#FEA002" }} data-testid="status-partial-compliance" />
                    )}
                    {complianceStatus === "pending" && (
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </Link>

              <Separator className="my-1" />

              {objectiveSteps.map((step) => {
                const objStatus = getObjectiveStatus(step);
                const exclusion = getExclusionForObjective(step.id);
                const Icon = stepIcons[step.id.split("-")[0]] || ClipboardList;
                const isDone = objStatus === "completed";
                const isExcluded = objStatus === "excluded";

                return (
                  <div key={step.id} className="group" data-testid={`task-${step.id}`}>
                    <div className="flex items-center gap-3 p-2.5 rounded-md border" style={{
                      borderColor: isDone ? "#27749340" : isExcluded ? "#FEA00240" : undefined,
                      backgroundColor: isDone ? "#27749308" : isExcluded ? "#FEA00208" : undefined,
                      opacity: isDone ? 0.7 : isExcluded ? 0.6 : 1,
                    }}>
                      <div className="flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0" style={{
                        backgroundColor: statusColors[objStatus].bg
                      }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: statusColors[objStatus].text }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${isDone ? "line-through text-muted-foreground" : isExcluded ? "line-through text-muted-foreground" : ""}`}>
                          {step.label}
                        </span>
                        {isExcluded && exclusion && (
                          <p className="text-[11px] mt-0.5" style={{ color: "#9a6700" }}>
                            Excluded: {exclusion.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isDone && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CheckCircle2 className="w-4 h-4" style={{ color: "#277493" }} data-testid={`status-done-${step.id}`} />
                            </TooltipTrigger>
                            <TooltipContent>Completed</TooltipContent>
                          </Tooltip>
                        )}
                        {isExcluded && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Ban className="w-4 h-4" style={{ color: "#FEA002" }} data-testid={`status-excluded-${step.id}`} />
                            </TooltipTrigger>
                            <TooltipContent>Excluded: {exclusion?.reason}</TooltipContent>
                          </Tooltip>
                        )}
                        {!isDone && !isExcluded && (
                          <div className="flex items-center gap-1">
                            <Link href={step.href}>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" data-testid={`button-start-${step.id}`}>
                                Start <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            </Link>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 visibility-hidden group-hover:visibility-visible"
                                  style={{ visibility: "visible" }}
                                  onClick={() => {
                                    setExclusionDialog({ open: true, objectiveKey: step.id, objectiveLabel: step.label });
                                    setExclusionReason("");
                                    setExclusionNotes("");
                                  }}
                                  data-testid={`button-exclude-${step.id}`}
                                >
                                  <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Document exclusion</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                        {(isDone || isExcluded) && (
                          <Link href={step.href}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-view-${step.id}`}>
                              <ExternalLink className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Provider Tasks (Care Plan) */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" style={{ color: "#2E456B" }} />
                  <h2 className="text-sm font-semibold">Provider Tasks</h2>
                  {pendingTasks.length > 0 && <Badge variant="secondary" className="text-xs">{pendingTasks.length} pending</Badge>}
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-task">
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Care Plan Task</DialogTitle>
                      <DialogDescription>Add a new task to the visit care plan.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Task Type</Label>
                        <Select value={newTask.taskType} onValueChange={(v) => setNewTask((p) => ({ ...p, taskType: v }))}>
                          <SelectTrigger data-testid="select-task-type"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {taskTypes.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={newTask.title} onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))} placeholder="Task title" data-testid="input-task-title" />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={newTask.description} onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))} placeholder="Details..." data-testid="input-task-description" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Priority</Label>
                          <Select value={newTask.priority} onValueChange={(v) => setNewTask((p) => ({ ...p, priority: v }))}>
                            <SelectTrigger data-testid="select-task-priority"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Due Date</Label>
                          <Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask((p) => ({ ...p, dueDate: e.target.value }))} data-testid="input-task-due-date" />
                        </div>
                      </div>
                      <Button className="w-full" onClick={() => createTaskMutation.mutate()} disabled={!newTask.title || createTaskMutation.isPending} data-testid="button-create-task">
                        {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {pendingTasks.length > 0 ? (
                pendingTasks.map((task: any) => {
                  const StatusIcon = statusIcons[task.status] || Circle;
                  return (
                    <div key={task.id} className="flex items-start gap-3 p-3 rounded-md border" data-testid={`task-card-${task.id}`}>
                      <StatusIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ABAFA5" }} />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-sm font-medium" data-testid={`text-task-title-${task.id}`}>{task.title}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs capitalize">{task.taskType.replace(/_/g, " ")}</Badge>
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: priorityColors[task.priority] || "#ABAFA5" }} />
                          </div>
                        </div>
                        {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Due: {task.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center py-4">
                  <CheckCircle2 className="w-5 h-5 mb-1 text-muted-foreground opacity-30" />
                  <span className="text-xs text-muted-foreground">No pending tasks</span>
                </div>
              )}
              {completedTasks.length > 0 && (
                <details className="text-sm">
                  <summary className="text-muted-foreground cursor-pointer text-xs">{completedTasks.length} completed</summary>
                  <div className="space-y-1 mt-2">
                    {completedTasks.map((task: any) => (
                      <div key={task.id} className="flex items-center gap-2 p-1.5 rounded-md opacity-60">
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: "#277493" }} />
                        <span className="text-xs line-through">{task.title}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* MEAT/TAMPER Compliant Progress Note */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Clipboard className="w-4 h-4" style={{ color: "#277493" }} />
                  <h2 className="text-sm font-semibold">Progress Note</h2>
                  <Badge variant="secondary" className="text-[10px]">MEAT/TAMPER</Badge>
                  {noteCompletionSummary.total > 0 && (
                    <Badge variant="secondary" className="text-[10px]" data-testid="badge-note-completion">
                      {noteCompletionSummary.complete}/{noteCompletionSummary.total}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <Button variant="ghost" size="sm" onClick={downloadNote} data-testid="button-download-note">
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button variant="ghost" size="sm" onClick={copyNote} data-testid="button-copy-note">
                    {noteCopied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {noteCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">RADV & NCQA compliant documentation</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {groupedNote.length > 0 ? groupedNote.map((group, gi) => (
                <div key={gi} data-testid={`note-group-${group.category}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#2E456B" }}>{group.label}</span>
                    <div className="flex-1 border-b border-border" />
                  </div>
                  <div className="space-y-2 pl-1">
                    {group.sections.map((section: any, si: number) => (
                      <div key={si} className="space-y-0.5" data-testid={`note-section-${group.category}-${si}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold">{section.section}</span>
                          {section.completeness && (
                            <Badge
                              variant={section.completeness === "Complete" ? "default" : section.completeness === "Exception" ? "secondary" : "destructive"}
                              className="text-[9px] px-1.5 py-0"
                              data-testid={`badge-completeness-${group.category}-${si}`}
                            >
                              {section.completeness === "Complete" ? (
                                <><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />{section.completeness}</>
                              ) : section.completeness === "Incomplete" ? (
                                <><AlertCircle className="w-2.5 h-2.5 mr-0.5" />{section.completeness}{section.completenessReason ? ` - ${section.completenessReason}` : ""}</>
                              ) : (
                                <><Ban className="w-2.5 h-2.5 mr-0.5" />{section.completeness}{section.completenessReason ? ` - ${section.completenessReason}` : ""}</>
                              )}
                            </Badge>
                          )}
                          {section.hasFlags && <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: "#FEA002" }} />}
                          {section.meatTags && section.meatTags.length > 0 && (
                            <div className="flex items-center gap-0.5 flex-wrap">
                              {section.meatTags.map((tag: string) => (
                                <span key={tag} className="text-[9px] px-1 rounded font-medium" style={{
                                  backgroundColor: tag === "Monitor" ? "#E8F4FD" : tag === "Evaluate" ? "#FFF3E0" : tag === "Assess" ? "#E8F5E9" : "#FCE4EC",
                                  color: tag === "Monitor" ? "#277493" : tag === "Evaluate" ? "#E65100" : tag === "Assess" ? "#2E7D32" : "#C62828",
                                }}>{tag[0]}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className={`text-xs whitespace-pre-line ${section.hasFlags ? "font-medium" : "text-muted-foreground"}`}>{section.content}</p>
                        {section.provenance && (
                          <span className="text-[10px] text-muted-foreground italic" data-testid={`text-provenance-${group.category}-${si}`}>
                            Source: {section.provenance}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">Complete visit tasks to build the progress note.</p>
              )}
            </CardContent>
          </Card>

          {/* Edit History & Note Signatures */}
          <Card>
            <CardHeader className="pb-2">
              <button
                className="flex items-center justify-between gap-2 w-full text-left"
                onClick={() => setEditHistoryOpen(!editHistoryOpen)}
                data-testid="button-toggle-edit-history"
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" style={{ color: "#277493" }} />
                  <h2 className="text-sm font-semibold">Edit History & Signatures</h2>
                  {(noteEdits.length > 0 || noteSignatures.length > 0) && (
                    <Badge variant="secondary" className="text-[10px]" data-testid="badge-edit-count">
                      {noteEdits.length + noteSignatures.length}
                    </Badge>
                  )}
                </div>
                {editHistoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </CardHeader>
            {editHistoryOpen && (
              <CardContent className="space-y-4 pt-0">
                {noteEdits.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#2E456B" }}>Edit History</span>
                    {noteEdits.map((edit: any, i: number) => (
                      <div key={edit.id || i} className="border border-border rounded-md p-2 space-y-1" data-testid={`edit-history-item-${i}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Pen className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-medium">{edit.section}</span>
                          <span className="text-[10px] text-muted-foreground">by {edit.editedByName || "Unknown"}</span>
                          <span className="text-[10px] text-muted-foreground">{edit.editedAt ? new Date(edit.editedAt).toLocaleString() : ""}</span>
                        </div>
                        {edit.editReason && (
                          <p className="text-[11px] text-muted-foreground">Reason: {edit.editReason}</p>
                        )}
                        {edit.previousContent && edit.newContent && (
                          <div className="space-y-1 mt-1">
                            <div className="text-[10px] rounded p-1.5" style={{ backgroundColor: "rgba(220, 38, 38, 0.06)" }}>
                              <span className="font-medium text-red-600 dark:text-red-400">Previous: </span>
                              <span className="text-muted-foreground whitespace-pre-line">{edit.previousContent}</span>
                            </div>
                            <div className="text-[10px] rounded p-1.5" style={{ backgroundColor: "rgba(34, 197, 94, 0.06)" }}>
                              <span className="font-medium text-green-600 dark:text-green-400">Updated: </span>
                              <span className="text-muted-foreground whitespace-pre-line">{edit.newContent}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground" data-testid="text-no-edits">No edit history available.</p>
                )}

                <Separator />

                {noteSignatures.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#2E456B" }}>Note Signatures</span>
                    {noteSignatures.map((sig: any, i: number) => (
                      <div key={sig.id || i} className="border border-border rounded-md p-2 space-y-1" data-testid={`note-signature-item-${i}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileCheck className="w-3 h-3 text-muted-foreground" />
                          <Badge variant="secondary" className="text-[9px]">{sig.signatureType || "Signature"}</Badge>
                          <span className="text-xs font-medium">{sig.signedByName || "Unknown"}</span>
                          {sig.role && <span className="text-[10px] text-muted-foreground">({sig.role})</span>}
                          <span className="text-[10px] text-muted-foreground">{sig.signedAt ? new Date(sig.signedAt).toLocaleString() : ""}</span>
                        </div>
                        {sig.attestationText && (
                          <p className="text-[11px] text-muted-foreground italic">{sig.attestationText}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground" data-testid="text-no-signatures">No signatures recorded.</p>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* ====== RIGHT PANEL: ALERTS + CDS + OBJECTIVES + RESULTS ====== */}
        <div className="lg:col-span-7 space-y-4">

          {/* Visit Alerts Panel */}
          {(() => {
            const activeAlerts = visitAlerts.filter((a) => a.status === "active");
            if (activeAlerts.length === 0) return null;
            const severityStyles: Record<string, { bg: string; border: string; icon: string }> = {
              emergency: { bg: "rgba(220, 38, 38, 0.08)", border: "rgba(220, 38, 38, 0.4)", icon: "#DC2626" },
              critical: { bg: "rgba(234, 88, 12, 0.08)", border: "rgba(234, 88, 12, 0.4)", icon: "#EA580C" },
              warning: { bg: "rgba(254, 160, 2, 0.08)", border: "rgba(254, 160, 2, 0.4)", icon: "#FEA002" },
              info: { bg: "rgba(39, 116, 147, 0.08)", border: "rgba(39, 116, 147, 0.4)", icon: "#277493" },
            };
            return (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" style={{ color: "#E74C3C" }} />
                    <h2 className="text-sm font-semibold">Visit Alerts</h2>
                    <Badge variant="destructive" className="text-xs">{activeAlerts.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {activeAlerts.map((alert) => {
                    const style = severityStyles[alert.severity] || severityStyles.warning;
                    return (
                      <div
                        key={alert.id}
                        className="p-3 rounded-md border"
                        style={{ borderColor: style.border, backgroundColor: style.bg }}
                        data-testid={`alert-${alert.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: style.icon }} />
                              <span className="text-sm font-medium" data-testid={`text-alert-name-${alert.id}`}>{alert.ruleName}</span>
                              <Badge variant="outline" className="text-[10px] uppercase">{alert.severity}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{alert.message}</p>
                            {alert.recommendedAction && (
                              <p className="text-xs" style={{ color: style.icon }}>Action: {alert.recommendedAction}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                              data-testid={`button-acknowledge-alert-${alert.id}`}
                            >
                              <Check className="w-3 h-3 mr-1" /> Noted
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => dismissAlertMutation.mutate({ alertId: alert.id, reason: "Reviewed and addressed" })}
                              data-testid={`button-dismiss-alert-${alert.id}`}
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })()}

          {/* CDS Alerts - Top of Right */}
          {pendingRecs.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" style={{ color: "#FEA002" }} />
                  <h2 className="text-sm font-semibold">Clinical Decision Support</h2>
                  <Badge variant="secondary" className="text-xs">{pendingRecs.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {pendingRecs.map((rec: any) => (
                  <div key={rec.id} className="flex items-start justify-between gap-3 p-3 rounded-md border" style={{ borderColor: "rgba(254, 160, 2, 0.3)", backgroundColor: "rgba(254, 160, 2, 0.05)" }} data-testid={`rec-${rec.id}`}>
                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="text-sm font-medium" data-testid={`text-rec-name-${rec.id}`}>{rec.ruleName}</span>
                      <p className="text-xs text-muted-foreground">{rec.recommendation}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => dismissRecMutation.mutate(rec.id)} data-testid={`button-dismiss-rec-${rec.id}`}>
                      Noted
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Objectives Status - What We Accomplished */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" style={{ color: "#2E456B" }} />
                  <h2 className="text-sm font-semibold">Objectives</h2>
                  <span className="text-xs text-muted-foreground">What we accomplished</span>
                </div>
                <Badge variant={gateReady ? "default" : "secondary"} className="text-xs" data-testid="text-objective-progress">
                  {resolvedCount}/{totalSteps}
                </Badge>
              </div>
              {gateReady ? (
                <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: "#277493" }}>
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="font-medium">All objectives resolved - ready for finalization</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <AlertCircle className="w-3 h-3" />
                  <span>{pendingCount} objective{pendingCount !== 1 ? "s" : ""} remaining</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-1.5 pt-0">
              {/* Status Legend */}
              <div className="flex items-center gap-4 mb-2 text-[11px] flex-wrap">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" style={{ color: "#277493" }} />
                  <span className="text-muted-foreground">Completed ({completedCount})</span>
                </div>
                <div className="flex items-center gap-1">
                  <Ban className="w-3 h-3" style={{ color: "#FEA002" }} />
                  <span className="text-muted-foreground">Excluded ({excludedCount})</span>
                </div>
                <div className="flex items-center gap-1">
                  <Circle className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Pending ({pendingCount})</span>
                </div>
              </div>

              {objectiveSteps.map((step) => {
                const objStatus = getObjectiveStatus(step);
                const exclusion = getExclusionForObjective(step.id);
                const colors = statusColors[objStatus];
                const StatusIcon = colors.icon;

                return (
                  <div key={step.id} className="group rounded-md border p-2.5" style={{
                    borderColor: colors.border,
                    backgroundColor: colors.bg,
                  }} data-testid={`objective-${step.id}`}>
                    <div className="flex items-center gap-3">
                      <StatusIcon className="w-4 h-4 flex-shrink-0" style={{ color: colors.text }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm ${objStatus !== "pending" ? "line-through" : "font-medium"}`} style={{ color: objStatus === "pending" ? undefined : colors.text }}>
                            {step.label}
                          </span>
                          {objStatus === "completed" && (
                            <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate" style={{ backgroundColor: "#27749320", color: "#277493", border: "none" }} data-testid={`badge-done-${step.id}`}>Done</Badge>
                          )}
                          {objStatus === "excluded" && (
                            <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate" style={{ backgroundColor: "#FEA00220", color: "#9a6700", border: "none" }} data-testid={`badge-excluded-${step.id}`}>Excluded</Badge>
                          )}
                          {objStatus === "pending" && (
                            <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate" data-testid={`badge-pending-${step.id}`}>Pending</Badge>
                          )}
                        </div>
                        {exclusion && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <p className="text-[11px]" style={{ color: "#9a6700" }}>
                              {exclusion.reason}{exclusion.notes ? ` - ${exclusion.notes}` : ""}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => deleteExclusionMutation.mutate(exclusion.id)}
                              data-testid={`button-remove-exclusion-${step.id}`}
                            >
                              <Trash2 className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Assessment Results */}
          {assessmentResponses.filter((ar: any) => ar.status === "complete").length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" style={{ color: "#277493" }} />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assessment Results</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 pt-0">
                {assessmentResponses.filter((ar: any) => ar.status === "complete").map((ar: any) => {
                  const flagged = assessmentFlags.some((f: any) => f.instrumentId === ar.instrumentId);
                  return (
                    <div key={ar.id} className="flex items-center justify-between gap-2 p-2 rounded-md border" data-testid={`assessment-result-${ar.instrumentId}`}>
                      <div className="min-w-0">
                        <span className="text-sm font-medium">{ar.instrumentId}</span>
                        <p className="text-xs text-muted-foreground truncate">{ar.interpretation || "Completed"}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-base font-bold" style={{ color: flagged ? "#FEA002" : "#277493" }}>{ar.computedScore ?? "--"}</span>
                        {flagged && <AlertTriangle className="w-3 h-3" style={{ color: "#FEA002" }} />}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Medication Summary */}
          {medRecon.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4" style={{ color: "#277493" }} />
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medications</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">{medRecon.length} reconciled</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
                  <span>{medRecon.filter((m: any) => m.status === "verified").length} verified</span>
                  <span>{medRecon.filter((m: any) => m.status === "new").length} new</span>
                  <span>{medRecon.filter((m: any) => m.status === "discontinued").length} discontinued</span>
                  {medRecon.filter((m: any) => m.isBeersRisk || (m.interactionFlags && m.interactionFlags.length > 0)).length > 0 && (
                    <Badge variant="destructive" className="text-xs">{medRecon.filter((m: any) => m.isBeersRisk || (m.interactionFlags && m.interactionFlags.length > 0)).length} warnings</Badge>
                  )}
                </div>
                <div className="space-y-1">
                  {medRecon.slice(0, 5).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between gap-2 text-sm" data-testid={`med-summary-${m.id}`}>
                      <span className="truncate text-xs">{m.medicationName} {m.dosage && <span className="text-muted-foreground">{m.dosage}</span>}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge variant="secondary" className="text-xs capitalize">{m.status}</Badge>
                        {(m.isBeersRisk || (m.interactionFlags && m.interactionFlags.length > 0)) && <AlertTriangle className="w-3 h-3" style={{ color: "#FEA002" }} />}
                      </div>
                    </div>
                  ))}
                  {medRecon.length > 5 && <p className="text-xs text-muted-foreground text-center">+{medRecon.length - 5} more</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entered Vitals Summary */}
          {vitals && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-4 h-4" style={{ color: "#E74C3C" }} />
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vitals Recorded</h3>
                  </div>
                  {vitalsFlags.length > 0 && <Badge variant="destructive" className="text-xs">{vitalsFlags.length} abnormal</Badge>}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "BP", value: `${(vitals as any).systolic || "--"}/${(vitals as any).diastolic || "--"}`, unit: "mmHg", fields: ["systolic", "diastolic"] },
                    { label: "HR", value: (vitals as any).heartRate || "--", unit: "bpm", fields: ["heartRate"] },
                    { label: "SpO2", value: (vitals as any).oxygenSaturation || "--", unit: "%", fields: ["oxygenSaturation"] },
                    { label: "Temp", value: (vitals as any).temperature || "--", unit: "F", fields: ["temperature"] },
                    { label: "RR", value: (vitals as any).respiratoryRate || "--", unit: "/min", fields: ["respiratoryRate"] },
                    { label: "BMI", value: (vitals as any).bmi || "--", unit: "", fields: ["bmi"] },
                  ].map((v) => {
                    const flagged = vitalsFlags.some((f: any) => v.fields.includes(f.field));
                    return (
                      <div key={v.label} className={`flex items-baseline gap-1.5 p-1.5 rounded text-sm ${flagged ? "text-destructive font-medium" : ""}`} data-testid={`vital-${v.fields[0]}`}>
                        <span className="text-xs text-muted-foreground w-8">{v.label}</span>
                        <span className="font-medium">{v.value}</span>
                        <span className="text-xs text-muted-foreground">{v.unit}</span>
                        {flagged && <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: "#E74C3C" }} />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan Targets */}
          {targets.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" style={{ color: "#FEA002" }} />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan Targets</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 pt-0">
                {targets.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                      backgroundColor: t.priority === "high" ? "#E74C3C" : t.priority === "medium" ? "#FEA002" : "#277493"
                    }} />
                    <span className="text-xs">{t.description}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Exclusion Documentation Dialog */}
      <Dialog open={exclusionDialog.open} onOpenChange={(open) => setExclusionDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document Exclusion</DialogTitle>
            <DialogDescription>
              Record why "{exclusionDialog.objectiveLabel}" could not be completed during this visit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={exclusionReason} onValueChange={setExclusionReason}>
                <SelectTrigger data-testid="select-exclusion-reason"><SelectValue placeholder="Select a reason..." /></SelectTrigger>
                <SelectContent>
                  {exclusionReasonOptions.map((rc) => (
                    <SelectItem key={rc.id} value={rc.label} data-testid={`select-item-reason-${rc.code}`}>{rc.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional Notes (optional)</Label>
              <Textarea
                value={exclusionNotes}
                onChange={(e) => setExclusionNotes(e.target.value)}
                placeholder="Provide any additional context..."
                data-testid="input-exclusion-notes"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => createExclusionMutation.mutate({
                objectiveKey: exclusionDialog.objectiveKey,
                objectiveLabel: exclusionDialog.objectiveLabel,
                reason: exclusionReason,
                notes: exclusionNotes,
              })}
              disabled={!exclusionReason || createExclusionMutation.isPending}
              data-testid="button-submit-exclusion"
            >
              {createExclusionMutation.isPending ? "Saving..." : "Document Exclusion"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
