import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardCheck,
  Shuffle,
  Calendar,
  User,
  ChevronRight,
  FileSearch,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Target,
  BarChart3,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { AUDIT_FINDING_CATEGORIES, AUDIT_SEVERITIES, AUDIT_RECOMMENDATIONS } from "@shared/schema";

interface AuditAssignment {
  id: string;
  visitId: string;
  assignedTo: string | null;
  assignedToName: string | null;
  status: string;
  samplingReason: string | null;
  priority: string | null;
  dueDate: string | null;
  assignedAt: string;
  completedAt: string | null;
  memberName: string;
  scheduledDate: string;
  visitStatus: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge variant="default" className="text-xs">Completed</Badge>;
  if (status === "in_progress") return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">In Progress</Badge>;
  return <Badge variant="outline" className="text-xs">Pending</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "high") return <Badge variant="destructive" className="text-xs">High</Badge>;
  if (priority === "urgent") return <Badge variant="destructive" className="text-xs">Urgent</Badge>;
  return null;
}

function SeverityLabel({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    none: "text-green-600 dark:text-green-400",
    minor: "text-blue-600 dark:text-blue-400",
    moderate: "text-amber-600 dark:text-amber-400",
    major: "text-orange-600 dark:text-orange-400",
    critical: "text-red-600 dark:text-red-400",
  };
  return <span className={`text-xs font-medium capitalize ${colors[severity] || ""}`}>{severity}</span>;
}

