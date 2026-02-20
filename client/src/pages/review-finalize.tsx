import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  PenLine,
  ShieldCheck,
  ArrowRight,
  Code2,
  RefreshCw,
  Check,
  Trash2,
  Lightbulb,
  Stethoscope,
  Info,
  DollarSign,
  Activity,
  Loader2,
  Shield,
  FileCheck,
  ClipboardCheck,
  GitCompareArrows,
  History,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePlatform } from "@/hooks/use-platform";

export default function ReviewFinalize() {
  const { isMobileLayout } = usePlatform();
  const [, params] = useRoute("/visits/:id/finalize");
  const visitId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [signature, setSignature] = useState("");
  const [showEmOverrideDialog, setShowEmOverrideDialog] = useState(false);
  const [showBillingOverrideDialog, setShowBillingOverrideDialog] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [codeSwapDialog, setCodeSwapDialog] = useState<{ codeId: string; oldCode: string; oldDesc: string; oldCodeType: string; suggestedCode?: string; suggestedDesc?: string; reason?: string } | null>(null);
  const [swapNewCode, setSwapNewCode] = useState("");
  const [swapNewDesc, setSwapNewDesc] = useState("");
  const [swapReason, setSwapReason] = useState("");
  const [addCodeDialog, setAddCodeDialog] = useState<{ condition: string; suggestedCode: string; suggestedDesc?: string } | null>(null);
  const [addCodeValue, setAddCodeValue] = useState("");
  const [addCodeType, setAddCodeType] = useState("ICD-10");
  const [addCodeDesc, setAddCodeDesc] = useState("");

  const { data: bundle, isLoading } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "bundle"],
    enabled: !!visitId,
  });

  const { data: codes = [] } = useQuery<any[]>({
    queryKey: ["/api/visits", visitId, "codes"],
    enabled: !!visitId,
  });

  const { data: codeEvidence = [] } = useQuery<any[]>({
    queryKey: ["/api/visits", visitId, "code-evidence"],
    enabled: !!visitId,
  });

  const { data: noteSignatures = [] } = useQuery<any[]>({
    queryKey: ["/api/visits", visitId, "note-signatures"],
    enabled: !!visitId,
  });

  const { data: noteEdits = [] } = useQuery<any[]>({
    queryKey: ["/api/visits", visitId, "note-edits"],
    enabled: !!visitId,
  });

  const { data: visitTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/visits", visitId, "tasks"],
    enabled: !!visitId,
  });

  const { data: noteAddenda = [] } = useQuery<any[]>({
    queryKey: ["/api/visits", visitId, "note-addenda"],
    enabled: !!visitId,
  });

  const { data: recommendations = [] } = useQuery<any[]>({
    queryKey: ["/api/visits", visitId, "recommendations"],
    enabled: !!visitId,
  });

  const { data: overrides = [] } = useQuery<any[]>({
    queryKey: ["/api/visits", visitId, "overrides"],
    enabled: !!visitId,
  });

  const { data: completeness } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "completeness"],
    enabled: !!visitId,
  });

  const { data: billingReadiness } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "billing-readiness"],
    enabled: !!visitId,
  });

  const { data: emEvaluation } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "em-evaluation"],
    enabled: !!visitId,
  });

  const { data: cptDefensibility } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "cpt-defensibility"],
    enabled: !!visitId,
  });

  const { data: payorCompliance } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "payor-compliance"],
    enabled: !!visitId,
  });

  const { data: encounterAudit } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "encounter-audit"],
    enabled: !!visitId,
  });

  const { data: codeAlignment } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "code-alignment"],
    enabled: !!visitId,
  });

  const { data: changeHistory } = useQuery<any[]>({
    queryKey: ["/api/visits", visitId, "change-history"],
    enabled: !!visitId,
  });

  const [diagValidation, setDiagValidation] = useState<any>(null);

  const validateDiagnosesMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", `/api/visits/${visitId}/diagnoses/validate`, {});
      return resp.json();
    },
    onSuccess: (data) => {
      setDiagValidation(data);
    },
  });

  const bundleFingerprint = bundle ? JSON.stringify({
    vitals: bundle.vitals?.id,
    assessments: bundle.assessmentResponses?.length,
    meds: bundle.medReconciliation?.length,
    tasks: bundle.tasks?.length,
    consents: bundle.consents?.length,
    note: bundle.clinicalNote?.id,
    checklist: bundle.checklist?.map((c: any) => c.status).join(","),
  }) : "";

  useEffect(() => {
    if (visitId && codes.length > 0) {
      validateDiagnosesMutation.mutate();
    }
  }, [visitId, codes.length]);

  const evaluateBillingReadinessMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", `/api/visits/${visitId}/billing-readiness`, {});
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "billing-readiness"] });
      toast({ title: "Billing readiness evaluated" });
    },
  });

  const evaluateEmMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", `/api/visits/${visitId}/em-evaluation`, {});
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "em-evaluation"] });
      toast({ title: "E/M evaluation complete" });
    },
  });

  const evaluateCptDefensibilityMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", `/api/visits/${visitId}/cpt-defensibility`, {});
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "cpt-defensibility"] });
      toast({ title: "CPT defensibility evaluated" });
    },
  });

  const evaluatePayorComplianceMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", `/api/visits/${visitId}/payor-compliance`, {});
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "payor-compliance"] });
      toast({ title: "Payor compliance evaluated" });
    },
  });

  const runEncounterAuditMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", `/api/visits/${visitId}/encounter-audit`, {});
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "encounter-audit"] });
      toast({ title: "Encounter audit complete" });
    },
  });

  const runCodeAlignmentMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", `/api/visits/${visitId}/code-alignment`, {});
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "code-alignment"] });
      toast({ title: "Code alignment analysis complete" });
    },
  });

  const swapCodeMutation = useMutation({
    mutationFn: async ({ codeId, newCode, newDescription, newCodeType, reason }: { codeId: string; newCode: string; newDescription: string; newCodeType?: string; reason?: string }) => {
      const resp = await apiRequest("POST", `/api/codes/${codeId}/swap`, { newCode, newDescription, newCodeType, reason });
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "code-alignment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "bundle"] });
      setCodeSwapDialog(null);
      setSwapNewCode("");
      setSwapNewDesc("");
      setSwapReason("");
      toast({ title: "Code corrected successfully" });
    },
  });

  const addCodeMutation = useMutation({
    mutationFn: async ({ code, codeType, description, reason }: { code: string; codeType: string; description: string; reason?: string }) => {
      const resp = await apiRequest("POST", `/api/visits/${visitId}/codes/add`, { code, codeType, description, reason });
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "code-alignment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "bundle"] });
      setAddCodeDialog(null);
      setAddCodeValue("");
      setAddCodeDesc("");
      setAddCodeType("ICD-10");
      toast({ title: "Code added successfully" });
    },
  });

  const removeCodeMutation = useMutation({
    mutationFn: async (codeId: string) => {
      const resp = await apiRequest("PATCH", `/api/codes/${codeId}`, { removedByNp: true });
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "code-alignment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "bundle"] });
      toast({ title: "Code removed" });
    },
  });

  const billingOverrideMutation = useMutation({
    mutationFn: async (reason: string) => {
      const resp = await apiRequest("POST", `/api/visits/${visitId}/billing-readiness/override`, {
        overrideReason: reason,
        overrideBy: "np",
      });
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "billing-readiness"] });
      setShowBillingOverrideDialog(false);
      setOverrideReason("");
      toast({ title: "Billing gate overridden" });
    },
  });

  const generateCodesMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", `/api/visits/${visitId}/generate-codes`, {});
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "codes"] });
      toast({ title: "Codes regenerated" });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      await apiRequest("PATCH", `/api/codes/${id}`, { verified });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "codes"] });
    },
  });

  const verifyAllCodesMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", `/api/visits/${visitId}/codes/verify-all`, {});
      return resp.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "progress-note"] });
      toast({ title: `${data.verified} code(s) verified` });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (acknowledgeEmMismatch?: boolean) => {
      const resp = await apiRequest("POST", `/api/visits/${visitId}/finalize`, {
        signature,
        attestationText: "I attest that the information documented in this visit record is accurate and complete to the best of my professional knowledge.",
        acknowledgeEmMismatch,
      });
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      toast({ title: "Visit finalized successfully" });
      setLocation("/visits");
    },
    onError: async (err: any) => {
      try {
        const msg = err.message || "";
        const jsonStart = msg.indexOf("{");
        if (jsonStart >= 0) {
          const errData = JSON.parse(msg.slice(jsonStart));
          if (errData.emWarning) {
            setShowEmOverrideDialog(true);
            return;
          }
        }
      } catch {}
      toast({ title: "Finalization failed", description: err.message, variant: "destructive" });
    },
  });

  const autoTriggerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFingerprintRef = useRef<string>("");

  useEffect(() => {
    if (!visitId || !bundle || !codes) return;
    const currentFp = `${bundleFingerprint}-${codes.length}`;
    if (currentFp === lastFingerprintRef.current) return;
    lastFingerprintRef.current = currentFp;

    if (autoTriggerRef.current) clearTimeout(autoTriggerRef.current);
    autoTriggerRef.current = setTimeout(() => {
      if (!evaluateBillingReadinessMutation.isPending) evaluateBillingReadinessMutation.mutate();
      if (!evaluateEmMutation.isPending) evaluateEmMutation.mutate();
      if (!evaluateCptDefensibilityMutation.isPending) evaluateCptDefensibilityMutation.mutate();
      if (!evaluatePayorComplianceMutation.isPending) evaluatePayorComplianceMutation.mutate();
      if (!runEncounterAuditMutation.isPending) runEncounterAuditMutation.mutate();
      if (!runCodeAlignmentMutation.isPending) runCodeAlignmentMutation.mutate();
    }, 500);

    return () => {
      if (autoTriggerRef.current) clearTimeout(autoTriggerRef.current);
    };
  }, [visitId, bundleFingerprint, codes.length]);

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

  const completenessOk = completeness?.complete === true;
  const canFinalize = completenessOk && signature.trim().length > 0;
  const completenessItems = completeness?.items || [];
  const failedRequired = completenessItems.filter((i: any) => i.status === "failed" && i.required);

  const activeCodes = codes.filter((c: any) => !c.removedByNp);
  const pendingRecs = recommendations.filter((r: any) => r.status === "pending");
  const dismissedRecs = recommendations.filter((r: any) => r.status === "dismissed");

  const cptCodes = activeCodes.filter((c: any) => c.codeType === "CPT");
  const hcpcsCodes = activeCodes.filter((c: any) => c.codeType === "HCPCS");
  const icdCodes = activeCodes.filter((c: any) => c.codeType === "ICD-10");

  if (visit?.status === "finalized" || visit?.status === "ready_for_review") {
    return (
      <div className={`space-y-6 ${isMobileLayout ? "pb-20" : ""}`}>
        {isMobileLayout ? (
          <h1 className="text-lg font-bold pt-2">Review & Finalize</h1>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/visits">
              <Button variant="ghost" size="sm"><ChevronLeft className="w-4 h-4 mr-1" /> Visits</Button>
            </Link>
            <h1 className="text-xl font-bold">Visit Finalized</h1>
          </div>
        )}
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
    <div className={`space-y-6 ${isMobileLayout ? "pb-20" : ""}`}>
      {isMobileLayout ? (
        <h1 className="text-lg font-bold pt-2">Review & Finalize</h1>
      ) : (
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
      )}

      {pendingRecs.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-600">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" style={{ color: "#FEA002" }} />
              <h2 className="text-base font-semibold" data-testid="text-pending-recommendations">
                Unresolved Recommendations ({pendingRecs.length})
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">Review before finalizing</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRecs.map((r: any) => (
              <div key={r.id} className="flex items-start gap-2 p-2 rounded-md border text-sm" data-testid={`pending-rec-${r.ruleId}`}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#FEA002" }} />
                <div className="min-w-0">
                  <span className="font-medium">{r.ruleName}</span>
                  <p className="text-xs text-muted-foreground">{r.recommendation}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5" style={{ color: "#277493" }} />
              <h2 className="text-base font-semibold" data-testid="text-coding-title">Auto-Generated Codes</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {activeCodes.some((c: any) => !c.verified) && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => verifyAllCodesMutation.mutate()}
                  disabled={verifyAllCodesMutation.isPending}
                  data-testid="button-verify-all-codes"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  {verifyAllCodesMutation.isPending ? "Verifying..." : `Verify All (${activeCodes.filter((c: any) => !c.verified).length})`}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateCodesMutation.mutate()}
                disabled={generateCodesMutation.isPending}
                data-testid="button-regenerate-codes"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                {generateCodesMutation.isPending ? "Generating..." : "Regenerate"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Review and verify codes before finalizing. Codes are auto-assigned based on visit data.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-codes">
              No codes generated yet. Save vitals and complete assessments, then regenerate.
            </p>
          ) : (
            <>
              {(() => {
                const flaggedCodes = activeCodes.filter((c: any) => {
                  const ev = codeEvidence.find((e: any) => e.id === c.id);
                  return ev?.evidenceStatus === "missing_evidence" || ev?.evidenceStatus === "partially_supported";
                });
                if (flaggedCodes.length === 0) return null;
                const remediationMap: Record<string, string> = {
                  vitals: `/visits/${visitId}/vitals`,
                  assessments: `/visits/${visitId}/intake`,
                  intake: `/visits/${visitId}/intake`,
                };
                const remediationSections = new Set<string>();
                flaggedCodes.forEach((c: any) => {
                  const ev = codeEvidence.find((e: any) => e.id === c.id);
                  ev?.evidenceMap?.missing?.forEach((m: string) => {
                    const lower = m.toLowerCase();
                    if (lower.includes("vital")) remediationSections.add("vitals");
                    if (lower.includes("assessment") || lower.includes("phq") || lower.includes("screening")) remediationSections.add("assessments");
                  });
                });
                return (
                  <div className="p-3 rounded-md border border-amber-300 dark:border-amber-600 space-y-2" data-testid="banner-missing-evidence">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#FEA002" }} />
                      <span className="text-sm font-medium" data-testid="text-missing-evidence-count">
                        {flaggedCodes.length} code{flaggedCodes.length !== 1 ? "s" : ""} {flaggedCodes.length !== 1 ? "have" : "has"} missing or partial evidence
                      </span>
                    </div>
                    <div className="ml-6 space-y-1">
                      {flaggedCodes.map((c: any) => {
                        const ev = codeEvidence.find((e: any) => e.id === c.id);
                        return (
                          <div key={c.id} className="flex items-center gap-2 text-xs" data-testid={`flagged-code-${c.code}`}>
                            {ev?.evidenceStatus === "missing_evidence" ? (
                              <XCircle className="w-3 h-3 flex-shrink-0 text-destructive" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: "#FEA002" }} />
                            )}
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0">{c.code}</Badge>
                            <span className="text-muted-foreground truncate">{c.description}</span>
                          </div>
                        );
                      })}
                    </div>
                    {remediationSections.size > 0 && (
                      <div className="ml-6 flex items-center gap-2 flex-wrap">
                        {Array.from(remediationSections).map((section) => (
                          <Link key={section} href={remediationMap[section] || `/visits/${visitId}/intake`}>
                            <Button variant="outline" size="sm" className="text-xs" data-testid={`link-remediate-${section}`}>
                              Go to {section.charAt(0).toUpperCase() + section.slice(1)} <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              {cptCodes.length > 0 && (
                <CodeSection title="CPT Codes" codes={cptCodes} onVerify={verifyCodeMutation.mutate} onRemove={removeCodeMutation.mutate} evidenceMap={codeEvidence} visitId={visitId} />
              )}
              {hcpcsCodes.length > 0 && (
                <CodeSection title="HCPCS Codes" codes={hcpcsCodes} onVerify={verifyCodeMutation.mutate} onRemove={removeCodeMutation.mutate} evidenceMap={codeEvidence} visitId={visitId} />
              )}
              {icdCodes.length > 0 && (
                <CodeSection title="ICD-10 Codes" codes={icdCodes} onVerify={verifyCodeMutation.mutate} onRemove={removeCodeMutation.mutate} evidenceMap={codeEvidence} visitId={visitId} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {overrides.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-semibold" data-testid="text-overrides-title">Validation Overrides ({overrides.length})</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {overrides.map((o: any) => (
              <div key={o.id} className="flex items-start gap-2 p-2 rounded-md border text-sm" data-testid={`override-${o.field}`}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                <div className="min-w-0">
                  <span className="font-medium capitalize">{o.field.replace(/([A-Z])/g, " $1")}</span>
                  <span className="text-muted-foreground"> - {o.warningMessage}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Override: {o.overrideReason}{o.overrideNote ? ` - ${o.overrideNote}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {dismissedRecs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-base font-semibold">Dismissed Recommendations ({dismissedRecs.length})</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {dismissedRecs.map((r: any) => (
              <div key={r.id} className="flex items-start gap-2 p-2 rounded-md border text-sm opacity-70" data-testid={`dismissed-rec-${r.ruleId}`}>
                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                <div className="min-w-0">
                  <span className="font-medium">{r.ruleName}</span>
                  <p className="text-xs text-muted-foreground">
                    Dismissed: {r.dismissReason}{r.dismissNote ? ` - ${r.dismissNote}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" style={{ color: "#2E456B" }} />
              <h2 className="text-base font-semibold">Completeness Report</h2>
            </div>
            {completeness && (
              <Badge variant={completenessOk ? "default" : "secondary"} data-testid="text-completeness-progress">
                {completeness.passedRules} of {completeness.totalRules} items complete
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">All required items must be complete before signing</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const groups: { key: string; label: string; types: string[] }[] = [
              { key: "compliance", label: "Compliance", types: ["consent"] },
              { key: "previsit", label: "Pre-Visit HIE Data", types: ["previsit_data"] },
              { key: "clinical", label: "Clinical", types: ["vitals", "medication"] },
              { key: "assessments", label: "Assessments", types: ["assessment"] },
              { key: "measures", label: "Measures", types: ["measure"] },
            ];
            return groups.map((group) => {
              const groupItems = completenessItems.filter((i: any) => group.types.includes(i.componentType));
              if (groupItems.length === 0) return null;
              return (
                <div key={group.key}>
                  <span className="text-xs font-medium text-muted-foreground">{group.label}</span>
                  <div className="space-y-1.5 mt-1.5">
                    {groupItems.map((item: any) => (
                      <div
                        key={item.ruleId}
                        className="flex items-center justify-between gap-3 p-2 rounded-md border flex-wrap"
                        data-testid={`item-completeness-${item.ruleId}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {item.status === "passed" && (
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-600" />
                          )}
                          {item.status === "failed" && (
                            <XCircle className="w-4 h-4 flex-shrink-0 text-destructive" />
                          )}
                          {item.status === "exception" && (
                            <MinusCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                          )}
                          {item.status === "not_applicable" && (
                            <MinusCircle className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                          )}
                          <span className="text-sm truncate">{item.label}</span>
                          {!item.required && (
                            <Badge variant="outline" className="text-xs">Optional</Badge>
                          )}
                          {item.status === "exception" && (
                            <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Excluded</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.status === "exception" && item.exclusionReason && (
                            <span className="text-xs text-amber-600 italic">{item.exclusionReason}</span>
                          )}
                          {item.status === "failed" && item.remediation && (
                            <span className="text-xs text-muted-foreground">{item.remediation}</span>
                          )}
                          {item.status === "failed" && item.link && (
                            <Link href={item.link}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                data-testid={`link-remediation-${item.componentId || item.componentType}`}
                              >
                                Go Fix <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="mt-3" />
                </div>
              );
            });
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" style={{ color: "#277493" }} />
              <h2 className="text-base font-semibold">Diagnosis Evidence Validation</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => validateDiagnosesMutation.mutate()}
              disabled={validateDiagnosesMutation.isPending}
              data-testid="button-validate-diagnoses"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${validateDiagnosesMutation.isPending ? "animate-spin" : ""}`} />
              {validateDiagnosesMutation.isPending ? "Validating..." : "Validate Diagnoses"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Checks if each coded diagnosis has sufficient clinical evidence</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {diagValidation && (
            <>
              <div className="flex items-center gap-3 flex-wrap" data-testid="text-diagnosis-summary">
                <Badge variant="default" className="text-xs">
                  {diagValidation.summary.supported} Supported
                </Badge>
                {diagValidation.summary.partial > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {diagValidation.summary.partial} Partial
                  </Badge>
                )}
                {diagValidation.summary.unsupported > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {diagValidation.summary.unsupported} Unsupported
                  </Badge>
                )}
                {diagValidation.summary.noRule > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {diagValidation.summary.noRule} No Rule
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {diagValidation.summary.total} total diagnoses evaluated
                </span>
              </div>
              <Separator />
              <div className="space-y-2">
                {diagValidation.results.map((r: any) => (
                  <div
                    key={r.icdCode}
                    className="p-3 rounded-md border space-y-2"
                    data-testid={`item-diagnosis-${r.icdCode}`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.status === "supported" && (
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-600" />
                      )}
                      {r.status === "partial" && (
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                      )}
                      {r.status === "unsupported" && (
                        <XCircle className="w-4 h-4 flex-shrink-0 text-destructive" />
                      )}
                      {r.status === "no_rule" && (
                        <Info className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                      )}
                      <Badge variant="outline" className="text-xs font-mono shrink-0">
                        {r.icdCode}
                      </Badge>
                      <span className="text-sm">{r.icdDescription}</span>
                      <Badge
                        variant={
                          r.status === "supported" ? "default" :
                          r.status === "partial" ? "secondary" :
                          r.status === "unsupported" ? "destructive" :
                          "outline"
                        }
                        className="text-xs shrink-0"
                      >
                        {r.status === "supported" ? "Supported" :
                         r.status === "partial" ? "Partial Evidence" :
                         r.status === "unsupported" ? "Unsupported" :
                         "No Rule"}
                      </Badge>
                    </div>
                    {r.evidenceItems.length > 0 && (r.status === "partial" || r.status === "unsupported") && (
                      <div className="ml-6 space-y-1">
                        {r.evidenceItems.map((ev: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            {ev.met ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-3 h-3 text-destructive flex-shrink-0" />
                            )}
                            <span className={ev.met ? "text-muted-foreground" : ""}>{ev.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {!diagValidation && !validateDiagnosesMutation.isPending && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No ICD-10 codes to validate. Generate codes first.
            </p>
          )}
          {validateDiagnosesMutation.isPending && !diagValidation && (
            <div className="flex items-center justify-center py-4 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Validating diagnosis evidence...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CR-P1: Billing Readiness Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" style={{ color: "#2E456B" }} />
              <h2 className="text-base font-semibold" data-testid="text-billing-readiness-title">Billing Readiness</h2>
            </div>
            <div className="flex items-center gap-2">
              {billingReadiness && (
                <Badge
                  variant={billingReadiness.gateResult === "pass" ? "default" : billingReadiness.gateResult === "override" ? "secondary" : "destructive"}
                  data-testid="badge-billing-gate-result"
                >
                  {billingReadiness.gateResult === "pass" ? "Pass" : billingReadiness.gateResult === "override" ? "Overridden" : "Fail"}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => evaluateBillingReadinessMutation.mutate()}
                disabled={evaluateBillingReadinessMutation.isPending}
                data-testid="button-evaluate-billing"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${evaluateBillingReadinessMutation.isPending ? "animate-spin" : ""}`} />
                {evaluateBillingReadinessMutation.isPending ? "Evaluating..." : "Evaluate"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Pre-claim compliance gate - evaluates documentation readiness for billing</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {billingReadiness ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Overall Score</span>
                <span className="text-lg font-bold" data-testid="text-billing-overall-score">{billingReadiness.overallScore}%</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">Completeness (40%)</span>
                    <span className="text-xs font-medium">{billingReadiness.completenessScore}%</span>
                  </div>
                  <Progress value={billingReadiness.completenessScore} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">Diagnosis Support (35%)</span>
                    <span className="text-xs font-medium">{billingReadiness.diagnosisSupportScore}%</span>
                  </div>
                  <Progress value={billingReadiness.diagnosisSupportScore} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">Coding Compliance (25%)</span>
                    <span className="text-xs font-medium">{billingReadiness.codingComplianceScore}%</span>
                  </div>
                  <Progress value={billingReadiness.codingComplianceScore} className="h-2" />
                </div>
              </div>
              {billingReadiness.failReasons && billingReadiness.failReasons.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Issues Found</span>
                    {billingReadiness.failReasons.map((reason: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs" data-testid={`billing-issue-${i}`}>
                        {reason.severity === "error" ? (
                          <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-destructive" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-500" />
                        )}
                        <span>{reason.description}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {billingReadiness.gateResult === "fail" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowBillingOverrideDialog(true)}
                  data-testid="button-billing-override"
                >
                  Override Billing Gate
                </Button>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Run billing readiness evaluation to check pre-claim compliance.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CR-P2: E/M Validation Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" style={{ color: "#277493" }} />
              <h2 className="text-base font-semibold" data-testid="text-em-validation-title">E/M Level Validation</h2>
            </div>
            <div className="flex items-center gap-2">
              {emEvaluation && emEvaluation.levelMatch && emEvaluation.levelMatch !== "not_applicable" && (
                <Badge
                  variant={emEvaluation.levelMatch === "match" ? "default" : emEvaluation.levelMatch === "under_coded" ? "secondary" : "destructive"}
                  data-testid="badge-em-match"
                >
                  {emEvaluation.levelMatch === "match" ? "Match" : emEvaluation.levelMatch === "under_coded" ? "Under-coded" : "Over-coded"}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => evaluateEmMutation.mutate()}
                disabled={evaluateEmMutation.isPending}
                data-testid="button-evaluate-em"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${evaluateEmMutation.isPending ? "animate-spin" : ""}`} />
                {evaluateEmMutation.isPending ? "Evaluating..." : "Evaluate E/M"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Validates E/M CPT code against Medical Decision Making (MDM) documentation</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {emEvaluation && emEvaluation.assignedCpt ? (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-xs text-muted-foreground">Assigned E/M Code</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="font-mono text-xs" data-testid="text-em-assigned-cpt">{emEvaluation.assignedCpt}</Badge>
                    <span className="text-sm">vs. documented MDM:</span>
                    <Badge variant="secondary" className="text-xs capitalize" data-testid="text-em-mdm-level">{emEvaluation.evaluatedMdmLevel}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">MDM Score</span>
                  <div className="text-lg font-bold" data-testid="text-em-mdm-score">{emEvaluation.overallMdmScore}%</div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">Problems Addressed (35%)</span>
                    <span className="text-xs font-medium">{emEvaluation.problemsScore}%</span>
                  </div>
                  <Progress value={emEvaluation.problemsScore} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">Data Reviewed/Ordered (35%)</span>
                    <span className="text-xs font-medium">{emEvaluation.dataScore}%</span>
                  </div>
                  <Progress value={emEvaluation.dataScore} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">Risk of Complications (30%)</span>
                    <span className="text-xs font-medium">{emEvaluation.riskScore}%</span>
                  </div>
                  <Progress value={emEvaluation.riskScore} className="h-2" />
                </div>
              </div>
              {emEvaluation.suggestedCpt && (
                <div className="flex items-center gap-2 p-2 rounded-md border border-amber-300 dark:border-amber-600 text-sm" data-testid="text-em-suggestion">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#FEA002" }} />
                  <span>Suggested CPT: <Badge variant="outline" className="font-mono text-xs">{emEvaluation.suggestedCpt}</Badge></span>
                </div>
              )}
            </>
          ) : emEvaluation && emEvaluation.levelMatch === "not_applicable" ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No E/M CPT code found on this visit. E/M validation not applicable.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Run E/M evaluation to validate CPT code against documentation.
            </p>
          )}
        </CardContent>
      </Card>

      {/* CR-P4: CPT Defensibility Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: "#277493" }} />
              <h2 className="text-base font-semibold" data-testid="text-cpt-defensibility-title">CPT Defensibility</h2>
            </div>
            <div className="flex items-center gap-2">
              {cptDefensibility && cptDefensibility.aggregateScore !== undefined && (
                <Badge
                  variant={cptDefensibility.aggregateScore >= 80 ? "default" : cptDefensibility.aggregateScore >= 60 ? "secondary" : "destructive"}
                  data-testid="badge-cpt-aggregate"
                >
                  {cptDefensibility.aggregateScore}%
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => evaluateCptDefensibilityMutation.mutate()}
                disabled={evaluateCptDefensibilityMutation.isPending}
                data-testid="button-evaluate-cpt"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${evaluateCptDefensibilityMutation.isPending ? "animate-spin" : ""}`} />
                {evaluateCptDefensibilityMutation.isPending ? "Evaluating..." : "Evaluate CPT"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Per-CPT documentation defensibility scoring against required elements</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {cptDefensibility && cptDefensibility.cptScores && cptDefensibility.cptScores.length > 0 ? (
            cptDefensibility.cptScores.map((cpt: any, idx: number) => (
              <div key={idx} className="p-3 border rounded-lg space-y-2" data-testid={`cpt-score-${cpt.cptCode}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">{cpt.cptCode}</Badge>
                    <span className="text-sm font-medium">{cpt.label}</span>
                  </div>
                  <Badge
                    variant={cpt.status === "defensible" ? "default" : cpt.status === "warning" ? "secondary" : "destructive"}
                  >
                    {cpt.score}%
                  </Badge>
                </div>
                <Progress value={cpt.score} className="h-2" />
                <div className="flex flex-wrap gap-1">
                  {cpt.elements.map((el: any, elIdx: number) => (
                    <span key={elIdx} className={`text-xs px-1.5 py-0.5 rounded ${el.met ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
                      {el.met ? "✓" : "✗"} {el.description}
                    </span>
                  ))}
                </div>
                {cpt.elements.some((el: any) => !el.met && el.remediation) && (
                  <div className="mt-2 space-y-1.5 border-t pt-2">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> How to fix:
                    </span>
                    {cpt.elements.filter((el: any) => !el.met && el.remediation).map((el: any, rIdx: number) => (
                      <div key={rIdx} className="text-xs text-muted-foreground pl-4 flex items-start gap-1.5">
                        <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#FEA002" }} />
                        <span><strong>{el.description}:</strong> {el.remediation}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Run CPT defensibility evaluation to score documentation against CPT requirements.
            </p>
          )}
        </CardContent>
      </Card>

      {/* CR-P5: Payor Compliance Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5" style={{ color: "#277493" }} />
              <h2 className="text-base font-semibold" data-testid="text-payor-compliance-title">Payor Compliance</h2>
            </div>
            <div className="flex items-center gap-2">
              {payorCompliance && payorCompliance.failCount !== undefined && (
                <Badge
                  variant={payorCompliance.failCount === 0 ? "default" : "destructive"}
                  data-testid="badge-payor-result"
                >
                  {payorCompliance.failCount === 0 ? "Compliant" : `${payorCompliance.failCount} issue(s)`}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => evaluatePayorComplianceMutation.mutate()}
                disabled={evaluatePayorComplianceMutation.isPending}
                data-testid="button-evaluate-payor"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${evaluatePayorComplianceMutation.isPending ? "animate-spin" : ""}`} />
                {evaluatePayorComplianceMutation.isPending ? "Evaluating..." : "Check Compliance"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Validates visit against payor-specific billing policies and denial risk</p>
        </CardHeader>
        <CardContent>
          {payorCompliance && payorCompliance.results ? (
            payorCompliance.results.length > 0 ? (
              <div className="space-y-2">
                {payorCompliance.results.map((r: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-md border text-sm" data-testid={`payor-result-${idx}`}>
                    {r.result === "pass" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : r.result === "warning" ? (
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#FEA002" }} />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    )}
                    <span>{r.description}</span>
                    <Badge variant="outline" className="ml-auto text-xs capitalize">{r.policyType}</Badge>
                  </div>
                ))}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  <span className="text-green-600">{payorCompliance.passCount} passed</span>
                  {payorCompliance.warningCount > 0 && <span style={{ color: "#FEA002" }}>{payorCompliance.warningCount} warning(s)</span>}
                  {payorCompliance.failCount > 0 && <span className="text-destructive">{payorCompliance.failCount} failed</span>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No policy violations detected. Visit is compliant with payor requirements.
              </p>
            )
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Run payor compliance check to evaluate against billing policies.
            </p>
          )}
        </CardContent>
      </Card>

      {/* CR-P3: Encounter Audit Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" style={{ color: "#277493" }} />
              <h2 className="text-base font-semibold" data-testid="text-encounter-audit-title">Encounter Audit</h2>
            </div>
            <div className="flex items-center gap-2">
              {encounterAudit && encounterAudit.auditResult && (
                <Badge
                  variant={encounterAudit.auditResult === "pass" ? "default" : encounterAudit.auditResult === "warning" ? "secondary" : "destructive"}
                  data-testid="badge-audit-result"
                >
                  {encounterAudit.auditResult === "pass" ? "Pass" : encounterAudit.auditResult === "warning" ? "Warning" : "Fail"} ({encounterAudit.overallAuditScore}%)
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => runEncounterAuditMutation.mutate()}
                disabled={runEncounterAuditMutation.isPending}
                data-testid="button-run-audit"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${runEncounterAuditMutation.isPending ? "animate-spin" : ""}`} />
                {runEncounterAuditMutation.isPending ? "Auditing..." : "Run Audit"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Automated 100% encounter audit scoring across all compliance dimensions</p>
        </CardHeader>
        <CardContent>
          {encounterAudit && encounterAudit.dimensions ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Completeness", value: encounterAudit.completenessScore },
                  { label: "Diagnosis Support", value: encounterAudit.diagnosisSupportScore },
                  { label: "Coding Compliance", value: encounterAudit.codingComplianceScore },
                  { label: "E/M Defensibility", value: encounterAudit.emDefensibilityScore },
                  { label: "CPT Defensibility", value: encounterAudit.cptDefensibilityScore },
                  { label: "Billing Readiness", value: encounterAudit.billingReadinessScore },
                ].filter(d => d.value !== null && d.value !== undefined).map((dim, idx) => (
                  <div key={idx} className="text-center p-2 rounded-lg border">
                    <div className={`text-lg font-bold ${dim.value >= 80 ? "text-green-600" : dim.value >= 60 ? "text-amber-500" : "text-destructive"}`}>
                      {dim.value}%
                    </div>
                    <div className="text-xs text-muted-foreground">{dim.label}</div>
                  </div>
                ))}
              </div>
              {encounterAudit.qualityFlags && encounterAudit.qualityFlags.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Quality Flags ({encounterAudit.flagCount})</span>
                  {encounterAudit.qualityFlags.map((f: any, idx: number) => (
                    <div key={idx} className="p-2 rounded-md border space-y-1" data-testid={`audit-flag-${idx}`}>
                      <div className="flex items-center gap-2 text-xs">
                        {f.severity === "error" ? (
                          <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#FEA002" }} />
                        )}
                        <span className="font-medium">{f.description}</span>
                      </div>
                      {f.remediation && (
                        <div className="text-xs text-muted-foreground pl-5 flex items-start gap-1.5">
                          <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#FEA002" }} />
                          <span>{f.remediation}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Run encounter audit to evaluate across all compliance dimensions.
            </p>
          )}
        </CardContent>
      </Card>

      {/* CR-P8: Code Alignment Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <GitCompareArrows className="w-5 h-5" style={{ color: "#277493" }} />
              <h2 className="text-base font-semibold" data-testid="text-code-alignment-title">Code Alignment</h2>
            </div>
            <div className="flex items-center gap-2">
              {codeAlignment && codeAlignment.alignmentScore !== undefined && (
                <Badge
                  variant={codeAlignment.alignmentScore >= 80 ? "default" : codeAlignment.alignmentScore >= 60 ? "secondary" : "destructive"}
                  data-testid="badge-alignment-score"
                >
                  {codeAlignment.alignmentScore}% aligned
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => runCodeAlignmentMutation.mutate()}
                disabled={runCodeAlignmentMutation.isPending}
                data-testid="button-run-alignment"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${runCodeAlignmentMutation.isPending ? "animate-spin" : ""}`} />
                {runCodeAlignmentMutation.isPending ? "Analyzing..." : "Run Analysis"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">NLP analysis comparing clinical narrative to submitted codes</p>
        </CardHeader>
        <CardContent>
          {codeAlignment && codeAlignment.alignmentScore !== undefined ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {codeAlignment.modelUsed && (
                  <Badge
                    variant={codeAlignment.modelUsed === "gpt-4o" ? "default" : "outline"}
                    className="text-xs"
                    style={codeAlignment.modelUsed === "gpt-4o" ? { backgroundColor: "#277493" } : undefined}
                    data-testid="badge-model-used"
                  >
                    {codeAlignment.modelUsed === "gpt-4o" ? "AI-Assisted (GPT-4o)" : "Keyword Matching (Fallback)"}
                  </Badge>
                )}
                {codeAlignment.status && (
                  <Badge
                    variant={codeAlignment.status === "final" ? "default" : "secondary"}
                    className="text-xs"
                    data-testid="badge-alignment-status"
                  >
                    {codeAlignment.status === "final" ? "Final" : "Draft"}
                  </Badge>
                )}
              </div>
              {codeAlignment.fallbackReason && (
                <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-800 dark:text-amber-200" data-testid="text-fallback-reason">
                  <strong>AI unavailable:</strong> {codeAlignment.fallbackReason}
                </div>
              )}
              {codeAlignment.analysisDetails?.clinicalDataSources && (codeAlignment.analysisDetails.clinicalDataSources as string[]).length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Data sources analyzed: {(codeAlignment.analysisDetails.clinicalDataSources as string[]).join(", ")}
                </div>
              )}
              {codeAlignment.codesWithoutSupport && (codeAlignment.codesWithoutSupport as any[]).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Codes Without Narrative Support ({(codeAlignment.codesWithoutSupport as any[]).length})</span>
                  {(codeAlignment.codesWithoutSupport as any[]).map((c: any, idx: number) => {
                    const matchedVisitCode = codes.find((vc: any) => vc.code === c.code && !vc.removedByNp);
                    return (
                      <div key={idx} className="flex items-start gap-2 text-xs p-2 rounded-md border" data-testid={`unsupported-code-${idx}`}>
                        <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <span className="font-mono font-medium">{c.code}</span>
                              {c.description && <span className="text-muted-foreground ml-1">- {c.description}</span>}
                            </div>
                            {matchedVisitCode && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] px-2"
                                  data-testid={`button-swap-code-${c.code}`}
                                  onClick={() => {
                                    setCodeSwapDialog({
                                      codeId: matchedVisitCode.id,
                                      oldCode: c.code,
                                      oldDesc: c.description || "",
                                      oldCodeType: c.codeType || matchedVisitCode.codeType,
                                      reason: c.reason,
                                    });
                                    setSwapNewCode("");
                                    setSwapNewDesc("");
                                    setSwapReason(c.reason || "");
                                  }}
                                >
                                  Swap Code
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px] px-2 text-destructive"
                                  data-testid={`button-remove-code-${c.code}`}
                                  onClick={() => {
                                    if (confirm(`Remove ${c.code} - ${c.description}?`)) {
                                      removeCodeMutation.mutate(matchedVisitCode.id);
                                    }
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                          </div>
                          {c.reason && <p className="text-muted-foreground mt-0.5">{c.reason}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {codeAlignment.conditionsWithoutCodes && (codeAlignment.conditionsWithoutCodes as any[]).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Conditions Discussed But Not Coded ({(codeAlignment.conditionsWithoutCodes as any[]).length})</span>
                  {(codeAlignment.conditionsWithoutCodes as any[]).map((c: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-xs p-2 rounded-md border" data-testid={`uncoded-condition-${idx}`}>
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#FEA002" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <span className="font-medium">{c.condition}</span>
                            {c.suggestedCode && <span className="font-mono text-muted-foreground ml-1">({c.suggestedCode})</span>}
                          </div>
                          {c.suggestedCode && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2 flex-shrink-0"
                              style={{ borderColor: "#277493", color: "#277493" }}
                              data-testid={`button-add-code-${idx}`}
                              onClick={() => {
                                setAddCodeDialog({ condition: c.condition, suggestedCode: c.suggestedCode, suggestedDesc: c.reason });
                                setAddCodeValue(c.suggestedCode);
                                setAddCodeDesc(c.condition);
                                setAddCodeType(c.suggestedCode.match(/^[A-Z]\d/) ? "ICD-10" : c.suggestedCode.startsWith("G") ? "HCPCS" : "CPT");
                              }}
                            >
                              + Add Code
                            </Button>
                          )}
                        </div>
                        {c.reason && <p className="text-muted-foreground mt-0.5">{c.reason}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(!codeAlignment.codesWithoutSupport || (codeAlignment.codesWithoutSupport as any[]).length === 0) &&
               (!codeAlignment.conditionsWithoutCodes || (codeAlignment.conditionsWithoutCodes as any[]).length === 0) && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  All codes are supported by clinical documentation
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Run code alignment analysis to compare clinical narrative to submitted codes.
            </p>
          )}
        </CardContent>
      </Card>

      {/* CR-P7: Documentation Change History */}
      {changeHistory && changeHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5" style={{ color: "#277493" }} />
              <h2 className="text-base font-semibold" data-testid="text-change-history-title">Documentation Changes</h2>
              <Badge variant="secondary" className="text-xs">{changeHistory.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Field-level changes tracked during documentation</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {changeHistory.slice(0, 20).map((change: any) => (
                <div key={change.id} className="flex items-start gap-2 text-xs p-2 rounded-md border" data-testid={`change-${change.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{change.entityType}</Badge>
                      <span className="font-medium">{change.fieldName}</span>
                      {change.remediationId && <Badge variant="secondary" className="text-[10px]">Remediation</Badge>}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                      {change.previousValue && <span className="line-through">{String(change.previousValue).substring(0, 40)}</span>}
                      {change.previousValue && change.newValue && <ArrowRight className="w-3 h-3 flex-shrink-0" />}
                      {change.newValue && <span className="font-medium text-foreground">{String(change.newValue).substring(0, 40)}</span>}
                    </div>
                    <span className="text-muted-foreground">{new Date(change.changedAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!completenessOk && failedRequired.length > 0 && (
        <Card className="border-destructive/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-destructive mt-0.5" />
            <div>
              <span className="text-sm font-medium text-destructive" data-testid="text-gating-warning">
                Cannot finalize - {failedRequired.length} required item{failedRequired.length !== 1 ? "s" : ""} incomplete
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete all required items or provide structured unable-to-assess reasons before signing.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {(noteEdits.length > 0 || noteSignatures.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5" style={{ color: "#277493" }} />
              <h2 className="text-base font-semibold" data-testid="text-note-audit-title">Note Audit Trail</h2>
              {noteEdits.length > 0 && <Badge variant="secondary" className="text-xs">{noteEdits.length} edit{noteEdits.length !== 1 ? "s" : ""}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {noteSignatures.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Signatures</span>
                <div className="space-y-1.5 mt-1">
                  {noteSignatures.map((sig: any) => (
                    <div key={sig.id} className="flex items-center gap-2 p-2 rounded-md border text-xs" data-testid={`sig-${sig.id}`}>
                      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#277493" }} />
                      <span className="font-medium">{sig.signedByName}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{sig.signatureType?.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{sig.role}</Badge>
                      <span className="text-muted-foreground ml-auto">{sig.signedAt ? new Date(sig.signedAt).toLocaleString() : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {noteEdits.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Edit History</span>
                <div className="space-y-1.5 mt-1">
                  {noteEdits.map((edit: any) => (
                    <div key={edit.id} className="p-2 rounded-md border text-xs" data-testid={`edit-${edit.id}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <PenLine className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium">{edit.editedByName}</span>
                        <span className="text-muted-foreground">edited</span>
                        <Badge variant="outline" className="text-[10px] capitalize">{edit.section?.replace(/_/g, " ")}</Badge>
                        <span className="text-muted-foreground ml-auto">{edit.editedAt ? new Date(edit.editedAt).toLocaleString() : ""}</span>
                      </div>
                      {edit.editReason && (
                        <p className="text-muted-foreground mt-1">Reason: {edit.editReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(() => {
        const orderedLabs = visitTasks.filter((t: any) => t.status === "ordered" && (t.taskType === "lab_order" || t.taskType === "lab" || t.description?.toLowerCase().includes("lab")));
        const deferredItems = visitTasks.filter((t: any) => t.status === "deferred");
        if (orderedLabs.length === 0 && deferredItems.length === 0) return null;
        return (
          <Card className="border-amber-200 dark:border-amber-800" data-testid="labs-pending-banner">
            <CardContent className="p-4 space-y-3">
              {orderedLabs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" style={{ color: "#FEA002" }} />
                    <span className="text-sm font-semibold">Labs Pending — {orderedLabs.length} ordered lab(s) awaiting results</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 pl-6">
                    {orderedLabs.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#FEA002" }} />
                        <span>{t.title}{t.description ? `: ${t.description}` : ""}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-800 dark:text-amber-200">
                    <strong>Compliance Note:</strong> This visit can be signed with "Labs Pending" documented in the plan.
                    When results return, use <strong>Complete with Results</strong> on the Care Plan to create a dated, signed addendum
                    to the original note. This is the recommended practice per Medicare/HIM guidance.
                  </div>
                </div>
              )}
              {deferredItems.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-semibold">{deferredItems.length} item(s) deferred to follow-up</span>
                  </div>
                  <div className="text-xs text-muted-foreground pl-6">
                    {deferredItems.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-purple-400" />
                        <span>{t.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {noteAddenda.length > 0 && (
        <Card data-testid="note-addenda-section">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5" style={{ color: "#277493" }} />
              <h2 className="text-base font-semibold">Note Addenda ({noteAddenda.length})</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {noteAddenda.map((a: any) => (
              <div key={a.id} className="p-3 rounded-md border space-y-2" data-testid={`review-addendum-${a.id}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{(a.addendumType || "").replace(/_/g, " ")}</Badge>
                    {a.signedAt ? (
                      <Badge variant="default" className="text-xs" style={{ backgroundColor: "#277493" }}>Signed</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Unsigned</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{a.content}</p>
                <p className="text-xs text-muted-foreground">By: {a.authorName}</p>
              </div>
            ))}
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

      {showEmOverrideDialog && (
        <Dialog open={true} onOpenChange={() => setShowEmOverrideDialog(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                E/M Level Mismatch Warning
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The E/M CPT code on this visit may not match the documented level of medical decision making.
                Over-coded visits may face audit risk. Do you want to proceed with finalization?
              </p>
              {emEvaluation && (
                <div className="flex items-center gap-2 p-2 rounded-md border text-sm">
                  <span>Assigned: <Badge variant="outline" className="font-mono text-xs">{emEvaluation.assignedCpt}</Badge></span>
                  <span>Suggested: <Badge variant="outline" className="font-mono text-xs">{emEvaluation.suggestedCpt}</Badge></span>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowEmOverrideDialog(false)} data-testid="button-em-override-cancel">Cancel</Button>
                <Button
                  onClick={() => {
                    setShowEmOverrideDialog(false);
                    finalizeMutation.mutate(true);
                  }}
                  disabled={finalizeMutation.isPending}
                  data-testid="button-em-override-confirm"
                >
                  {finalizeMutation.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Finalizing...</> : "Acknowledge & Finalize"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showBillingOverrideDialog && (
        <Dialog open={true} onOpenChange={() => setShowBillingOverrideDialog(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-500" />
                Override Billing Gate
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This visit did not pass the billing readiness threshold (80/100).
                Provide a reason to override the gate and allow claim export.
              </p>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason for override (required)..."
                className="min-h-[80px]"
                data-testid="input-billing-override-reason"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowBillingOverrideDialog(false); setOverrideReason(""); }} data-testid="button-billing-override-cancel">Cancel</Button>
                <Button
                  onClick={() => billingOverrideMutation.mutate(overrideReason)}
                  disabled={!overrideReason.trim() || billingOverrideMutation.isPending}
                  data-testid="button-billing-override-confirm"
                >
                  {billingOverrideMutation.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Overriding...</> : "Override Gate"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {codeSwapDialog && (
        <Dialog open={true} onOpenChange={() => setCodeSwapDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5" style={{ color: "#277493" }} />
                Swap Code
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 rounded-md border bg-muted/50">
                <p className="text-xs text-muted-foreground">Current code</p>
                <p className="text-sm font-mono font-medium">{codeSwapDialog.oldCode} <span className="font-sans text-muted-foreground">— {codeSwapDialog.oldDesc}</span></p>
              </div>
              {codeSwapDialog.reason && (
                <p className="text-xs text-muted-foreground">{codeSwapDialog.reason}</p>
              )}
              <div className="space-y-2">
                <Label>New Code</Label>
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono"
                  value={swapNewCode}
                  onChange={(e) => setSwapNewCode(e.target.value)}
                  placeholder="e.g. G0439"
                  data-testid="input-swap-new-code"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={swapNewDesc}
                  onChange={(e) => setSwapNewDesc(e.target.value)}
                  placeholder="e.g. Annual wellness visit, subsequent"
                  data-testid="input-swap-new-desc"
                />
              </div>
              <div className="space-y-2">
                <Label>Reason for change</Label>
                <Textarea
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  placeholder="Clinical reason for code correction..."
                  className="min-h-[60px]"
                  data-testid="input-swap-reason"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCodeSwapDialog(null)} data-testid="button-swap-cancel">Cancel</Button>
                <Button
                  onClick={() => swapCodeMutation.mutate({
                    codeId: codeSwapDialog.codeId,
                    newCode: swapNewCode,
                    newDescription: swapNewDesc,
                    newCodeType: codeSwapDialog.oldCodeType,
                    reason: swapReason,
                  })}
                  disabled={!swapNewCode.trim() || !swapNewDesc.trim() || swapCodeMutation.isPending}
                  data-testid="button-swap-confirm"
                >
                  {swapCodeMutation.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Swapping...</> : "Swap Code"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {addCodeDialog && (
        <Dialog open={true} onOpenChange={() => setAddCodeDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="w-5 h-5" style={{ color: "#277493" }} />
                Add Missing Code
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Documented condition: <strong>{addCodeDialog.condition}</strong>
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1 space-y-2">
                  <Label>Code Type</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={addCodeType}
                    onChange={(e) => setAddCodeType(e.target.value)}
                    data-testid="select-add-code-type"
                  >
                    <option value="ICD-10">ICD-10</option>
                    <option value="CPT">CPT</option>
                    <option value="HCPCS">HCPCS</option>
                  </select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Code</Label>
                  <input
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono"
                    value={addCodeValue}
                    onChange={(e) => setAddCodeValue(e.target.value)}
                    placeholder="e.g. E11.9"
                    data-testid="input-add-code-value"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={addCodeDesc}
                  onChange={(e) => setAddCodeDesc(e.target.value)}
                  placeholder="Code description..."
                  data-testid="input-add-code-desc"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAddCodeDialog(null)} data-testid="button-add-code-cancel">Cancel</Button>
                <Button
                  onClick={() => addCodeMutation.mutate({
                    code: addCodeValue,
                    codeType: addCodeType,
                    description: addCodeDesc,
                    reason: `AI suggested for: ${addCodeDialog.condition}`,
                  })}
                  disabled={!addCodeValue.trim() || !addCodeDesc.trim() || addCodeMutation.isPending}
                  data-testid="button-add-code-confirm"
                >
                  {addCodeMutation.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Adding...</> : "Add Code"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CodeSection({
  title,
  codes,
  onVerify,
  onRemove,
  evidenceMap = [],
  visitId,
}: {
  title: string;
  codes: any[];
  onVerify: (data: { id: string; verified: boolean }) => void;
  onRemove: (id: string) => void;
  evidenceMap?: any[];
  visitId?: string;
}) {
  const [openCodes, setOpenCodes] = useState<Set<string>>(new Set());

  const toggleCode = (id: string) => {
    setOpenCodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getRemediationLinks = (missing: string[]) => {
    const links: { label: string; href: string }[] = [];
    const hasVitals = missing.some((m) => m.toLowerCase().includes("vital") || m.toLowerCase().includes("bmi") || m.toLowerCase().includes("blood pressure"));
    const hasAssessments = missing.some((m) => m.toLowerCase().includes("assessment") || m.toLowerCase().includes("phq") || m.toLowerCase().includes("screening") || m.toLowerCase().includes("falls"));
    if (hasVitals) links.push({ label: "Go to Vitals", href: `/visits/${visitId}/vitals` });
    if (hasAssessments) links.push({ label: "Go to Assessments", href: `/visits/${visitId}/intake` });
    return links;
  };

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <div className="space-y-1.5">
        {codes.map((code: any) => {
          const evidence = evidenceMap.find((e: any) => e.id === code.id);
          const evidenceStatus = evidence?.evidenceStatus;
          const isOpen = openCodes.has(code.id);

          return (
            <Collapsible
              key={code.id}
              open={isOpen}
              onOpenChange={() => toggleCode(code.id)}
            >
              <div className="rounded-md border" data-testid={`code-${code.codeType}-${code.code}`}>
                <div className="flex items-center justify-between gap-3 p-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant={code.verified ? "default" : "secondary"} className="text-xs font-mono shrink-0">
                      {code.code}
                    </Badge>
                    <span className="text-sm truncate">{code.description}</span>
                    {code.source && (
                      <Badge variant="outline" className="text-xs capitalize shrink-0">
                        {code.source}
                      </Badge>
                    )}
                    {evidenceStatus === "fully_supported" && (
                      <CollapsibleTrigger asChild>
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0 cursor-pointer gap-1"
                          style={{ borderColor: "#16a34a", color: "#16a34a" }}
                          data-testid={`badge-evidence-${code.code}`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Fully Supported
                        </Badge>
                      </CollapsibleTrigger>
                    )}
                    {evidenceStatus === "partially_supported" && (
                      <CollapsibleTrigger asChild>
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0 cursor-pointer gap-1"
                          style={{ borderColor: "#FEA002", color: "#FEA002" }}
                          data-testid={`badge-evidence-${code.code}`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Partially Supported
                        </Badge>
                      </CollapsibleTrigger>
                    )}
                    {evidenceStatus === "missing_evidence" && (
                      <CollapsibleTrigger asChild>
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0 cursor-pointer gap-1"
                          style={{ borderColor: "#E74C3C", color: "#E74C3C" }}
                          data-testid={`badge-evidence-${code.code}`}
                        >
                          <XCircle className="w-3 h-3" />
                          Missing Evidence
                        </Badge>
                      </CollapsibleTrigger>
                    )}
                    {code.triggerComponents && code.triggerComponents.length > 0 && (
                      code.triggerComponents.map((trigger: string, idx: number) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-[10px] shrink-0"
                          data-testid={`badge-trigger-${code.code}-${idx}`}
                        >
                          {trigger}
                        </Badge>
                      ))
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {evidenceStatus && (
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-expand-${code.code}`}
                        >
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </Button>
                      </CollapsibleTrigger>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onVerify({ id: code.id, verified: !code.verified })}
                      data-testid={`button-verify-${code.code}`}
                    >
                      <Check className={`w-4 h-4 ${code.verified ? "text-green-600" : "text-muted-foreground"}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemove(code.id)}
                      data-testid={`button-remove-${code.code}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <CollapsibleContent>
                  {evidence?.evidenceMap && (
                    <div className="px-3 pb-3 space-y-2 border-t" data-testid={`evidence-detail-${code.code}`}>
                      <span className="text-[11px] font-medium text-muted-foreground mt-2 block">Evidence Requirements</span>
                      {evidence.evidenceMap.requirements?.map((req: string, i: number) => {
                        const satisfied = evidence.evidenceMap.satisfiedBy?.includes(req);
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs" data-testid={`evidence-req-${code.code}-${i}`}>
                            {satisfied ? (
                              <CheckCircle2 className="w-3 h-3 flex-shrink-0 text-green-600" />
                            ) : (
                              <XCircle className="w-3 h-3 flex-shrink-0 text-destructive" />
                            )}
                            <span className={satisfied ? "text-muted-foreground" : ""}>{req}</span>
                          </div>
                        );
                      })}
                      {evidence.evidenceMap.missing?.length > 0 && (
                        <div className="space-y-2 mt-1">
                          <div className="text-[11px] text-destructive">
                            {evidence.evidenceMap.missing.length} requirement{evidence.evidenceMap.missing.length !== 1 ? "s" : ""} not yet satisfied
                          </div>
                          {visitId && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {getRemediationLinks(evidence.evidenceMap.missing).map((link) => (
                                <Link key={link.label} href={link.href}>
                                  <Button variant="outline" size="sm" className="text-xs" data-testid={`link-remediate-${code.code}-${link.label.toLowerCase().replace(/\s+/g, "-")}`}>
                                    {link.label} <ArrowRight className="w-3 h-3 ml-1" />
                                  </Button>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
