import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { usePlatform } from "@/hooks/use-platform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  ChevronRight,
  User,
  Calendar,
  ClipboardList,
  Shield,
  BarChart3,
  AlertTriangle,
  Lock,
  Loader2,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  Filter,
  Database,
  Pill,
  Stethoscope,
} from "lucide-react";
import { useState, useMemo } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RETURN_REASON_CATEGORIES } from "@shared/schema";

interface AdjudicationSummary {
  completeness: { score: number; total: number; passed: number; items: any[] };
  diagnosisSupport: { score: number; total: number; supported: number; items: any[] };
  qualityFlags: { flag: string; severity: string; description: string }[];
  overallScore: number;
  recommendation: "approve" | "review" | "return";
  hieDataAvailable: boolean;
  hieIngestionSummary: { resourceCount: number; receivedAt: string | null; status: string } | null;
  suspectedConditionsReviewed: { total: number; confirmed: number; dismissed: number; pending: number };
  hieMedReconciliationStatus: { total: number; verified: number; pending: number };
  billingReadiness?: {
    overallScore: number;
    gateResult: string;
    completenessScore: number;
    diagnosisSupportScore: number;
    codingComplianceScore: number;
  } | null;
  emEvaluation?: {
    assignedCpt: string;
    evaluatedMdmLevel: string;
    overallMdmScore: number;
    levelMatch: string;
    suggestedCpt?: string;
  } | null;
  cptDefensibility?: {
    aggregateScore: number;
    cptCount: number;
    underDocumentedCount: number;
  } | null;
  payorCompliance?: {
    passCount: number;
    failCount: number;
    warningCount: number;
    evaluatedAt: string;
  } | null;
  encounterAudit?: {
    overallScore: number;
    auditResult: string;
    flagCount: number;
    auditedAt: string;
  } | null;
  codeAlignment?: {
    alignmentScore: number;
    codesWithoutSupportCount: number;
    conditionsWithoutCodesCount: number;
    modelUsed: string;
  } | null;
}

interface EnhancedVisit {
  id: string;
  memberName: string;
  npName: string;
  scheduledDate: string;
  status: string;
  reviewStatus: string | null;
  reworkCount: number;
  completenessScore: number | null;
  diagnosisSupportScore: number | null;
  flagCount: number;
  hieDataAvailable: boolean;
  lastReturnReasons: any;
  lastReturnComments: string | null;
  lastReviewDate: string | null;
}

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === "error") return <Badge variant="destructive" className="text-xs">Error</Badge>;
  if (severity === "warning") return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Warning</Badge>;
  return <Badge variant="outline" className="text-xs">Info</Badge>;
}

