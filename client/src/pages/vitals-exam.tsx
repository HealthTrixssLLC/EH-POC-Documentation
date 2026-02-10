import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  HeartPulse,
  Save,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  Check,
  X,
  Mic,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { VALIDATION_OVERRIDE_REASONS, RECOMMENDATION_DISMISS_REASONS } from "@shared/schema";

export default function VitalsExam() {
  const [, params] = useRoute("/visits/:id/intake/vitals");
  const visitId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [warnings, setWarnings] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [overrideDialog, setOverrideDialog] = useState<{ open: boolean; warning: any | null }>({ open: false, warning: null });
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideNote, setOverrideNote] = useState("");

  const { data: bundle, isLoading } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "bundle"],
    enabled: !!visitId,
  });

  const { data: recommendations = [] } = useQuery<any[]>({
    queryKey: ["/api/visits", visitId, "recommendations"],
    enabled: !!visitId,
  });

  const existing = bundle?.vitals;
  const voiceInferred: Record<string, any> = (existing?.voiceInferredFields as Record<string, any>) || {};

  const [form, setForm] = useState({
    systolic: "",
    diastolic: "",
    heartRate: "",
    respiratoryRate: "",
    temperature: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
    painLevel: "",
    notes: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        systolic: existing.systolic?.toString() || "",
        diastolic: existing.diastolic?.toString() || "",
        heartRate: existing.heartRate?.toString() || "",
        respiratoryRate: existing.respiratoryRate?.toString() || "",
        temperature: existing.temperature?.toString() || "",
        oxygenSaturation: existing.oxygenSaturation?.toString() || "",
        weight: existing.weight?.toString() || "",
        height: existing.height?.toString() || "",
        painLevel: existing.painLevel?.toString() || "",
        notes: existing.notes || "",
      });
    }
  }, [existing]);

  const validateMutation = useMutation({
    mutationFn: async (data: any) => {
      const resp = await apiRequest("POST", `/api/visits/${visitId}/validate-vitals`, data);
      return resp.json();
    },
    onSuccess: (result: any) => {
      setWarnings(result.warnings || []);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data: any = { visitId };
      if (form.systolic) data.systolic = parseInt(form.systolic);
      if (form.diastolic) data.diastolic = parseInt(form.diastolic);
      if (form.heartRate) data.heartRate = parseInt(form.heartRate);
      if (form.respiratoryRate) data.respiratoryRate = parseInt(form.respiratoryRate);
      if (form.temperature) data.temperature = parseFloat(form.temperature);
      if (form.oxygenSaturation) data.oxygenSaturation = parseInt(form.oxygenSaturation);
      if (form.weight) data.weight = parseFloat(form.weight);
      if (form.height) data.height = parseFloat(form.height);
      if (form.painLevel) data.painLevel = parseInt(form.painLevel);
      if (form.notes) data.notes = form.notes;
      if (data.weight && data.height) {
        data.bmi = parseFloat((data.weight / ((data.height / 100) ** 2)).toFixed(1));
      }
      await apiRequest("POST", `/api/visits/${visitId}/vitals`, data);

      await apiRequest("POST", `/api/visits/${visitId}/evaluate-rules`, {
        source: "vitals",
        data,
      });

      await apiRequest("POST", `/api/visits/${visitId}/generate-codes`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "bundle"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      toast({ title: "Vitals saved successfully" });
      setLocation(`/visits/${visitId}/intake`);
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async ({ id, reason, note }: { id: string; reason: string; note?: string }) => {
      await apiRequest("PATCH", `/api/recommendations/${id}`, {
        status: "dismissed",
        dismissReason: reason,
        dismissNote: note,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "recommendations"] });
    },
  });

  const overrideMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", `/api/visits/${visitId}/overrides`, data);
    },
    onSuccess: () => {
      toast({ title: "Override recorded" });
    },
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleValidateAndSave = () => {
    const data: any = {};
    if (form.systolic) data.systolic = parseInt(form.systolic);
    if (form.diastolic) data.diastolic = parseInt(form.diastolic);
    if (form.heartRate) data.heartRate = parseInt(form.heartRate);
    if (form.respiratoryRate) data.respiratoryRate = parseInt(form.respiratoryRate);
    if (form.temperature) data.temperature = parseFloat(form.temperature);
    if (form.oxygenSaturation) data.oxygenSaturation = parseInt(form.oxygenSaturation);
    if (form.weight) data.weight = parseFloat(form.weight);
    if (form.height) data.height = parseFloat(form.height);
    if (form.painLevel) data.painLevel = parseInt(form.painLevel);

    validateMutation.mutate(data, {
      onSuccess: (result: any) => {
        const unresolved = (result.warnings || []).filter((w: any) => !overrides[w.field]);
        if (unresolved.length === 0) {
          saveMutation.mutate();
        }
      },
    });
  };

  const handleOverrideSubmit = () => {
    if (!overrideDialog.warning || !overrideReason) return;
    const w = overrideDialog.warning;
    overrideMutation.mutate({
      field: w.field,
      warningType: w.warningType,
      warningMessage: w.message,
      overrideReason,
      overrideNote,
      value: w.value?.toString(),
    });
    setOverrides((prev) => ({ ...prev, [w.field]: true }));
    setOverrideDialog({ open: false, warning: null });
    setOverrideReason("");
    setOverrideNote("");
  };

  const getFieldWarning = (field: string) => warnings.find((w) => w.field === field && !overrides[field]);
  const allWarningsResolved = warnings.length === 0 || warnings.every((w) => overrides[w.field]);

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const pendingRecs = recommendations.filter((r: any) => r.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={`/visits/${visitId}/intake`}>
          <Button variant="ghost" size="sm" data-testid="button-back-intake">
            <ChevronLeft className="w-4 h-4 mr-1" /> Intake
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Vitals & Exam</h1>
      </div>

      {pendingRecs.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-600">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" style={{ color: "#FEA002" }} />
              <h2 className="text-base font-semibold" data-testid="text-recommendations-title">
                Clinical Recommendations ({pendingRecs.length})
              </h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRecs.map((rec: any) => (
              <RecommendationItem
                key={rec.id}
                rec={rec}
                onDismiss={(reason, note) => dismissMutation.mutate({ id: rec.id, reason, note })}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5" style={{ color: "#E74C3C" }} />
            <h2 className="text-base font-semibold">Vital Signs</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <VitalField
              label="Systolic BP (mmHg)"
              field="systolic"
              value={form.systolic}
              onChange={updateField}
              placeholder="120"
              warning={getFieldWarning("systolic")}
              overridden={!!overrides["systolic"]}
              onOverride={(w) => setOverrideDialog({ open: true, warning: w })}
              testId="input-systolic"
              voiceInferred={voiceInferred["systolic"]}
            />
            <VitalField
              label="Diastolic BP (mmHg)"
              field="diastolic"
              value={form.diastolic}
              onChange={updateField}
              placeholder="80"
              warning={getFieldWarning("diastolic")}
              overridden={!!overrides["diastolic"]}
              onOverride={(w) => setOverrideDialog({ open: true, warning: w })}
              testId="input-diastolic"
              voiceInferred={voiceInferred["diastolic"]}
            />
            <VitalField
              label="Heart Rate (bpm)"
              field="heartRate"
              value={form.heartRate}
              onChange={updateField}
              placeholder="72"
              warning={getFieldWarning("heartRate")}
              overridden={!!overrides["heartRate"]}
              onOverride={(w) => setOverrideDialog({ open: true, warning: w })}
              testId="input-heart-rate"
              voiceInferred={voiceInferred["heartRate"]}
            />
            <VitalField
              label="Respiratory Rate (/min)"
              field="respiratoryRate"
              value={form.respiratoryRate}
              onChange={updateField}
              placeholder="16"
              warning={getFieldWarning("respiratoryRate")}
              overridden={!!overrides["respiratoryRate"]}
              onOverride={(w) => setOverrideDialog({ open: true, warning: w })}
              testId="input-respiratory-rate"
              voiceInferred={voiceInferred["respiratoryRate"]}
            />
            <VitalField
              label="Temperature (F)"
              field="temperature"
              value={form.temperature}
              onChange={updateField}
              placeholder="98.6"
              warning={getFieldWarning("temperature")}
              overridden={!!overrides["temperature"]}
              onOverride={(w) => setOverrideDialog({ open: true, warning: w })}
              testId="input-temperature"
              step="0.1"
              voiceInferred={voiceInferred["temperature"]}
            />
            <VitalField
              label="O2 Saturation (%)"
              field="oxygenSaturation"
              value={form.oxygenSaturation}
              onChange={updateField}
              placeholder="98"
              warning={getFieldWarning("oxygenSaturation")}
              overridden={!!overrides["oxygenSaturation"]}
              onOverride={(w) => setOverrideDialog({ open: true, warning: w })}
              testId="input-o2-sat"
              voiceInferred={voiceInferred["oxygenSaturation"]}
            />
            <VitalField
              label="Weight (kg)"
              field="weight"
              value={form.weight}
              onChange={updateField}
              placeholder="70"
              warning={getFieldWarning("weight")}
              overridden={!!overrides["weight"]}
              onOverride={(w) => setOverrideDialog({ open: true, warning: w })}
              testId="input-weight"
              step="0.1"
              voiceInferred={voiceInferred["weight"]}
            />
            <VitalField
              label="Height (cm)"
              field="height"
              value={form.height}
              onChange={updateField}
              placeholder="170"
              warning={getFieldWarning("height")}
              overridden={!!overrides["height"]}
              onOverride={(w) => setOverrideDialog({ open: true, warning: w })}
              testId="input-height"
              step="0.1"
              voiceInferred={voiceInferred["height"]}
            />
            <VitalField
              label="Pain Level (0-10)"
              field="painLevel"
              value={form.painLevel}
              onChange={updateField}
              placeholder="0"
              warning={getFieldWarning("painLevel")}
              overridden={!!overrides["painLevel"]}
              onOverride={(w) => setOverrideDialog({ open: true, warning: w })}
              testId="input-pain"
              min="0"
              max="10"
              voiceInferred={voiceInferred["painLevel"]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-base font-semibold">Exam Notes</h2>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Document exam findings, observations, and relevant notes..."
            className="min-h-[120px]"
            data-testid="input-exam-notes"
          />
        </CardContent>
      </Card>

      {warnings.length > 0 && !allWarningsResolved && (
        <Card className="border-destructive/30">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-destructive mt-0.5" />
            <div>
              <span className="text-sm font-medium text-destructive" data-testid="text-validation-warning">
                {warnings.filter((w) => !overrides[w.field]).length} validation warning(s) require attention
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Override each warning with a documented reason, or correct the values before saving.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3 flex-wrap">
        <Button
          variant="outline"
          onClick={() => {
            const data: any = {};
            if (form.systolic) data.systolic = parseInt(form.systolic);
            if (form.diastolic) data.diastolic = parseInt(form.diastolic);
            if (form.heartRate) data.heartRate = parseInt(form.heartRate);
            if (form.respiratoryRate) data.respiratoryRate = parseInt(form.respiratoryRate);
            if (form.temperature) data.temperature = parseFloat(form.temperature);
            if (form.oxygenSaturation) data.oxygenSaturation = parseInt(form.oxygenSaturation);
            if (form.weight) data.weight = parseFloat(form.weight);
            if (form.height) data.height = parseFloat(form.height);
            if (form.painLevel) data.painLevel = parseInt(form.painLevel);
            validateMutation.mutate(data);
          }}
          data-testid="button-validate-vitals"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Validate
        </Button>
        <Button
          onClick={handleValidateAndSave}
          disabled={saveMutation.isPending || (!allWarningsResolved && warnings.length > 0)}
          data-testid="button-save-vitals"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Vitals"}
        </Button>
      </div>

      <Dialog open={overrideDialog.open} onOpenChange={(open) => setOverrideDialog({ open, warning: open ? overrideDialog.warning : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Validation Warning</DialogTitle>
          </DialogHeader>
          {overrideDialog.warning && (
            <div className="space-y-4">
              <div className="p-3 rounded-md border bg-muted/50">
                <p className="text-sm font-medium text-destructive">{overrideDialog.warning.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Field: {overrideDialog.warning.field} | Value: {overrideDialog.warning.value}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Override Reason</Label>
                <Select value={overrideReason} onValueChange={setOverrideReason}>
                  <SelectTrigger data-testid="select-override-reason">
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {VALIDATION_OVERRIDE_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Additional Notes (optional)</Label>
                <Textarea
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  placeholder="Provide additional context..."
                  data-testid="input-override-note"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialog({ open: false, warning: null })} data-testid="button-cancel-override">
              Cancel
            </Button>
            <Button onClick={handleOverrideSubmit} disabled={!overrideReason} data-testid="button-submit-override">
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VitalField({
  label, field, value, onChange, placeholder, warning, overridden, onOverride, testId, step, min, max, voiceInferred,
}: {
  label: string;
  field: string;
  value: string;
  onChange: (field: string, value: string) => void;
  placeholder: string;
  warning: any;
  overridden: boolean;
  onOverride: (warning: any) => void;
  testId: string;
  step?: string;
  min?: string;
  max?: string;
  voiceInferred?: any;
}) {
  const isVoice = !!voiceInferred;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label>{label}</Label>
        {isVoice && (
          <Badge
            variant="outline"
            className="text-[10px] border-violet-400 text-violet-600 dark:text-violet-400 dark:border-violet-500"
            data-testid={`badge-voice-${field}`}
          >
            <Mic className="w-2.5 h-2.5 mr-0.5" /> Voice
          </Badge>
        )}
      </div>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        className={
          warning
            ? "border-destructive"
            : overridden
            ? "border-amber-400"
            : isVoice
            ? "border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-950/30 ring-1 ring-violet-200 dark:ring-violet-800"
            : ""
        }
        data-testid={testId}
      />
      {isVoice && !warning && (
        <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400" data-testid={`text-voice-source-${field}`}>
          <Mic className="w-3 h-3 flex-shrink-0" />
          <span>
            Auto-filled from voice ({Math.round((voiceInferred.confidence || 0) * 100)}% confidence)
          </span>
        </div>
      )}
      {warning && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-destructive mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-destructive" data-testid={`warning-${field}`}>{warning.message}</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs mt-1 h-auto p-1"
              onClick={() => onOverride(warning)}
              data-testid={`button-override-${field}`}
            >
              Override with reason
            </Button>
          </div>
        </div>
      )}
      {overridden && (
        <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <Check className="w-3 h-3" />
          <span>Overridden</span>
        </div>
      )}
    </div>
  );
}

function RecommendationItem({ rec, onDismiss }: { rec: any; onDismiss: (reason: string, note?: string) => void }) {
  const [showDismiss, setShowDismiss] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="p-3 rounded-md border bg-amber-50/50 dark:bg-amber-950/20 space-y-2" data-testid={`recommendation-${rec.ruleId}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#FEA002" }} />
          <div className="min-w-0">
            <p className="text-sm font-medium">{rec.ruleName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{rec.recommendation}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowDismiss(!showDismiss)}
            data-testid={`button-dismiss-${rec.ruleId}`}
          >
            <X className="w-3 h-3 mr-1" /> Dismiss
          </Button>
        </div>
      </div>
      {showDismiss && (
        <div className="space-y-2 pl-6">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger data-testid={`select-dismiss-reason-${rec.ruleId}`}>
              <SelectValue placeholder="Select dismiss reason..." />
            </SelectTrigger>
            <SelectContent>
              {RECOMMENDATION_DISMISS_REASONS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional notes..."
            className="min-h-[60px]"
            data-testid={`input-dismiss-note-${rec.ruleId}`}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setShowDismiss(false); setReason(""); setNote(""); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!reason}
              onClick={() => { onDismiss(reason, note); setShowDismiss(false); }}
              data-testid={`button-confirm-dismiss-${rec.ruleId}`}
            >
              Confirm Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
