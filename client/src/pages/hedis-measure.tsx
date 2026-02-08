import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeft, Target, CheckCircle2, Activity, HeartPulse, FlaskConical,
  AlertTriangle, RefreshCw, FileText, ArrowRight, Zap, Ban, Clock
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UNABLE_TO_ASSESS_REASONS } from "@shared/schema";

const captureMethods = [
  { value: "in_home_visit", label: "In-Home Visit Evidence" },
  { value: "member_reported", label: "Member-Reported" },
  { value: "external_record", label: "External Record" },
  { value: "hie_retrieval", label: "HIE Retrieval" },
];

export default function HedisMeasure() {
  const [, params] = useRoute("/visits/:id/intake/measure/:mid");
  const visitId = params?.id;
  const measureId = params?.mid;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: definition, isLoading } = useQuery<any>({
    queryKey: ["/api/measures/definitions", measureId],
    enabled: !!measureId,
  });

  const { data: existingResult, refetch: refetchResult } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "measures", measureId],
    enabled: !!visitId && !!measureId,
  });

  const { data: overview } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "overview"],
    enabled: !!visitId,
  });

  const [captureMethod, setCaptureMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [unableReason, setUnableReason] = useState("");
  const [unableNote, setUnableNote] = useState("");
  const [showUnableForm, setShowUnableForm] = useState(false);

  useEffect(() => {
    if (existingResult?.captureMethod && !captureMethod) {
      setCaptureMethod(existingResult.captureMethod);
    }
  }, [existingResult]);

  const isClinical = definition?.evaluationType === "clinical_data";
  const vitals = overview?.vitals;
  const evidence = existingResult?.evidenceMetadata as any || {};

  const evaluateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/visits/${visitId}/measures/evaluate`);
      return res.json();
    },
    onSuccess: (data: any) => {
      refetchResult();
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      const evalResult = data.evaluated?.find((e: any) => e.measureId === measureId);
      if (evalResult?.status === "complete") {
        toast({ title: "Measure evaluated", description: `${measureId}: ${evalResult.result} (${evalResult.value})` });
      } else if (evalResult?.status === "awaiting_data") {
        toast({ title: "Data needed", description: evalResult.message, variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Evaluation failed", description: err.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/visits/${visitId}/measures`, {
        measureId,
        captureMethod,
        evidenceMetadata: { notes, capturedAt: new Date().toISOString() },
        status: "complete",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      toast({ title: "Measure completed" });
      setLocation(`/visits/${visitId}/intake`);
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const unableMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/visits/${visitId}/measures/unable`, {
        measureId,
        reason: unableReason,
        note: unableNote,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      toast({ title: "Marked as unable to assess" });
      setLocation(`/visits/${visitId}/intake`);
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const isComplete = existingResult?.status === "complete";
  const isAwaitingData = !isComplete && isClinical;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={`/visits/${visitId}/intake`}>
          <Button variant="ghost" size="sm" data-testid="button-back-intake">
            <ChevronLeft className="w-4 h-4 mr-1" /> Intake
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold" data-testid="text-measure-title">
              {definition?.name || "HEDIS Measure"}
            </h1>
            {isClinical && (
              <Badge variant="secondary" className="text-xs no-default-hover-elevate" style={{ backgroundColor: "#27749320", color: "#277493", border: "none" }} data-testid="badge-clinical-driven">
                <Zap className="w-3 h-3 mr-1" /> Clinical Data Driven
              </Badge>
            )}
            {!isClinical && (
              <Badge variant="secondary" className="text-xs no-default-hover-elevate" data-testid="badge-evidence-based">
                <FileText className="w-3 h-3 mr-1" /> Evidence Based
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {definition?.category} - {definition?.measureId} v{definition?.version || "1.0"}
          </p>
        </div>
      </div>

      {/* Measure Status Banner */}
      {isComplete && (
        <div className="flex items-center gap-3 p-3 rounded-md border" style={{ borderColor: "#27749340", backgroundColor: "#27749310" }} data-testid="banner-complete">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: "#277493" }} />
          <div className="flex-1">
            <span className="text-sm font-semibold" style={{ color: "#277493" }}>Measure Complete</span>
            {existingResult?.result && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Result: <span className="font-medium">{existingResult.result.replace(/_/g, " ")}</span>
                {existingResult?.value && <> | Value: <span className="font-medium">{existingResult.value}</span></>}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="capitalize text-xs no-default-hover-elevate" style={{ backgroundColor: "#27749320", color: "#277493", border: "none" }}>
            {existingResult?.captureMethod?.replace(/_/g, " ") || "Completed"}
          </Badge>
        </div>
      )}

      {/* CLINICAL DATA-DRIVEN MEASURE UI */}
      {isClinical && (
        <div className="space-y-4">
          {/* Description & Criteria */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" style={{ color: "#2E456B" }} />
                <h2 className="text-sm font-semibold">Measure Criteria</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {definition?.description && (
                <p className="text-sm text-muted-foreground">{definition.description}</p>
              )}
              {definition?.clinicalCriteria && (
                <div className="p-3 rounded-md border" style={{ backgroundColor: "rgba(39, 116, 147, 0.05)" }}>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clinical Threshold</span>
                  <p className="text-sm mt-1 font-medium">{(definition.clinicalCriteria as any).description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clinical Evidence Panel */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {definition?.dataSource === "vitals" ? (
                    <HeartPulse className="w-4 h-4" style={{ color: "#E74C3C" }} />
                  ) : (
                    <FlaskConical className="w-4 h-4" style={{ color: "#277493" }} />
                  )}
                  <h2 className="text-sm font-semibold">
                    {definition?.dataSource === "vitals" ? "Clinical Data: Vitals" : "Clinical Data: Lab Results"}
                  </h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => evaluateMutation.mutate()}
                  disabled={evaluateMutation.isPending}
                  data-testid="button-evaluate"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${evaluateMutation.isPending ? "animate-spin" : ""}`} />
                  {evaluateMutation.isPending ? "Evaluating..." : "Re-evaluate"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {/* CBP - Blood Pressure */}
              {measureId === "CBP" && (
                <>
                  {vitals ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-md border" data-testid="vital-systolic-display">
                          <span className="text-xs text-muted-foreground">Systolic BP</span>
                          <p className="text-2xl font-bold mt-0.5">
                            {(vitals as any).systolic ?? (vitals as any).systolicBp ?? "--"}
                            <span className="text-sm font-normal text-muted-foreground ml-1">mmHg</span>
                          </p>
                          <span className="text-xs text-muted-foreground">Threshold: &lt;140</span>
                        </div>
                        <div className="p-3 rounded-md border" data-testid="vital-diastolic-display">
                          <span className="text-xs text-muted-foreground">Diastolic BP</span>
                          <p className="text-2xl font-bold mt-0.5">
                            {(vitals as any).diastolic ?? (vitals as any).diastolicBp ?? "--"}
                            <span className="text-sm font-normal text-muted-foreground ml-1">mmHg</span>
                          </p>
                          <span className="text-xs text-muted-foreground">Threshold: &lt;90</span>
                        </div>
                      </div>

                      {evidence.controlled != null && (
                        <div className="p-3 rounded-md border" style={{
                          borderColor: evidence.controlled ? "#27749340" : "#FEA00240",
                          backgroundColor: evidence.controlled ? "#27749310" : "#FEA00210",
                        }} data-testid="measure-result-display">
                          <div className="flex items-center gap-2">
                            {evidence.controlled ? (
                              <CheckCircle2 className="w-5 h-5" style={{ color: "#277493" }} />
                            ) : (
                              <AlertTriangle className="w-5 h-5" style={{ color: "#FEA002" }} />
                            )}
                            <div>
                              <span className="text-sm font-semibold" style={{ color: evidence.controlled ? "#277493" : "#9a6700" }}>
                                {evidence.controlled ? "BP Controlled" : "BP Not Controlled"}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {evidence.systolic}/{evidence.diastolic} mmHg vs threshold {evidence.threshold}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {evidence.cptII && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Auto-Generated Codes</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs no-default-hover-elevate" data-testid="code-cptii">
                              CPT-II: {evidence.cptII}
                            </Badge>
                            <Badge variant="secondary" className="text-xs no-default-hover-elevate" data-testid="code-hcpcs">
                              HCPCS: {evidence.hcpcs}
                            </Badge>
                            <Badge variant="secondary" className="text-xs no-default-hover-elevate">
                              ICD-10: I10
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {evidence.controlled
                              ? "3074F = BP adequately controlled, G8476 = Most recent BP has systolic <140 and diastolic <90"
                              : "3075F = BP not adequately controlled, G8477 = Most recent BP has systolic >=140 or diastolic >=90"}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-6 text-center" data-testid="awaiting-vitals">
                      <HeartPulse className="w-8 h-8 mb-2 text-muted-foreground opacity-30" />
                      <span className="text-sm font-medium">Blood Pressure Not Yet Recorded</span>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        Complete the Vitals & Physical Exam to auto-evaluate this measure. BP values will be used to determine if the CBP numerator is met.
                      </p>
                      <Link href={`/visits/${visitId}/intake/vitals`}>
                        <Button variant="outline" size="sm" className="mt-3" data-testid="button-go-vitals">
                          <HeartPulse className="w-4 h-4 mr-1" /> Record Vitals <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              )}

              {/* CDC-A1C - Lab Results */}
              {measureId === "CDC-A1C" && (
                <>
                  {evidence.labValue != null ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-md border" data-testid="lab-a1c-display">
                        <span className="text-xs text-muted-foreground">Most Recent HbA1c</span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-2xl font-bold">{evidence.labValue}</span>
                          <span className="text-sm text-muted-foreground">{evidence.labUnit || "%"}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Collected: {evidence.collectedDate} | Source: {evidence.source}
                        </p>
                      </div>

                      <div className="p-3 rounded-md border" style={{
                        borderColor: evidence.controlStatus === "good_control" ? "#27749340" : evidence.controlStatus === "moderate_control" ? "#FEA00240" : "#E74C3C40",
                        backgroundColor: evidence.controlStatus === "good_control" ? "#27749310" : evidence.controlStatus === "moderate_control" ? "#FEA00210" : "#E74C3C10",
                      }} data-testid="a1c-result-display">
                        <div className="flex items-center gap-2">
                          {evidence.controlStatus === "good_control" ? (
                            <CheckCircle2 className="w-5 h-5" style={{ color: "#277493" }} />
                          ) : evidence.controlStatus === "moderate_control" ? (
                            <AlertTriangle className="w-5 h-5" style={{ color: "#FEA002" }} />
                          ) : (
                            <AlertTriangle className="w-5 h-5" style={{ color: "#E74C3C" }} />
                          )}
                          <div>
                            <span className="text-sm font-semibold" style={{
                              color: evidence.controlStatus === "good_control" ? "#277493" : evidence.controlStatus === "moderate_control" ? "#9a6700" : "#E74C3C"
                            }}>
                              {evidence.controlStatus === "good_control" ? "Good Control (A1c <7%)" :
                               evidence.controlStatus === "moderate_control" ? "Moderate Control (A1c 7-9%)" :
                               "Poor Control (A1c >9%)"}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              Good: &lt;{evidence.goodThreshold}% | Poor: &gt;{evidence.controlThreshold}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {evidence.cptII && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Auto-Generated Codes</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs no-default-hover-elevate" data-testid="code-cpt">
                              CPT: 83036
                            </Badge>
                            <Badge variant="secondary" className="text-xs no-default-hover-elevate" data-testid="code-a1c-cptii">
                              CPT-II: {evidence.cptII}
                            </Badge>
                            <Badge variant="secondary" className="text-xs no-default-hover-elevate">
                              ICD-10: Z13.1
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {evidence.cptII === "3044F" ? "3044F = HbA1c <7% (good glycemic control)" :
                             evidence.cptII === "3045F" ? "3045F = HbA1c 7-9% (moderate glycemic control)" :
                             "3046F = HbA1c >9% (poor glycemic control)"}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-6 text-center" data-testid="awaiting-labs">
                      <FlaskConical className="w-8 h-8 mb-2 text-muted-foreground opacity-30" />
                      <span className="text-sm font-medium">No HbA1c Lab Results Found</span>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        This measure requires an HbA1c lab result from the measurement year. Lab data may come from practice records, HIE, or point-of-care testing.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => evaluateMutation.mutate()}
                        disabled={evaluateMutation.isPending}
                        data-testid="button-check-labs"
                      >
                        <RefreshCw className={`w-4 h-4 mr-1 ${evaluateMutation.isPending ? "animate-spin" : ""}`} />
                        Check for Lab Data
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Auto-completed notice for clinical measures */}
          {isComplete && isClinical && (
            <div className="flex items-center gap-2 p-3 rounded-md border" style={{ borderColor: "#27749340", backgroundColor: "#27749308" }}>
              <Zap className="w-4 h-4 flex-shrink-0" style={{ color: "#277493" }} />
              <p className="text-xs text-muted-foreground">
                This measure was automatically evaluated from clinical data. Codes are derived from the evaluation result and will appear in the coding summary.
              </p>
            </div>
          )}

          {/* Back to intake if complete */}
          {isComplete && (
            <div className="flex items-center justify-end gap-2">
              <Link href={`/visits/${visitId}/intake`}>
                <Button data-testid="button-back-to-intake">
                  Back to Intake <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          )}

          {/* If not complete and vitals exist for CBP, allow manual trigger */}
          {!isComplete && isClinical && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Button variant="outline" onClick={() => setShowUnableForm(true)} data-testid="button-unable-to-assess">
                <Ban className="w-4 h-4 mr-1" /> Unable to Assess
              </Button>
              <Button
                onClick={() => evaluateMutation.mutate()}
                disabled={evaluateMutation.isPending}
                data-testid="button-run-evaluation"
              >
                <Zap className="w-4 h-4 mr-1" />
                {evaluateMutation.isPending ? "Evaluating..." : "Evaluate from Clinical Data"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* EVIDENCE-BASED MEASURE UI (BCS, COL, FMC etc.) */}
      {!isClinical && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5" style={{ color: "#277493" }} />
                <h2 className="text-base font-semibold">Evidence Capture</h2>
              </div>
              {definition?.description && (
                <p className="text-sm text-muted-foreground mt-1">{definition.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {definition?.requiredEvidenceType && (
                <div className="p-3 rounded-md border">
                  <span className="text-xs font-medium text-muted-foreground">Required Evidence</span>
                  <p className="text-sm mt-0.5">{definition.requiredEvidenceType}</p>
                </div>
              )}

              {definition?.cptCodes?.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Associated Codes</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {definition.cptCodes?.map((c: string) => (
                      <Badge key={c} variant="secondary" className="text-xs no-default-hover-elevate">CPT: {c}</Badge>
                    ))}
                    {definition.hcpcsCodes?.map((c: string) => (
                      <Badge key={c} variant="secondary" className="text-xs no-default-hover-elevate">HCPCS: {c}</Badge>
                    ))}
                    {definition.icdCodes?.map((c: string) => (
                      <Badge key={c} variant="secondary" className="text-xs no-default-hover-elevate">ICD-10: {c}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Capture Method</Label>
                <Select value={captureMethod} onValueChange={setCaptureMethod}>
                  <SelectTrigger data-testid="select-capture-method">
                    <SelectValue placeholder="Select how evidence was captured" />
                  </SelectTrigger>
                  <SelectContent>
                    {captureMethods.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Evidence Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Document evidence findings and observations..."
                  className="min-h-[100px]"
                  data-testid="input-evidence-notes"
                />
              </div>
            </CardContent>
          </Card>

          {!isComplete && !showUnableForm && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Button variant="outline" onClick={() => setShowUnableForm(true)} data-testid="button-unable-to-assess">
                Unable to Assess
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!captureMethod || saveMutation.isPending}
                data-testid="button-complete-measure"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Complete Measure"}
              </Button>
            </div>
          )}

          {isComplete && (
            <div className="flex items-center justify-end">
              <Link href={`/visits/${visitId}/intake`}>
                <Button data-testid="button-back-to-intake">
                  Back to Intake <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Unable to Assess form (shared for both types) */}
      {showUnableForm && (
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
                  {UNABLE_TO_ASSESS_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
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
      )}
    </div>
  );
}
