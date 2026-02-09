import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeft, Target, CheckCircle2, Activity, HeartPulse, FlaskConical,
  AlertTriangle, RefreshCw, FileText, ArrowRight, Zap, Ban, Clock,
  CalendarIcon, Info, Search
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
  const [screeningType, setScreeningType] = useState("");
  const [screeningDate, setScreeningDate] = useState("");
  const [screeningResult, setScreeningResult] = useState("");

  useEffect(() => {
    if (existingResult?.captureMethod && !captureMethod) {
      setCaptureMethod(existingResult.captureMethod);
    }
    if (existingResult?.evidenceMetadata) {
      const meta = existingResult.evidenceMetadata as any;
      if (meta.screeningType && !screeningType) setScreeningType(meta.screeningType);
      if (meta.screeningDate && !screeningDate) setScreeningDate(meta.screeningDate);
      if (meta.screeningResult && !screeningResult) setScreeningResult(meta.screeningResult);
    }
  }, [existingResult]);

  const isClinical = definition?.evaluationType === "clinical_data";
  const isScreeningMeasure = measureId === "BCS" || measureId === "COL";
  const vitals = overview?.vitals;
  const evidence = existingResult?.evidenceMetadata as any || {};

  const criteria = definition?.clinicalCriteria as any || {};

  const colScreeningTypes = useMemo(() => {
    if (measureId !== "COL" || !criteria.screeningTypes) return [];
    return (criteria.screeningTypes as any[]).map((s: any) => ({
      type: s.type,
      lookbackYears: s.lookbackYears,
    }));
  }, [measureId, criteria]);

  const bcsScreeningTypes = useMemo(() => {
    if (measureId !== "BCS" || !criteria.screeningTypes) return [];
    return criteria.screeningTypes as string[];
  }, [measureId, criteria]);

  const selectedColScreening = colScreeningTypes.find((s: any) => s.type === screeningType);
  const lookbackInfo = selectedColScreening ? `${selectedColScreening.lookbackYears}-year lookback` : "";

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
      const metadata: Record<string, any> = { notes, capturedAt: new Date().toISOString() };
      if (isScreeningMeasure) {
        metadata.screeningType = screeningType;
        metadata.screeningDate = screeningDate;
        metadata.screeningResult = screeningResult || null;
        if (measureId === "COL" && selectedColScreening) {
          metadata.lookbackYears = selectedColScreening.lookbackYears;
        }
        if (measureId === "BCS") {
          metadata.lookbackMonths = criteria.lookbackMonths || 27;
        }
      }
      await apiRequest("POST", `/api/visits/${visitId}/measures`, {
        measureId,
        captureMethod,
        evidenceMetadata: metadata,
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
          {/* HEDIS Info Banner for screening measures */}
          {isScreeningMeasure && criteria.hedisNote && (
            <div className="flex items-start gap-2 p-3 rounded-md border" style={{ borderColor: "#27749330", backgroundColor: "#27749308" }}>
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#277493" }} />
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold" style={{ color: "#277493" }}>HEDIS Guidance:</span>{" "}
                {criteria.hedisNote}
                {criteria.ageRange && <span className="ml-1">(Ages {criteria.ageRange})</span>}
              </div>
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {isScreeningMeasure ? (
                  <Search className="w-5 h-5" style={{ color: "#277493" }} />
                ) : (
                  <Target className="w-5 h-5" style={{ color: "#277493" }} />
                )}
                <h2 className="text-base font-semibold">
                  {isScreeningMeasure ? "Screening Documentation" : "Evidence Capture"}
                </h2>
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

              {/* BCS-specific screening form */}
              {measureId === "BCS" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Mammogram Type *</Label>
                    <Select value={screeningType} onValueChange={setScreeningType}>
                      <SelectTrigger data-testid="select-screening-type">
                        <SelectValue placeholder="Select mammogram type" />
                      </SelectTrigger>
                      <SelectContent>
                        {bcsScreeningTypes.map((t: string) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      Date Performed *
                    </Label>
                    <Input
                      type="date"
                      value={screeningDate}
                      onChange={(e) => setScreeningDate(e.target.value)}
                      data-testid="input-screening-date"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lookback window: 27 months from end of measurement year. Year-only is acceptable if exact date unknown.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Result / Finding
                      <Badge variant="secondary" className="text-xs no-default-hover-elevate ml-1">Optional</Badge>
                    </Label>
                    <Select value={screeningResult} onValueChange={setScreeningResult}>
                      <SelectTrigger data-testid="select-screening-result">
                        <SelectValue placeholder="Not required for HEDIS compliance" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="benign_finding">Benign Finding</SelectItem>
                        <SelectItem value="abnormal_needs_followup">Abnormal - Needs Follow-up</SelectItem>
                        <SelectItem value="incomplete">Incomplete</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Result is not required for HEDIS BCS compliance. Only the date and type of mammogram are needed.
                    </p>
                  </div>
                </div>
              )}

              {/* COL-specific screening form */}
              {measureId === "COL" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Screening Type *</Label>
                    <Select value={screeningType} onValueChange={setScreeningType}>
                      <SelectTrigger data-testid="select-screening-type">
                        <SelectValue placeholder="Select screening type" />
                      </SelectTrigger>
                      <SelectContent>
                        {colScreeningTypes.map((s: any) => (
                          <SelectItem key={s.type} value={s.type}>
                            {s.type} ({s.lookbackYears}-year lookback)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {lookbackInfo && (
                      <p className="text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {screeningType} has a {lookbackInfo} period.
                        {selectedColScreening && selectedColScreening.lookbackYears >= 5 && " Year-only date is acceptable if exact date is unknown."}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      Date Performed *
                    </Label>
                    <Input
                      type="date"
                      value={screeningDate}
                      onChange={(e) => setScreeningDate(e.target.value)}
                      data-testid="input-screening-date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Result / Finding
                      <Badge variant="secondary" className="text-xs no-default-hover-elevate ml-1">Recommended</Badge>
                    </Label>
                    <Select value={screeningResult} onValueChange={setScreeningResult}>
                      <SelectTrigger data-testid="select-screening-result">
                        <SelectValue placeholder="Result not required if in medical history" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal - No polyps</SelectItem>
                        <SelectItem value="polyps_removed">Polyps Found and Removed</SelectItem>
                        <SelectItem value="adenoma_found">Adenoma Found</SelectItem>
                        <SelectItem value="negative">Negative (FOBT/FIT/sDNA)</SelectItem>
                        <SelectItem value="positive">Positive (FOBT/FIT/sDNA)</SelectItem>
                        <SelectItem value="incomplete">Incomplete Exam</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Result is recommended but not required if screening is documented in the patient's medical history. For member-reported screenings, result is not needed.
                    </p>
                  </div>
                </div>
              )}

              {/* Generic evidence fields (always shown) */}
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
                <Label>{isScreeningMeasure ? "Additional Notes" : "Evidence Notes"}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isScreeningMeasure
                    ? "Additional documentation, location, provider, or clinical context..."
                    : "Document evidence findings and observations..."}
                  className="min-h-[80px]"
                  data-testid="input-evidence-notes"
                />
              </div>
            </CardContent>
          </Card>

          {/* Existing screening evidence display when completed */}
          {isComplete && isScreeningMeasure && evidence.screeningType && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-4 h-4" style={{ color: "#277493" }} />
                  <span className="text-sm font-semibold">Screening Documentation</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-2 rounded-md border">
                    <span className="text-xs text-muted-foreground">Type</span>
                    <p className="text-sm font-medium">{evidence.screeningType}</p>
                  </div>
                  <div className="p-2 rounded-md border">
                    <span className="text-xs text-muted-foreground">Date Performed</span>
                    <p className="text-sm font-medium">{evidence.screeningDate || "Not specified"}</p>
                  </div>
                  <div className="p-2 rounded-md border">
                    <span className="text-xs text-muted-foreground">Result</span>
                    <p className="text-sm font-medium">
                      {evidence.screeningResult
                        ? evidence.screeningResult.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
                        : "Not required"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!isComplete && !showUnableForm && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Button variant="outline" onClick={() => setShowUnableForm(true)} data-testid="button-unable-to-assess">
                Unable to Assess
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!captureMethod || (isScreeningMeasure && (!screeningType || !screeningDate)) || saveMutation.isPending}
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
