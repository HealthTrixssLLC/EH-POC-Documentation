import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Clock,
  User,
  Calendar,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SupervisorReviews() {
  const { data: visits, isLoading } = useQuery<any[]>({ queryKey: ["/api/reviews"] });
  const { toast } = useToast();
  const [reviewVisitId, setReviewVisitId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approve" | "request_correction" | null>(null);
  const [comments, setComments] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!reviewVisitId || !decision) return;
      await apiRequest("POST", `/api/visits/${reviewVisitId}/review`, { decision, comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({ title: decision === "approve" ? "Visit approved" : "Correction requested" });
      setReviewVisitId(null);
      setDecision(null);
      setComments("");
    },
    onError: (err: any) => {
      toast({ title: "Review failed", description: err.message, variant: "destructive" });
    },
  });

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
            <Card key={v.id}>
              <CardContent className="p-4">
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
                  <div className="flex items-center gap-2">
                    {v.reviewStatus === "approved" ? (
                      <Badge variant="default" className="text-xs">Approved</Badge>
                    ) : v.reviewStatus === "correction_requested" ? (
                      <Badge variant="destructive" className="text-xs">Correction Requested</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Pending Review</Badge>
                    )}
                    <div className="flex gap-1">
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
                            onClick={() => { setReviewVisitId(v.id); setDecision("request_correction"); }}
                            data-testid={`button-correction-${v.id}`}
                          >
                            <XCircle className="w-4 h-4 text-destructive" />
                          </Button>
                        </>
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
              <ClipboardList className="w-10 h-10 mb-3 text-muted-foreground opacity-40" />
              <span className="text-sm text-muted-foreground">No visits pending review</span>
            </CardContent>
          </Card>
        )}
      </div>

      {reviewVisitId && decision && (
        <Dialog open={true} onOpenChange={() => { setReviewVisitId(null); setDecision(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {decision === "approve" ? "Approve Visit" : "Request Correction"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={decision === "approve" ? "Optional comments..." : "Describe what needs correction..."}
                className="min-h-[100px]"
                data-testid="input-review-comments"
              />
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => { setReviewVisitId(null); setDecision(null); }}>
                  Cancel
                </Button>
                <Button
                  variant={decision === "approve" ? "default" : "destructive"}
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending || (decision === "request_correction" && !comments.trim())}
                  data-testid="button-submit-review"
                >
                  {submitMutation.isPending ? "Submitting..." : decision === "approve" ? "Approve" : "Request Correction"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
