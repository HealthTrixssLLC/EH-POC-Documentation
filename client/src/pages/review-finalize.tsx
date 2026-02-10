import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (visitId && codes.length > 0) {
      validateDiagnosesMutation.mutate();
    }
  }, [visitId, codes.length]);

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

  const removeCodeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/codes/${id}`, { removedByNp: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "codes"] });
    },
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
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                          )}
                          {item.status === "not_applicable" && (
                            <MinusCircle className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                          )}
                          <span className="text-sm truncate">{item.label}</span>
                          {!item.required && (
                            <Badge variant="outline" className="text-xs">Optional</Badge>
                          )}
                          {item.status === "exception" && (
                            <Badge variant="secondary" className="text-xs">Exception</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
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
