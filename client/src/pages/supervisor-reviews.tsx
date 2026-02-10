import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RETURN_REASON_CATEGORIES } from "@shared/schema";

interface AdjudicationSummary {
  completeness: { score: number; total: number; passed: number; items: any[] };
  diagnosisSupport: { score: number; total: number; supported: number; items: any[] };
  qualityFlags: { flag: string; severity: string; description: string }[];
  overallScore: number;
  recommendation: "approve" | "review" | "return";
}

function getRecommendationColor(rec: string) {
  if (rec === "approve") return "border-l-green-500";
  if (rec === "review") return "border-l-amber-500";
  return "border-l-red-500";
}

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === "error") return <Badge variant="destructive" className="text-xs">Error</Badge>;
  if (severity === "warning") return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Warning</Badge>;
  return <Badge variant="outline" className="text-xs">Info</Badge>;
}

function AdjudicationCard({ visitId }: { visitId: string }) {
  const { data: summary, isLoading } = useQuery<AdjudicationSummary>({
    queryKey: ["/api/visits", visitId, "adjudication-summary"],
    queryFn: async () => {
      const res = await fetch(`/api/visits/${visitId}/adjudication-summary`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
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

function MiniSummary({ visitId }: { visitId: string }) {
  const { data: summary } = useQuery<AdjudicationSummary>({
    queryKey: ["/api/visits", visitId, "adjudication-summary"],
    queryFn: async () => {
      const res = await fetch(`/api/visits/${visitId}/adjudication-summary`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60000,
  });

  if (!summary) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="outline" className="text-xs">{summary.completeness.score}% complete</Badge>
      <Badge variant="outline" className="text-xs">{summary.diagnosisSupport.supported}/{summary.diagnosisSupport.total} dx supported</Badge>
      {summary.qualityFlags.length > 0 && (
        <Badge variant="secondary" className="text-xs">{summary.qualityFlags.length} flag{summary.qualityFlags.length > 1 ? "s" : ""}</Badge>
      )}
    </div>
  );
}

export default function SupervisorReviews() {
  const { data: visits, isLoading } = useQuery<any[]>({ queryKey: ["/api/reviews"] });
  const { toast } = useToast();
  const [reviewVisitId, setReviewVisitId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approve" | "return" | null>(null);
  const [comments, setComments] = useState("");
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-review-queue-title">Review Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Finalized visits pending clinical review
        </p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : visits?.length ? (
          visits.map((v: any) => (
            <Card key={v.id} className={`border-l-4 rounded-none rounded-r-md ${
              v.reviewStatus === "approved" ? "border-l-green-500" :
              v.reviewStatus === "correction_requested" ? "border-l-red-500" :
              "border-l-amber-500"
            }`}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap">
                      <div className="flex items-center justify-center w-10 h-10 rounded-md flex-shrink-0" style={{ backgroundColor: "#2E456B15" }}>
                        <FileCheck className="w-5 h-5" style={{ color: "#2E456B" }} />
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
                              <CheckCircle2 className="w-4 h-4" style={{ color: "#277493" }} />
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
                  {!v.reviewStatus && (
                    <MiniSummary visitId={v.id} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <ClipboardList className="w-10 h-10 mb-3 text-muted-foreground opacity-40" />
              <span className="text-sm text-muted-foreground">No visits pending review</span>
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
                    <Shield className="w-5 h-5" style={{ color: "#277493" }} />
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