export default function AuditQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [samplePercent, setSamplePercent] = useState(20);
  const [showSampleDialog, setShowSampleDialog] = useState(false);
  const [outcomeAssignment, setOutcomeAssignment] = useState<AuditAssignment | null>(null);
  const [findings, setFindings] = useState<Record<string, { checked: boolean; description: string; severity: string }>>({});
  const [overallSeverity, setOverallSeverity] = useState("none");
  const [recommendation, setRecommendation] = useState("accept");
  const [outcomeNotes, setOutcomeNotes] = useState("");

  const { data: assignments, isLoading } = useQuery<AuditAssignment[]>({
    queryKey: ["/api/audit-assignments"],
  });

  const sampleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/audit-assignments/sample", { samplePercent });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-assignments"] });
      toast({ title: `Sampled ${data.sampled} visits from ${data.total} eligible` });
      setShowSampleDialog(false);
    },
    onError: (err: any) => toast({ title: "Sampling failed", description: err.message, variant: "destructive" }),
  });

  const outcomeMutation = useMutation({
    mutationFn: async () => {
      if (!outcomeAssignment) return;
      const findingsList = Object.entries(findings)
        .filter(([_, v]) => v.checked)
        .map(([code, v]) => ({
          category: code,
          description: v.description || AUDIT_FINDING_CATEGORIES.find(c => c.code === code)?.label || code,
          severity: v.severity,
        }));

      await apiRequest("POST", "/api/audit-outcomes", {
        assignmentId: outcomeAssignment.id,
        visitId: outcomeAssignment.visitId,
        reviewerId: user?.id,
        reviewerName: user?.fullName,
        findings: findingsList,
        overallSeverity,
        recommendation,
        notes: outcomeNotes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-assignments"] });
      toast({ title: "Audit outcome recorded" });
      closeOutcomeDialog();
    },
    onError: (err: any) => toast({ title: "Failed to save outcome", description: err.message, variant: "destructive" }),
  });

  const closeOutcomeDialog = () => {
    setOutcomeAssignment(null);
    setFindings({});
    setOverallSeverity("none");
    setRecommendation("accept");
    setOutcomeNotes("");
  };

  const filtered = assignments?.filter(a => statusFilter === "all" || a.status === statusFilter) || [];

  const stats = {
    total: assignments?.length || 0,
    pending: assignments?.filter(a => a.status === "pending").length || 0,
    inProgress: assignments?.filter(a => a.status === "in_progress").length || 0,
    completed: assignments?.filter(a => a.status === "completed").length || 0,
  };

  if (user?.role !== "admin" && user?.role !== "compliance") {
    return (
      <div className="flex items-center justify-center py-20">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Access restricted to Compliance and Admin roles</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-audit-queue-title">Audit Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Human audit workflow for encounter quality review</p>
        </div>
        <Button onClick={() => setShowSampleDialog(true)} data-testid="button-sample-visits">
          <Shuffle className="w-4 h-4 mr-2" />
          Sample Visits
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Assignments</p>
            <p className="text-2xl font-bold mt-1" data-testid="text-audit-total">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending Review</p>
            <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400" data-testid="text-audit-pending">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold mt-1" style={{ color: "#277493" }} data-testid="text-audit-in-progress">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400" data-testid="text-audit-completed">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-audit-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} assignments</span>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : filtered.length > 0 ? (
          filtered.map((a) => (
            <Card key={a.id} data-testid={`card-audit-assignment-${a.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md flex-shrink-0" style={{ backgroundColor: "#2E456B15" }}>
                      <FileSearch className="w-5 h-5" style={{ color: "#2E456B" }} />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-semibold truncate" data-testid={`text-audit-member-${a.id}`}>
                        {a.memberName}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {a.scheduledDate}
                        </span>
                        {a.samplingReason && (
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" /> {a.samplingReason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={a.status} />
                    <PriorityBadge priority={a.priority || "normal"} />
                    <div className="flex gap-1 flex-wrap">
                      <Link href={`/visits/${a.visitId}/detail`}>
                        <Button variant="outline" size="sm" data-testid={`button-view-visit-${a.id}`}>
                          View <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                      {a.status !== "completed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setOutcomeAssignment(a)}
                          data-testid={`button-record-outcome-${a.id}`}
                        >
                          <ClipboardCheck className="w-4 h-4" style={{ color: "#277493" }} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <ClipboardCheck className="w-10 h-10 mb-3 text-muted-foreground opacity-40" />
              <span className="text-sm text-muted-foreground">No audit assignments found</span>
              <span className="text-xs text-muted-foreground mt-1">Use "Sample Visits" to create assignments</span>
            </CardContent>
          </Card>
        )}
      </div>

      {showSampleDialog && (
        <Dialog open={true} onOpenChange={() => setShowSampleDialog(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shuffle className="w-5 h-5" style={{ color: "#277493" }} />
                Random Sampling
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sample Percentage</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={5}
                    max={100}
                    value={samplePercent}
                    onChange={(e) => setSamplePercent(Number(e.target.value))}
                    className="w-24"
                    data-testid="input-sample-percent"
                  />
                  <span className="text-sm text-muted-foreground">% of eligible visits</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Selects from finalized and in-progress visits not yet assigned for audit.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setShowSampleDialog(false)}>Cancel</Button>
                <Button
                  onClick={() => sampleMutation.mutate()}
                  disabled={sampleMutation.isPending}
                  data-testid="button-run-sample"
                >
                  {sampleMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Sampling...</>
                  ) : (
                    "Run Sample"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {outcomeAssignment && (
        <Dialog open={true} onOpenChange={closeOutcomeDialog}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" style={{ color: "#277493" }} />
                Record Audit Outcome
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-sm font-medium">{outcomeAssignment.memberName}</p>
                <p className="text-xs text-muted-foreground">Visit: {outcomeAssignment.scheduledDate}</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <span className="text-sm font-medium">Findings</span>
                <div className="space-y-2">
                  {AUDIT_FINDING_CATEGORIES.map((cat) => (
                    <div key={cat.code} className="rounded-md border p-2 space-y-2">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <Checkbox
                          checked={findings[cat.code]?.checked || false}
                          onCheckedChange={(checked) => {
                            setFindings(prev => ({
                              ...prev,
                              [cat.code]: {
                                ...prev[cat.code],
                                checked: !!checked,
                                description: prev[cat.code]?.description || "",
                                severity: prev[cat.code]?.severity || "minor",
                              },
                            }));
                          }}
                          data-testid={`checkbox-finding-${cat.code}`}
                          className="mt-0.5"
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium leading-none">{cat.label}</span>
                          <span className="text-xs text-muted-foreground">{cat.description}</span>
                        </div>
                      </label>
                      {findings[cat.code]?.checked && (
                        <div className="pl-6 space-y-2">
                          <Select
                            value={findings[cat.code]?.severity || "minor"}
                            onValueChange={(val) => {
                              setFindings(prev => ({
                                ...prev,
                                [cat.code]: { ...prev[cat.code], severity: val },
                              }));
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AUDIT_SEVERITIES.filter(s => s !== "none").map(s => (
                                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Additional notes..."
                            value={findings[cat.code]?.description || ""}
                            onChange={(e) => {
                              setFindings(prev => ({
                                ...prev,
                                [cat.code]: { ...prev[cat.code], description: e.target.value },
                              }));
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Overall Severity</Label>
                  <Select value={overallSeverity} onValueChange={setOverallSeverity}>
                    <SelectTrigger data-testid="select-overall-severity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIT_SEVERITIES.map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Recommendation</Label>
                  <Select value={recommendation} onValueChange={setRecommendation}>
                    <SelectTrigger data-testid="select-recommendation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIT_RECOMMENDATIONS.map(r => (
                        <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Textarea
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                placeholder="Additional audit notes..."
                className="min-h-[60px]"
                data-testid="input-audit-notes"
              />

              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={closeOutcomeDialog}>Cancel</Button>
                <Button
                  onClick={() => outcomeMutation.mutate()}
                  disabled={outcomeMutation.isPending}
                  data-testid="button-submit-outcome"
                >
                  {outcomeMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 mr-1" /> Record Outcome</>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
