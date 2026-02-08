import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Target, CheckCircle2 } from "lucide-react";
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

  const { data: existingResult } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "measures", measureId],
    enabled: !!visitId && !!measureId,
  });

  const [captureMethod, setCaptureMethod] = useState(existingResult?.captureMethod || "");
  const [notes, setNotes] = useState("");
  const [unableReason, setUnableReason] = useState("");
  const [unableNote, setUnableNote] = useState("");
  const [showUnableForm, setShowUnableForm] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={`/visits/${visitId}/intake`}>
          <Button variant="ghost" size="sm" data-testid="button-back-intake">
            <ChevronLeft className="w-4 h-4 mr-1" /> Intake
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-measure-title">
            {definition?.name || "HEDIS Measure"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {definition?.category} - Version {definition?.version || "1.0"}
          </p>
        </div>
      </div>

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
      ) : (
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
    </div>
  );
}
