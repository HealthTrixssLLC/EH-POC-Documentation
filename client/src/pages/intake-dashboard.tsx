import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Phone,
  MapPin,
  Shield,
  FileWarning,
  Clipboard,
  TrendingUp,
  Lightbulb,
  Copy,
  Check,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  careplan: FileText,
  timeline: Activity,
  medications: Pill,
};

export default function IntakeDashboard() {
  const [, params] = useRoute("/visits/:id/intake");
  const visitId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [noteCopied, setNoteCopied] = useState(false);
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
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

  const assessmentItems = checklist.filter((c: any) => c.itemType === "assessment");
  const measureItems = checklist.filter((c: any) => c.itemType === "measure");
  const completedItems = checklist.filter((c: any) => c.status === "complete" || c.status === "unable_to_assess").length;
  const totalItems = checklist.length;
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const pendingRecs = recommendations.filter((r: any) => r.status === "pending");
  const allFlags = [...vitalsFlags, ...assessmentFlags.map((f: any) => ({ ...f, message: `${f.instrumentId}: Score ${f.score} - ${f.interpretation}`, label: f.instrumentId }))];
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
      label: "Vitals & Exam",
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

  const requiredDone = objectiveSteps.filter(s => s.required && s.done).length;
  const requiredTotal = objectiveSteps.filter(s => s.required).length;
  const gateReady = requiredDone === requiredTotal && requiredTotal > 0;

  const fullNoteText = progressNote.map((s: any) => `${s.section}: ${s.content}`).join("\n");
  const copyNote = () => {
    navigator.clipboard.writeText(fullNoteText);
    setNoteCopied(true);
    setTimeout(() => setNoteCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
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
                {requiredDone}/{requiredTotal} objectives complete
              </span>
              {allFlags.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {allFlags.length} alert{allFlags.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Link href={`/visits/${visitId}/finalize`}>
          <Button data-testid="button-review-finalize" variant={gateReady ? "default" : "outline"} disabled={false}>
            Review & Finalize <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      <Progress value={progressPct} className="h-2" data-testid="progress-bar" />

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-3" data-testid="intake-tabs">
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            <FileText className="w-4 h-4 mr-2" /> Tasks & Notes
            {(pendingTasks.length > 0 || pendingRecs.length > 0) && (
              <Badge variant="secondary" className="ml-2 text-xs">{pendingTasks.length + pendingRecs.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="objectives" data-testid="tab-objectives">
            <Target className="w-4 h-4 mr-2" /> Visit Objectives
            <Badge variant={gateReady ? "default" : "secondary"} className="ml-2 text-xs">
              {requiredDone}/{requiredTotal}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="context" data-testid="tab-context">
            <User className="w-4 h-4 mr-2" /> Patient Context
            {allFlags.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{allFlags.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ====== TAB 1: TASKS & NOTES ====== */}
        <TabsContent value="tasks" className="mt-4 space-y-4">
          {/* CDS Alerts */}
          {pendingRecs.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" style={{ color: "#FEA002" }} />
                  <h3 className="text-sm font-semibold">Clinical Decision Support</h3>
                  <Badge variant="secondary" className="text-xs">{pendingRecs.length} pending</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingRecs.map((rec: any) => (
                  <div key={rec.id} className="flex items-start justify-between gap-3 p-3 rounded-md border border-amber-200 dark:border-amber-800" style={{ backgroundColor: "rgba(254, 160, 2, 0.05)" }} data-testid={`rec-${rec.id}`}>
                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="text-sm font-medium" data-testid={`text-rec-name-${rec.id}`}>{rec.ruleName}</span>
                      <p className="text-xs text-muted-foreground">{rec.recommendation}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissRecMutation.mutate(rec.id)}
                      data-testid={`button-dismiss-rec-${rec.id}`}
                    >
                      Noted
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Provider Tasks */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4" style={{ color: "#2E456B" }} /> Provider Tasks
              {pendingTasks.length > 0 && <Badge variant="secondary" className="text-xs">{pendingTasks.length} pending</Badge>}
            </h3>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-task">
                  <Plus className="w-4 h-4 mr-1" /> Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Care Plan Task</DialogTitle>
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

          {pendingTasks.length > 0 ? (
            <div className="space-y-2">
              {pendingTasks.map((task: any) => {
                const StatusIcon = statusIcons[task.status] || Circle;
                return (
                  <Card key={task.id} data-testid={`task-card-${task.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <StatusIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: task.status === "completed" ? "#277493" : "#ABAFA5" }} />
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-8">
                <CheckCircle2 className="w-8 h-8 mb-2 text-muted-foreground opacity-30" />
                <span className="text-sm text-muted-foreground">No pending tasks. Add tasks as you identify follow-up needs.</span>
              </CardContent>
            </Card>
          )}

          {completedTasks.length > 0 && (
            <details className="text-sm">
              <summary className="text-muted-foreground cursor-pointer mb-2">{completedTasks.length} completed task{completedTasks.length !== 1 ? "s" : ""}</summary>
              <div className="space-y-2">
                {completedTasks.map((task: any) => (
                  <div key={task.id} className="flex items-center gap-2 p-2 rounded-md border opacity-60">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#277493" }} />
                    <span className="text-sm line-through">{task.title}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <Separator />

          {/* Auto-Composed Progress Note */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Clipboard className="w-4 h-4" style={{ color: "#277493" }} />
                  <h3 className="text-sm font-semibold">Progress Note</h3>
                  <span className="text-xs text-muted-foreground">(auto-composed)</span>
                </div>
                <Button variant="ghost" size="sm" onClick={copyNote} data-testid="button-copy-note">
                  {noteCopied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {noteCopied ? "Copied" : "Copy"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {progressNote.length > 0 ? progressNote.map((section: any, i: number) => (
                <div key={i} className="space-y-1" data-testid={`note-section-${i}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.section}</span>
                    {section.hasFlags && <AlertTriangle className="w-3 h-3" style={{ color: "#FEA002" }} />}
                  </div>
                  <p className={`text-sm ${section.hasFlags ? "font-medium" : ""}`}>{section.content}</p>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">Complete visit objectives to build the progress note.</p>
              )}
            </CardContent>
          </Card>

          {/* Quick links */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/visits/${visitId}/intake/careplan`}>
              <Button variant="outline" size="sm" data-testid="button-open-careplan">
                <FileText className="w-4 h-4 mr-1" /> Full Care Plan
              </Button>
            </Link>
            <Link href={`/visits/${visitId}/intake/timeline`}>
              <Button variant="outline" size="sm" data-testid="button-open-timeline">
                <Activity className="w-4 h-4 mr-1" /> Clinical Timeline
              </Button>
            </Link>
          </div>
        </TabsContent>

        {/* ====== TAB 2: VISIT OBJECTIVES ====== */}
        <TabsContent value="objectives" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <span className="text-sm font-medium">Completion Progress</span>
                <span className="text-sm text-muted-foreground" data-testid="text-objective-progress">
                  {requiredDone} of {requiredTotal} required items complete
                </span>
              </div>
              <Progress value={requiredTotal > 0 ? Math.round((requiredDone / requiredTotal) * 100) : 0} className="h-2" />
              {gateReady ? (
                <div className="flex items-center gap-2 mt-3 text-sm" style={{ color: "#277493" }}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">All required objectives complete. Ready for finalization.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  <span>{requiredTotal - requiredDone} required item{requiredTotal - requiredDone !== 1 ? "s" : ""} remaining before finalization</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            {objectiveSteps.map((step) => {
              const Icon = stepIcons[step.id.split("-")[0]] || ClipboardList;
              return (
                <Link key={step.id} href={step.href}>
                  <Card className="hover-elevate cursor-pointer" data-testid={`objective-${step.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-md flex-shrink-0" style={{
                          backgroundColor: step.done ? "#27749315" : "#2E456B10"
                        }}>
                          <Icon className="w-4 h-4" style={{ color: step.done ? "#277493" : "#2E456B" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{step.label}</span>
                          {(step as any).status && (
                            <Badge variant="secondary" className="ml-2 text-xs capitalize">
                              {(step as any).status.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {step.required && !step.done && <span className="text-xs text-muted-foreground">Required</span>}
                          {step.done ? (
                            <CheckCircle2 className="w-5 h-5" style={{ color: "#277493" }} />
                          ) : (
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Plan Targets */}
          {targets.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" style={{ color: "#FEA002" }} />
                  <h3 className="text-sm font-semibold">Plan Targets & Care Gaps</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {targets.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm p-2 rounded-md border">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                      backgroundColor: t.priority === "high" ? "#E74C3C" : t.priority === "medium" ? "#FEA002" : "#277493"
                    }} />
                    <span className="text-sm">{t.description}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Link href={`/visits/${visitId}/finalize`}>
              <Button data-testid="button-finalize-from-objectives" variant={gateReady ? "default" : "outline"}>
                Review & Finalize <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </TabsContent>

        {/* ====== TAB 3: PATIENT CONTEXT ====== */}
        <TabsContent value="context" className="mt-4 space-y-4">
          {/* Alerts Banner */}
          {allFlags.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" style={{ color: "#E74C3C" }} />
                  <h3 className="text-sm font-semibold">Clinical Alerts</h3>
                  <Badge variant="destructive" className="text-xs">{allFlags.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {allFlags.map((flag: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-md border" style={{
                    borderColor: flag.severity === "critical" ? "#E74C3C" : "#FEA002",
                    backgroundColor: flag.severity === "critical" ? "rgba(231, 76, 60, 0.05)" : "rgba(254, 160, 2, 0.05)"
                  }} data-testid={`flag-${i}`}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: flag.severity === "critical" ? "#E74C3C" : "#FEA002" }} />
                    <div>
                      <span className="text-sm font-medium">{flag.label}</span>
                      <p className="text-xs text-muted-foreground">{flag.message}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Patient Demographics */}
          {member && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" style={{ color: "#2E456B" }} />
                  <h3 className="text-sm font-semibold">Patient Information</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold" data-testid="text-context-name">{member.firstName} {member.lastName}</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>DOB: {member.dob} | Gender: {member.gender || "N/A"}</p>
                      <p>Member ID: {member.memberId}</p>
                      {member.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {member.phone}</p>}
                      {member.address && <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {member.address}, {member.city}, {member.state} {member.zip}</p>}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {member.conditions?.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground block mb-1">Conditions</span>
                        <div className="flex flex-wrap gap-1">
                          {member.conditions.map((c: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {member.allergies?.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                          <FileWarning className="w-3 h-3" /> Allergies
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {member.allergies.map((a: string, i: number) => (
                            <Badge key={i} variant="destructive" className="text-xs">{a}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {member.riskFlags?.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                          <Shield className="w-3 h-3" /> Risk Flags
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {member.riskFlags.map((r: string, i: number) => (
                            <Badge key={i} variant="destructive" className="text-xs">{r}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Visit Data in Context */}
          {vitals && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4" style={{ color: "#E74C3C" }} />
                  <h3 className="text-sm font-semibold">Current Visit Vitals</h3>
                  {vitalsFlags.length > 0 && <Badge variant="destructive" className="text-xs">{vitalsFlags.length} abnormal</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Blood Pressure", value: `${(vitals as any).systolicBp || "--"}/${(vitals as any).diastolicBp || "--"}`, unit: "mmHg", fields: ["systolicBp", "diastolicBp"] },
                    { label: "Heart Rate", value: (vitals as any).heartRate || "--", unit: "bpm", fields: ["heartRate"] },
                    { label: "SpO2", value: (vitals as any).oxygenSaturation || "--", unit: "%", fields: ["oxygenSaturation"] },
                    { label: "Temperature", value: (vitals as any).temperature || "--", unit: "F", fields: ["temperature"] },
                    { label: "Respiratory Rate", value: (vitals as any).respiratoryRate || "--", unit: "/min", fields: ["respiratoryRate"] },
                    { label: "Weight", value: (vitals as any).weight || "--", unit: "lbs", fields: ["weight"] },
                    { label: "BMI", value: (vitals as any).bmi || "--", unit: "", fields: ["bmi"] },
                    { label: "Pain", value: (vitals as any).painLevel ?? "--", unit: "/10", fields: ["painLevel"] },
                  ].map((v) => {
                    const flagged = vitalsFlags.some((f: any) => v.fields.includes(f.field));
                    return (
                      <div key={v.label} className={`p-3 rounded-md border ${flagged ? "border-destructive" : ""}`} style={flagged ? { backgroundColor: "rgba(231, 76, 60, 0.05)" } : {}} data-testid={`vital-card-${v.fields[0]}`}>
                        <span className="text-xs text-muted-foreground block">{v.label}</span>
                        <span className={`text-lg font-bold ${flagged ? "text-destructive" : ""}`}>{v.value}</span>
                        <span className="text-xs text-muted-foreground ml-1">{v.unit}</span>
                        {flagged && <AlertTriangle className="w-3 h-3 inline-block ml-1" style={{ color: "#E74C3C" }} />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assessment Results in Context */}
          {assessmentResponses.filter((ar: any) => ar.status === "complete").length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" style={{ color: "#277493" }} />
                  <h3 className="text-sm font-semibold">Assessment Results</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {assessmentResponses.filter((ar: any) => ar.status === "complete").map((ar: any) => {
                  const flagged = assessmentFlags.some((f: any) => f.instrumentId === ar.instrumentId);
                  return (
                    <div key={ar.id} className={`flex items-center justify-between gap-3 p-3 rounded-md border ${flagged ? "border-amber-400 dark:border-amber-700" : ""}`} style={flagged ? { backgroundColor: "rgba(254, 160, 2, 0.05)" } : {}} data-testid={`assessment-result-${ar.instrumentId}`}>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{ar.instrumentId}</span>
                        <p className="text-xs text-muted-foreground">{ar.interpretation || "Completed"}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-lg font-bold ${flagged ? "" : ""}`} style={flagged ? { color: "#FEA002" } : { color: "#277493" }}>{ar.computedScore ?? "--"}</span>
                        {flagged && <AlertTriangle className="w-4 h-4" style={{ color: "#FEA002" }} />}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Medications in Context */}
          {medRecon.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4" style={{ color: "#277493" }} />
                  <h3 className="text-sm font-semibold">Medication Reconciliation Summary</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-3 text-sm flex-wrap">
                  <span>{medRecon.length} total</span>
                  <span className="text-muted-foreground">{medRecon.filter((m: any) => m.reconciliationStatus === "verified").length} verified</span>
                  <span className="text-muted-foreground">{medRecon.filter((m: any) => m.reconciliationStatus === "new").length} new</span>
                  {medRecon.filter((m: any) => m.beersRisk || m.interactionFlag).length > 0 && (
                    <Badge variant="destructive" className="text-xs">{medRecon.filter((m: any) => m.beersRisk || m.interactionFlag).length} warnings</Badge>
                  )}
                </div>
                <div className="space-y-1">
                  {medRecon.slice(0, 6).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded-md border" data-testid={`med-context-${m.id}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{m.medicationName}</span>
                        {m.dosage && <span className="text-xs text-muted-foreground">{m.dosage}</span>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge variant="secondary" className="text-xs capitalize">{m.reconciliationStatus}</Badge>
                        {(m.beersRisk || m.interactionFlag) && <AlertTriangle className="w-3 h-3" style={{ color: "#FEA002" }} />}
                      </div>
                    </div>
                  ))}
                  {medRecon.length > 6 && <p className="text-xs text-muted-foreground text-center mt-2">+{medRecon.length - 6} more</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Known Medications from Chart */}
          {member?.medications?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4" style={{ color: "#2E456B" }} />
                  <h3 className="text-sm font-semibold">Chart Medications</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {member.medications.map((m: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{m}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick link to timeline */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/visits/${visitId}/intake/timeline`}>
              <Button variant="outline" size="sm" data-testid="button-context-timeline">
                <TrendingUp className="w-4 h-4 mr-1" /> View Full Clinical Timeline
              </Button>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
