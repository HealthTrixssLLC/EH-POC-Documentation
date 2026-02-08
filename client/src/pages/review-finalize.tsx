import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PenLine,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ReviewFinalize() {
  const [, params] = useRoute("/visits/:id/finalize");
  const visitId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [signature, setSignature] = useState("");

  const { data: bundle, isLoading } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "bundle"],
    enabled: !!visitId,
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/visits/${visitId}/finalize`, {
        signature,
        attestationText: "I attest that the information documented in this visit record is accurate and complete to the best of my professional knowledge.",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      toast({ title: "Visit finalized successfully" });
      setLocation("/visits");
    },
    onError: (err: any) => {
      toast({ title: "Finalization failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const visit = bundle?.visit;
  const member = bundle?.member;
  const checklist = bundle?.checklist || [];
  const vitals = bundle?.vitals;

  const identityOk = visit?.identityVerified;
  const vitalsOk = !!vitals;
  const allChecklistDone = checklist.every((c: any) => c.status === "complete" || c.status === "unable_to_assess");
  const canFinalize = identityOk && vitalsOk && allChecklistDone && signature.trim().length > 0;
  const incompleteItems = checklist.filter((c: any) => c.status !== "complete" && c.status !== "unable_to_assess");

  if (visit?.status === "finalized" || visit?.status === "ready_for_review") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/visits">
            <Button variant="ghost" size="sm"><ChevronLeft className="w-4 h-4 mr-1" /> Visits</Button>
          </Link>
          <h1 className="text-xl font-bold">Visit Finalized</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle2 className="w-12 h-12 mb-3" style={{ color: "#277493" }} />
            <h2 className="text-lg font-semibold">This visit has been finalized</h2>
            <p className="text-sm text-muted-foreground mt-1">Signed at {visit?.signedAt} by {visit?.signedBy}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={`/visits/${visitId}/intake`}>
          <Button variant="ghost" size="sm" data-testid="button-back-intake">
            <ChevronLeft className="w-4 h-4 mr-1" /> Intake
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-finalize-title">Review & Finalize</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {member?.firstName} {member?.lastName} - {visit?.scheduledDate}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" style={{ color: "#2E456B" }} />
            <h2 className="text-base font-semibold">Finalization Checklist</h2>
          </div>
          <p className="text-sm text-muted-foreground">All items must be complete before signing</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <GatingItem label="Identity Verified" ok={identityOk} link={`/visits/${visitId}/intake/identity`} />
          <GatingItem label="Vitals & Exam Recorded" ok={vitalsOk} link={`/visits/${visitId}/intake/vitals`} />

          <Separator className="my-2" />

          <span className="text-xs font-medium text-muted-foreground">Required Assessments & Measures</span>
          {checklist.map((item: any) => (
            <GatingItem
              key={item.id}
              label={item.itemName}
              ok={item.status === "complete" || item.status === "unable_to_assess"}
              link={item.itemType === "assessment" ? `/visits/${visitId}/intake/assessment/${item.itemId}` : `/visits/${visitId}/intake/measure/${item.itemId}`}
              status={item.status}
            />
          ))}
        </CardContent>
      </Card>

      {!canFinalize && incompleteItems.length > 0 && (
        <Card className="border-destructive/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-destructive mt-0.5" />
            <div>
              <span className="text-sm font-medium text-destructive" data-testid="text-gating-warning">
                Cannot finalize - {incompleteItems.length} item{incompleteItems.length !== 1 ? "s" : ""} incomplete
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete all required items or provide structured unable-to-assess reasons before signing.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PenLine className="w-5 h-5" style={{ color: "#277493" }} />
            <h2 className="text-base font-semibold">Attestation & Signature</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-md border bg-muted/50 text-sm">
            I attest that the information documented in this visit record is accurate and complete to the best
            of my professional knowledge. I have personally performed or supervised the services documented herein.
          </div>
          <div className="space-y-2">
            <Label>Electronic Signature (type your full name)</Label>
            <Textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Type your full name to sign..."
              className="font-serif text-lg"
              data-testid="input-signature"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => finalizeMutation.mutate()}
            disabled={!canFinalize || finalizeMutation.isPending}
            data-testid="button-finalize-visit"
          >
            {finalizeMutation.isPending ? "Finalizing..." : "Finalize & Sign Visit"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function GatingItem({ label, ok, link, status }: { label: string; ok: boolean; link: string; status?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 p-2 rounded-md border flex-wrap">
      <div className="flex items-center gap-2 min-w-0">
        {ok ? (
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#277493" }} />
        ) : (
          <XCircle className="w-4 h-4 flex-shrink-0 text-destructive" />
        )}
        <span className="text-sm truncate">{label}</span>
        {status && (
          <Badge variant="secondary" className="text-xs capitalize">
            {status.replace(/_/g, " ")}
          </Badge>
        )}
      </div>
      {!ok && (
        <Link href={link}>
          <Button variant="ghost" size="sm" className="text-xs">
            Go <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      )}
    </div>
  );
}
