import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ClipboardList, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AssessmentRunner() {
  const [, params] = useRoute("/visits/:id/intake/assessment/:aid");
  const visitId = params?.id;
  const assessmentId = params?.aid;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: definition, isLoading: loadingDef } = useQuery<any>({
    queryKey: ["/api/assessments/definitions", assessmentId],
    enabled: !!assessmentId,
  });

  const { data: existingResponse } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "assessments", assessmentId],
    enabled: !!visitId && !!assessmentId,
  });

  const { data: reasonCodes } = useQuery<any[]>({
    queryKey: ["/api/reason-codes", { category: "unable_to_assess" }],
    queryFn: async () => {
      const res = await fetch("/api/reason-codes?category=unable_to_assess");
      if (!res.ok) return [];
      const data = await res.json();
      const declined = await fetch("/api/reason-codes?category=patient_declined");
      if (declined.ok) {
        const d = await declined.json();
        return [...data, ...d];
      }
      return data;
    },
  });

  const [responses, setResponses] = useState<Record<string, string>>({});
  const [unableReason, setUnableReason] = useState("");
  const [unableNote, setUnableNote] = useState("");
  const [showUnableForm, setShowUnableForm] = useState(false);

  useEffect(() => {
    if (existingResponse?.responses) {
      const raw = existingResponse.responses as Record<string, any>;
      const normalized: Record<string, string> = {};
      for (const [key, val] of Object.entries(raw)) {
        if (key.startsWith("_")) continue;
        if (typeof val === "object" && val !== null && "value" in val) {
          normalized[key] = String(val.value);
        } else if (typeof val === "string" || typeof val === "number") {
          normalized[key] = String(val);
        }
      }
      setResponses(normalized);
    }
  }, [existingResponse]);

  const questions: any[] = useMemo(() => {
    if (!definition?.questions) return [];
    return Array.isArray(definition.questions) ? definition.questions : [];
  }, [definition]);

  const computedScore = useMemo(() => {
    if (!questions.length) return 0;
    let total = 0;
    questions.forEach((q: any) => {
      const answer = responses[q.id];
      if (answer !== undefined && q.options) {
        const opt = q.options.find((o: any) => o.value === answer);
        if (opt?.score !== undefined) total += opt.score;
      }
    });
    return total;
  }, [responses, questions]);

  const answeredCount = Object.keys(responses).length;
  const progressPct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  const interpretation = useMemo(() => {
    if (!definition?.interpretationBands) return null;
    const bands = definition.interpretationBands as any[];
    for (const band of bands) {
      if (computedScore >= band.min && computedScore <= band.max) {
        return band;
      }
    }
    return null;
  }, [computedScore, definition]);

  const saveMutation = useMutation({
    mutationFn: async (opts: { status: string }) => {
      const res = await apiRequest("POST", `/api/visits/${visitId}/assessments`, {
        instrumentId: assessmentId,
        instrumentVersion: definition?.version || "1.0",
        responses,
        computedScore,
        interpretation: interpretation?.label || null,
        status: opts.status,
      });
      const data = await res.json();

      if (opts.status === "complete") {
        await apiRequest("POST", `/api/visits/${visitId}/evaluate-rules`, {
          source: "assessment",
          data: { instrumentId: assessmentId, score: computedScore },
        });
        await apiRequest("POST", `/api/visits/${visitId}/generate-codes`, {});
      }
      return data;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "tasks"] });
      toast({ title: vars.status === "complete" ? "Assessment completed" : "Draft saved" });
      if (vars.status === "complete" && data?.branchingTriggered?.length > 0) {
        toast({ title: "Follow-up Recommended", description: "Follow-up assessments or referrals have been recommended based on assessment results." });
      }
      if (vars.status === "complete") setLocation(`/visits/${visitId}/intake`);
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const unableMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/visits/${visitId}/assessments/unable`, {
        instrumentId: assessmentId,
        reason: unableReason,
        note: unableNote,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId] });
      toast({ title: "Marked as unable to assess" });
      setLocation(`/visits/${visitId}/intake`);
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  if (loadingDef) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!definition) {
    return (
      <div className="space-y-6">
        <Link href={`/visits/${visitId}/intake`}>
          <Button variant="ghost" size="sm"><ChevronLeft className="w-4 h-4 mr-1" /> Intake</Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <AlertCircle className="w-10 h-10 mb-3 text-muted-foreground opacity-40" />
            <span className="text-sm text-muted-foreground">Assessment definition not found</span>
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
          <h1 className="text-xl font-bold" data-testid="text-assessment-title">{definition.name}</h1>
          <p className="text-sm text-muted-foreground">Version {definition.version} - {definition.category}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-xs text-muted-foreground">{answeredCount}/{questions.length}</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
        <Card className="flex-shrink-0">
          <CardContent className="p-3 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Score:</span>
            <span className="text-xl font-bold" data-testid="text-assessment-score">{computedScore}</span>
            {interpretation && (
              <Badge variant={interpretation.severity === "severe" ? "destructive" : "secondary"} className="text-xs">
                {interpretation.label}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {questions.map((q: any, idx: number) => (
          <Card key={q.id}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-muted-foreground flex-shrink-0 mt-0.5">
                    Q{idx + 1}.
                  </span>
                  <Label className="text-sm font-medium leading-snug">{q.text}</Label>
                </div>
                <RadioGroup
                  value={responses[q.id] || ""}
                  onValueChange={(val) => setResponses((prev) => ({ ...prev, [q.id]: val }))}
                  className="space-y-2 pl-6"
                >
                  {(q.options || []).map((opt: any) => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <RadioGroupItem value={opt.value} id={`${q.id}-${opt.value}`} data-testid={`radio-${q.id}-${opt.value}`} />
                      <Label htmlFor={`${q.id}-${opt.value}`} className="text-sm cursor-pointer">
                        {opt.label}
                        {opt.score !== undefined && (
                          <span className="text-xs text-muted-foreground ml-1">({opt.score})</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showUnableForm ? (
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
                  {(reasonCodes || []).map((r: any) => (
                    <SelectItem key={r.id} value={r.label}>{r.label}</SelectItem>
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
      ) : (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button variant="outline" onClick={() => setShowUnableForm(true)} data-testid="button-unable-to-assess">
            Unable to Assess
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => saveMutation.mutate({ status: "in_progress" })}
              disabled={saveMutation.isPending}
              data-testid="button-save-draft"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={() => saveMutation.mutate({ status: "complete" })}
              disabled={answeredCount < questions.length || saveMutation.isPending}
              data-testid="button-complete-assessment"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Complete Assessment"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