function AdjudicationCard({ visitId }: { visitId: string }) {
  const { data: summary, isLoading } = useQuery<AdjudicationSummary>({
    queryKey: ["/api/visits", visitId, "adjudication-summary"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading adjudication summary...</span>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Overall Score</span>
        </div>
        <span className="text-lg font-bold" data-testid="text-adjudication-score">
          {summary.overallScore}%
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs text-muted-foreground">Completeness</span>
            <span className="text-xs font-medium">{summary.completeness.score}% ({summary.completeness.passed}/{summary.completeness.total})</span>
          </div>
          <Progress value={summary.completeness.score} className="h-2" />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs text-muted-foreground">Diagnosis Support</span>
            <span className="text-xs font-medium">{summary.diagnosisSupport.score}% ({summary.diagnosisSupport.supported}/{summary.diagnosisSupport.total})</span>
          </div>
          <Progress value={summary.diagnosisSupport.score} className="h-2" />
        </div>
      </div>

      {summary.hieDataAvailable && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-medium text-muted-foreground">HIE Pre-Visit Data</span>
              {summary.suspectedConditionsReviewed.pending === 0 && summary.hieMedReconciliationStatus.pending === 0 ? (
                <Badge variant="outline" className="text-xs text-green-700 dark:text-green-400 border-green-300 dark:border-green-700" data-testid="badge-hie-available">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Fully Reviewed
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700" data-testid="badge-hie-available">
                  Pending Review
                </Badge>
              )}
            </div>

            {summary.hieIngestionSummary && (
              <div className="text-xs text-muted-foreground pl-5" data-testid="text-hie-ingestion-info">
                {summary.hieIngestionSummary.resourceCount} resources received
                {summary.hieIngestionSummary.receivedAt && (
                  <> on {new Date(summary.hieIngestionSummary.receivedAt).toLocaleDateString()}</>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pl-5" data-testid="text-hie-conditions-status">
              <Stethoscope className="w-3 h-3 flex-shrink-0" />
              <span className="text-xs">
                Suspected Conditions: {summary.suspectedConditionsReviewed.confirmed} confirmed, {summary.suspectedConditionsReviewed.dismissed} dismissed
                {summary.suspectedConditionsReviewed.pending > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium"> ({summary.suspectedConditionsReviewed.pending} pending)</span>
                )}
              </span>
              {summary.suspectedConditionsReviewed.pending === 0 && summary.suspectedConditionsReviewed.total > 0 && (
                <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-2 pl-5" data-testid="text-hie-meds-status">
              <Pill className="w-3 h-3 flex-shrink-0" />
              <span className="text-xs">
                HIE Medications: {summary.hieMedReconciliationStatus.verified} of {summary.hieMedReconciliationStatus.total} verified
                {summary.hieMedReconciliationStatus.pending > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium"> ({summary.hieMedReconciliationStatus.pending} pending)</span>
                )}
              </span>
              {summary.hieMedReconciliationStatus.pending === 0 && summary.hieMedReconciliationStatus.total > 0 && (
                <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
              )}
            </div>
          </div>
        </>
      )}

      {summary.billingReadiness && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Billing Readiness</span>
              <Badge
                variant={summary.billingReadiness.gateResult === "pass" ? "default" : summary.billingReadiness.gateResult === "override" ? "secondary" : "destructive"}
                className="text-xs"
                data-testid="badge-adj-billing-gate"
              >
                {summary.billingReadiness.gateResult === "pass" ? "Pass" : summary.billingReadiness.gateResult === "override" ? "Overridden" : "Fail"}
              </Badge>
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs text-muted-foreground">Score</span>
                <span className="text-xs font-medium">{summary.billingReadiness.overallScore}%</span>
              </div>
              <Progress value={summary.billingReadiness.overallScore} className="h-2" />
            </div>
          </div>
        </>
      )}

      {summary.emEvaluation && summary.emEvaluation.assignedCpt && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">E/M Validation</span>
              <Badge
                variant={summary.emEvaluation.levelMatch === "match" ? "default" : summary.emEvaluation.levelMatch === "under_coded" ? "secondary" : "destructive"}
                className="text-xs"
                data-testid="badge-adj-em-match"
              >
                {summary.emEvaluation.levelMatch === "match" ? "Match" : summary.emEvaluation.levelMatch === "under_coded" ? "Under-coded" : "Over-coded"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="font-mono text-[10px]">{summary.emEvaluation.assignedCpt}</Badge>
              <span className="text-muted-foreground">MDM: {summary.emEvaluation.evaluatedMdmLevel}</span>
              <span className="text-muted-foreground">Score: {summary.emEvaluation.overallMdmScore}%</span>
            </div>
            {summary.emEvaluation.suggestedCpt && (
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                Suggested: {summary.emEvaluation.suggestedCpt}
              </div>
            )}
          </div>
        </>
      )}

      {summary.cptDefensibility && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">CPT Defensibility</span>
              <Badge
                variant={summary.cptDefensibility.aggregateScore >= 80 ? "default" : summary.cptDefensibility.aggregateScore >= 60 ? "secondary" : "destructive"}
                className="text-xs"
                data-testid="badge-adj-cpt-score"
              >
                {summary.cptDefensibility.aggregateScore}%
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{summary.cptDefensibility.cptCount} CPT code(s)</span>
              {summary.cptDefensibility.underDocumentedCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400">{summary.cptDefensibility.underDocumentedCount} under-documented</span>
              )}
            </div>
          </div>
        </>
      )}

      {summary.payorCompliance && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Payor Compliance</span>
              <Badge
                variant={summary.payorCompliance.failCount === 0 ? "default" : "destructive"}
                className="text-xs"
                data-testid="badge-adj-payor"
              >
                {summary.payorCompliance.failCount === 0 ? "Compliant" : `${summary.payorCompliance.failCount} issue(s)`}
              </Badge>
            </div>
          </div>
        </>
      )}

      {summary.encounterAudit && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Encounter Audit</span>
              <Badge
                variant={summary.encounterAudit.auditResult === "pass" ? "default" : summary.encounterAudit.auditResult === "warning" ? "secondary" : "destructive"}
                className="text-xs"
                data-testid="badge-adj-audit"
              >
                {summary.encounterAudit.auditResult === "pass" ? "Pass" : summary.encounterAudit.auditResult === "warning" ? "Warning" : "Fail"} ({summary.encounterAudit.overallScore}%)
              </Badge>
            </div>
            {summary.encounterAudit.flagCount > 0 && (
              <span className="text-xs text-muted-foreground">{summary.encounterAudit.flagCount} quality flag(s)</span>
            )}
          </div>
        </>
      )}

      {summary.codeAlignment ? (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Code Alignment</span>
              <Badge
                variant={summary.codeAlignment.alignmentScore >= 80 ? "default" : summary.codeAlignment.alignmentScore >= 60 ? "secondary" : "destructive"}
                className="text-xs"
                data-testid="badge-adj-alignment"
              >
                {summary.codeAlignment.alignmentScore}%
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className={summary.codeAlignment.codesWithoutSupportCount > 0 ? "text-amber-600 dark:text-amber-400" : ""}>
                {summary.codeAlignment.codesWithoutSupportCount} unsupported
              </span>
              <span>
                {summary.codeAlignment.conditionsWithoutCodesCount} uncoded
              </span>
              <span className="italic">{summary.codeAlignment.modelUsed}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <Separator />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Code Alignment</span>
            <span className="text-xs text-muted-foreground italic" data-testid="text-adj-alignment-na">Not analyzed</span>
          </div>
        </>
      )}

      {summary.qualityFlags.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Quality Flags</span>
            {summary.qualityFlags.map((flag, i) => (
              <div key={i} className="flex items-start gap-2" data-testid={`text-quality-flag-${i}`}>
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge severity={flag.severity} />
                  <span className="text-xs">{flag.description}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Separator />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Recommendation:</span>
        <Badge
          variant={summary.recommendation === "approve" ? "default" : summary.recommendation === "review" ? "secondary" : "destructive"}
          className="text-xs"
        >
          {summary.recommendation === "approve" ? "Approve" : summary.recommendation === "review" ? "Needs Review" : "Return"}
        </Badge>
      </div>
    </div>
  );
}

function MiniSummary({ visit }: { visit: EnhancedVisit }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {visit.hieDataAvailable && (
        <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-400 border-teal-300 dark:border-teal-700" data-testid={`badge-hie-data-${visit.id}`}>
          <Database className="w-3 h-3 mr-1" /> HIE Data
        </Badge>
      )}
      {visit.completenessScore != null && (
        <Badge variant="outline" className="text-xs">{visit.completenessScore}% complete</Badge>
      )}
      {visit.diagnosisSupportScore != null && (
        <Badge variant="outline" className="text-xs">{visit.diagnosisSupportScore}% dx supported</Badge>
      )}
      {visit.flagCount > 0 && (
        <Badge variant="secondary" className="text-xs">{visit.flagCount} flag{visit.flagCount > 1 ? "s" : ""}</Badge>
      )}
      {visit.reworkCount > 0 && (
        <Badge variant="destructive" className="text-xs">
          <RefreshCw className="w-3 h-3 mr-1" />
          {visit.reworkCount} rework{visit.reworkCount > 1 ? "s" : ""}
        </Badge>
      )}
    </div>
  );
}

function ReturnReasonsCard({ visit }: { visit: EnhancedVisit }) {
  if (!visit.lastReturnReasons) return null;
  const reasons = Array.isArray(visit.lastReturnReasons) ? visit.lastReturnReasons : [];
  if (reasons.length === 0 && !visit.lastReturnComments) return null;

  return (
    <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 space-y-1">
      <p className="text-xs font-medium text-destructive flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> Return Reasons
      </p>
      {reasons.map((r: string, i: number) => {
        const cat = RETURN_REASON_CATEGORIES.find(c => c.code === r);
        return (
          <p key={i} className="text-xs text-muted-foreground pl-4">
            {cat?.label || r}
          </p>
        );
      })}
      {visit.lastReturnComments && (
        <p className="text-xs text-muted-foreground pl-4 italic">"{visit.lastReturnComments}"</p>
      )}
      <Link href={`/visits/${visit.id}/intake`}>
        <Button variant="ghost" size="sm" className="text-xs mt-1" data-testid={`button-remediate-${visit.id}`}>
          <ExternalLink className="w-3 h-3 mr-1" /> Open Intake for Remediation
        </Button>
      </Link>
    </div>
  );
}

export default function SupervisorReviews() {
  const { isMobileLayout } = usePlatform();
  const { data: visits, isLoading } = useQuery<EnhancedVisit[]>({ queryKey: ["/api/reviews/enhanced"] });
  const { toast } = useToast();
  const [reviewVisitId, setReviewVisitId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approve" | "return" | null>(null);
  const [comments, setComments] = useState("");
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [npFilter, setNpFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");

  const toggleReason = (code: string) => {
    setSelectedReasons(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!reviewVisitId || !decision) return;
      await apiRequest("POST", `/api/visits/${reviewVisitId}/review`, {
        decision: decision === "approve" ? "approve" : "return",
        comments: comments || undefined,
        reviewerId: "supervisor-1",
        reviewerName: "Dr. Sarah Chen",
        returnReasons: decision === "return" ? selectedReasons : undefined,
        attestationText: decision === "approve"
          ? "I have reviewed the clinical documentation and attest to its completeness and accuracy."
          : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/enhanced"] });
      toast({ title: decision === "approve" ? "Visit approved and locked" : "Returned for correction" });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Review failed", description: err.message, variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setReviewVisitId(null);
    setDecision(null);
    setComments("");
    setSelectedReasons([]);
  };

  const npNames = useMemo(() => {
    const names = new Set<string>();
    visits?.forEach(v => { if (v.npName) names.add(v.npName); });
    return Array.from(names).sort();
  }, [visits]);

  const filteredAndSorted = useMemo(() => {
    let result = visits || [];

    if (statusFilter !== "all") {
      if (statusFilter === "pending") result = result.filter(v => !v.reviewStatus);
      else if (statusFilter === "approved") result = result.filter(v => v.reviewStatus === "approved");
      else if (statusFilter === "returned") result = result.filter(v => v.reviewStatus === "correction_requested");
      else if (statusFilter === "reworked") result = result.filter(v => v.reworkCount > 0);
    }

    if (npFilter !== "all") {
      result = result.filter(v => v.npName === npFilter);
    }

    const sorted = [...result];
    if (sortBy === "date") sorted.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
    else if (sortBy === "completeness") sorted.sort((a, b) => (a.completenessScore ?? 0) - (b.completenessScore ?? 0));
    else if (sortBy === "flags") sorted.sort((a, b) => b.flagCount - a.flagCount);
    else if (sortBy === "rework") sorted.sort((a, b) => b.reworkCount - a.reworkCount);

    return sorted;
  }, [visits, statusFilter, npFilter, sortBy]);

  const stats = useMemo(() => {
    if (!visits) return { total: 0, pending: 0, approved: 0, returned: 0, avgCompleteness: 0, highRisk: 0 };
    const pending = visits.filter(v => !v.reviewStatus).length;
    const approved = visits.filter(v => v.reviewStatus === "approved").length;
    const returned = visits.filter(v => v.reviewStatus === "correction_requested").length;
    const completenessScores = visits.filter(v => v.completenessScore != null).map(v => v.completenessScore!);
    const avgCompleteness = completenessScores.length > 0 ? Math.round(completenessScores.reduce((a, b) => a + b, 0) / completenessScores.length) : 0;
    const highRisk = visits.filter(v => v.flagCount > 0 || v.reworkCount > 0).length;
    return { total: visits.length, pending, approved, returned, avgCompleteness, highRisk };
  }, [visits]);

  return (
    <div className={`space-y-6 ${isMobileLayout ? "pb-20" : ""}`}>
      <div>
        <h1 className="text-xl font-bold" data-testid="text-review-queue-title">Review Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Finalized visits pending clinical review
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold" data-testid="text-review-total">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-review-pending">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-review-approved">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Returned</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400" data-testid="text-review-returned">{stats.returned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Avg Completeness</p>
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400" data-testid="text-review-avg-completeness">{stats.avgCompleteness}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">High Risk</p>
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-review-high-risk">{stats.highRisk}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Filters:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36" data-testid="select-review-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="reworked">Has Rework</SelectItem>
          </SelectContent>
        </Select>
        <Select value={npFilter} onValueChange={setNpFilter}>
          <SelectTrigger className="w-40" data-testid="select-review-np">
            <SelectValue placeholder="NP" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All NPs</SelectItem>
            {npNames.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40" data-testid="select-review-sort">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date (newest)</SelectItem>
            <SelectItem value="completeness">Completeness (lowest)</SelectItem>
            <SelectItem value="flags">Flags (most)</SelectItem>
            <SelectItem value="rework">Rework count</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filteredAndSorted.length} visits</span>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : filteredAndSorted.length > 0 ? (
          filteredAndSorted.map((v) => (
            <Card key={v.id} data-testid={`card-review-visit-${v.id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-md flex-shrink-0 ${
                        v.reviewStatus === "approved" ? "bg-green-100 dark:bg-green-900/30" :
                        v.reviewStatus === "correction_requested" ? "bg-red-100 dark:bg-red-900/30" :
                        "bg-amber-100 dark:bg-amber-900/30"
                      }`}>
                        <FileCheck className={`w-5 h-5 ${
                          v.reviewStatus === "approved" ? "text-green-600 dark:text-green-400" :
                          v.reviewStatus === "correction_requested" ? "text-red-600 dark:text-red-400" :
                          "text-amber-600 dark:text-amber-400"
                        }`} />
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-semibold truncate" data-testid={`text-review-member-${v.id}`}>
                          {v.memberName || "Unknown Patient"}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {v.scheduledDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {v.npName || "NP"}
                          </span>
                          {v.lastReviewDate && (
                            <span className="text-xs text-muted-foreground">
                              Last review: {new Date(v.lastReviewDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {v.reviewStatus === "approved" ? (
                        <Badge variant="default" className="text-xs">
                          <Lock className="w-3 h-3 mr-1" /> Approved
                        </Badge>
                      ) : v.reviewStatus === "correction_requested" ? (
                        <Badge variant="destructive" className="text-xs">Correction Requested</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Pending Review</Badge>
                      )}
                      <div className="flex gap-1 flex-wrap">
                        <Link href={`/visits/${v.id}/detail`}>
                          <Button variant="outline" size="sm" data-testid={`button-view-detail-${v.id}`}>
                            View <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                        {!v.reviewStatus && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setReviewVisitId(v.id); setDecision("approve"); }}
                              data-testid={`button-approve-${v.id}`}
                            >
                              <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setReviewVisitId(v.id); setDecision("return"); }}
                              data-testid={`button-correction-${v.id}`}
                            >
                              <XCircle className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <MiniSummary visit={v} />

                  {v.reviewStatus === "correction_requested" && (
                    <ReturnReasonsCard visit={v} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <ClipboardList className="w-10 h-10 mb-3 text-muted-foreground opacity-40" />
              <span className="text-sm text-muted-foreground">No visits matching filters</span>
            </CardContent>
          </Card>
        )}
      </div>

      {reviewVisitId && decision && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {decision === "approve" ? (
                  <>
                    <Shield className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    Approve & Sign Visit
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-destructive" />
                    Return for Correction
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <AdjudicationCard visitId={reviewVisitId} />

              <Separator />

              {decision === "approve" ? (
                <div className="space-y-4">
                  <div className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Attestation</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      I have reviewed the clinical documentation and attest to its completeness and accuracy.
                      By signing below, I confirm that this encounter meets all clinical and regulatory requirements.
                    </p>
                    <div className="pt-1">
                      <span className="text-xs text-muted-foreground">Signed by:</span>
                      <span className="text-sm font-medium ml-2">Dr. Sarah Chen, MD</span>
                    </div>
                  </div>
                  <Textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Optional comments..."
                    className="min-h-[60px]"
                    data-testid="input-review-comments"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                    <Button
                      onClick={() => submitMutation.mutate()}
                      disabled={submitMutation.isPending}
                      data-testid="button-approve-sign"
                    >
                      {submitMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Signing...</>
                      ) : (
                        <><Lock className="w-4 h-4 mr-1" /> Approve & Sign</>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Return Reasons</span>
                    <div className="space-y-2">
                      {RETURN_REASON_CATEGORIES.map((cat) => (
                        <label
                          key={cat.code}
                          className="flex items-start gap-2 cursor-pointer rounded-md border p-2"
                        >
                          <Checkbox
                            checked={selectedReasons.includes(cat.code)}
                            onCheckedChange={() => toggleReason(cat.code)}
                            data-testid={`checkbox-return-reason-${cat.code}`}
                            className="mt-0.5"
                          />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium leading-none">{cat.label}</span>
                            <span className="text-xs text-muted-foreground">{cat.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Additional comments..."
                    className="min-h-[60px]"
                    data-testid="input-review-comments"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                    <Button
                      variant="destructive"
                      onClick={() => submitMutation.mutate()}
                      disabled={submitMutation.isPending || (selectedReasons.length === 0 && !comments.trim())}
                      data-testid="button-return-correction"
                    >
                      {submitMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Submitting...</>
                      ) : (
                        "Return for Correction"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
