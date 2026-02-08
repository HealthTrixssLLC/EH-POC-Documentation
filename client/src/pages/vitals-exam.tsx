import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, HeartPulse, Save } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function VitalsExam() {
  const [, params] = useRoute("/visits/:id/intake/vitals");
  const visitId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: bundle, isLoading } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "bundle"],
    enabled: !!visitId,
  });

  const existing = bundle?.vitals;

  const [form, setForm] = useState({
    systolic: existing?.systolic?.toString() || "",
    diastolic: existing?.diastolic?.toString() || "",
    heartRate: existing?.heartRate?.toString() || "",
    respiratoryRate: existing?.respiratoryRate?.toString() || "",
    temperature: existing?.temperature?.toString() || "",
    oxygenSaturation: existing?.oxygenSaturation?.toString() || "",
    weight: existing?.weight?.toString() || "",
    height: existing?.height?.toString() || "",
    painLevel: existing?.painLevel?.toString() || "",
    notes: existing?.notes || "",
  });

  const mutation = useMutation({
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "bundle"] });
      toast({ title: "Vitals saved successfully" });
      setLocation(`/visits/${visitId}/intake`);
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

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

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5" style={{ color: "#E74C3C" }} />
            <h2 className="text-base font-semibold">Vital Signs</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Systolic BP (mmHg)</Label>
              <Input type="number" value={form.systolic} onChange={(e) => updateField("systolic", e.target.value)} placeholder="120" data-testid="input-systolic" />
            </div>
            <div className="space-y-2">
              <Label>Diastolic BP (mmHg)</Label>
              <Input type="number" value={form.diastolic} onChange={(e) => updateField("diastolic", e.target.value)} placeholder="80" data-testid="input-diastolic" />
            </div>
            <div className="space-y-2">
              <Label>Heart Rate (bpm)</Label>
              <Input type="number" value={form.heartRate} onChange={(e) => updateField("heartRate", e.target.value)} placeholder="72" data-testid="input-heart-rate" />
            </div>
            <div className="space-y-2">
              <Label>Respiratory Rate (/min)</Label>
              <Input type="number" value={form.respiratoryRate} onChange={(e) => updateField("respiratoryRate", e.target.value)} placeholder="16" data-testid="input-respiratory-rate" />
            </div>
            <div className="space-y-2">
              <Label>Temperature (F)</Label>
              <Input type="number" step="0.1" value={form.temperature} onChange={(e) => updateField("temperature", e.target.value)} placeholder="98.6" data-testid="input-temperature" />
            </div>
            <div className="space-y-2">
              <Label>O2 Saturation (%)</Label>
              <Input type="number" value={form.oxygenSaturation} onChange={(e) => updateField("oxygenSaturation", e.target.value)} placeholder="98" data-testid="input-o2-sat" />
            </div>
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input type="number" step="0.1" value={form.weight} onChange={(e) => updateField("weight", e.target.value)} placeholder="70" data-testid="input-weight" />
            </div>
            <div className="space-y-2">
              <Label>Height (cm)</Label>
              <Input type="number" step="0.1" value={form.height} onChange={(e) => updateField("height", e.target.value)} placeholder="170" data-testid="input-height" />
            </div>
            <div className="space-y-2">
              <Label>Pain Level (0-10)</Label>
              <Input type="number" min="0" max="10" value={form.painLevel} onChange={(e) => updateField("painLevel", e.target.value)} placeholder="0" data-testid="input-pain" />
            </div>
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

      <div className="flex justify-end">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-save-vitals">
          <Save className="w-4 h-4 mr-2" />
          {mutation.isPending ? "Saving..." : "Save Vitals"}
        </Button>
      </div>
    </div>
  );
}
