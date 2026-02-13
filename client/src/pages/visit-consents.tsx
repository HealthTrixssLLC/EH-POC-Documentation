import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeft,
  FileText,
  Mic,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { apiRequest, queryClient, resolveUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePlatform } from "@/hooks/use-platform";

const noppMethods = [
  { value: "verbal", label: "In-Person" },
  { value: "digital", label: "Digital Copy" },
  { value: "previously_delivered", label: "Previously Delivered" },
];

const consentMethods = [
  { value: "verbal", label: "Verbal Attestation" },
  { value: "written", label: "Written Consent" },
];

export default function VisitConsents() {
  const { isMobileLayout } = usePlatform();
  const [, params] = useRoute("/visits/:id/intake/consents");
  const visitId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [noppMethod, setNoppMethod] = useState("");
  const [consentMethod, setConsentMethod] = useState("");
  const [showException, setShowException] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [exceptionNote, setExceptionNote] = useState("");

  const { data: consents = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/visits", visitId, "consents"],
    enabled: !!visitId,
  });

  const { data: consentExceptionReasons } = useQuery<any[]>({
    queryKey: ["/api/reason-codes", { category: "consent_exception" }],
    queryFn: async () => {
      const res = await fetch(resolveUrl("/api/reason-codes?category=consent_exception"));
      if (!res.ok) return [];
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", `/api/visits/${visitId}/consents`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "consents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      toast({ title: "Consent recorded" });
      setShowException(false);
      setExceptionReason("");
      setExceptionNote("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to record consent", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const noppConsent = consents.find((c: any) => c.consentType === "nopp");
  const voiceConsent = consents.find((c: any) => c.consentType === "voice_transcription");

  const noppDone = noppConsent && (noppConsent.status === "granted" || noppConsent.status === "exception");
  const voiceDone = voiceConsent && (voiceConsent.status === "granted" || voiceConsent.status === "declined");

  return (
    <div className={`space-y-6 ${isMobileLayout ? "pb-20 px-4" : ""}`}>
      {isMobileLayout ? (
        <h1 className="text-lg font-bold pt-2" data-testid="text-consents-title">Visit Consents</h1>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/visits/${visitId}/intake`}>
            <Button variant="ghost" size="sm" data-testid="button-back-intake">
              <ChevronLeft className="w-4 h-4 mr-1" /> Intake
            </Button>
          </Link>
          <h1 className="text-xl font-bold" data-testid="text-consents-title">Visit Compliance</h1>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: "#2E456B" }} />
            <h2 className="text-base font-semibold">Notice of Privacy Practices (NOPP)</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Federal law requires acknowledgement of privacy practices before clinical services
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {noppConsent?.status === "granted" ? (
            <div className="flex items-start gap-3 p-3 rounded-md border" style={{ borderColor: "#27749340", backgroundColor: "#27749308" }}>
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#277493" }} />
              <div>
                <span className="text-sm font-medium" data-testid="text-nopp-status">NOPP Acknowledged</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Method: {noppConsent.method?.replace(/_/g, " ")} | {noppConsent.capturedAt ? new Date(noppConsent.capturedAt).toLocaleString() : ""}
                  {noppConsent.capturedByName ? ` | By: ${noppConsent.capturedByName}` : ""}
                </p>
              </div>
            </div>
          ) : noppConsent?.status === "exception" ? (
            <div className="flex items-start gap-3 p-3 rounded-md border" style={{ borderColor: "#FEA00240", backgroundColor: "#FEA00208" }}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#FEA002" }} />
              <div>
                <span className="text-sm font-medium" data-testid="text-nopp-status">NOPP Exception Documented</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reason: {noppConsent.exceptionReason}
                  {noppConsent.exceptionNote ? ` - ${noppConsent.exceptionNote}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {noppConsent.capturedAt ? new Date(noppConsent.capturedAt).toLocaleString() : ""}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Delivery Method</Label>
                <Select value={noppMethod} onValueChange={setNoppMethod}>
                  <SelectTrigger data-testid="select-nopp-method">
                    <SelectValue placeholder="Select delivery method" />
                  </SelectTrigger>
                  <SelectContent>
                    {noppMethods.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={() => mutation.mutate({ consentType: "nopp", status: "granted", method: noppMethod })}
                  disabled={!noppMethod || mutation.isPending}
                  data-testid="button-acknowledge-nopp"
                >
                  {mutation.isPending ? "Saving..." : "Acknowledge NOPP"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowException(!showException)}
                  data-testid="button-nopp-exception"
                >
                  Unable to Obtain
                </Button>
              </div>

              {showException && (
                <div className="space-y-3 p-3 rounded-md border">
                  <div className="space-y-2">
                    <Label>Exception Reason</Label>
                    <Select value={exceptionReason} onValueChange={setExceptionReason}>
                      <SelectTrigger data-testid="select-exception-reason">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {(consentExceptionReasons || []).map((r: any) => (
                          <SelectItem key={r.id} value={r.label}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      value={exceptionNote}
                      onChange={(e) => setExceptionNote(e.target.value)}
                      placeholder="Additional details..."
                      data-testid="input-exception-note"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => mutation.mutate({
                      consentType: "nopp",
                      status: "exception",
                      exceptionReason,
                      exceptionNote: exceptionNote || undefined,
                    })}
                    disabled={!exceptionReason || mutation.isPending}
                    data-testid="button-submit-exception"
                  >
                    Document Exception
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5" style={{ color: "#2E456B" }} />
            <h2 className="text-base font-semibold">Voice Transcription Consent</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Patient consent required before any audio recording or AI transcription during this visit
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {voiceConsent?.status === "granted" ? (
            <div className="flex items-start gap-3 p-3 rounded-md border" style={{ borderColor: "#27749340", backgroundColor: "#27749308" }}>
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#277493" }} />
              <div>
                <span className="text-sm font-medium" data-testid="text-consent-status">Consent Granted</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Method: {voiceConsent.method?.replace(/_/g, " ")} | {voiceConsent.capturedAt ? new Date(voiceConsent.capturedAt).toLocaleString() : ""}
                </p>
              </div>
            </div>
          ) : voiceConsent?.status === "declined" ? (
            <div className="flex items-start gap-3 p-3 rounded-md border" style={{ borderColor: "#277493", backgroundColor: "#27749308" }}>
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#277493" }} />
              <div>
                <span className="text-sm font-medium" data-testid="text-consent-status">Consent Declined</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Voice transcription features are disabled for this encounter.
                </p>
                <p className="text-xs text-muted-foreground">
                  {voiceConsent.capturedAt ? new Date(voiceConsent.capturedAt).toLocaleString() : ""}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Consent Method</Label>
                <Select value={consentMethod} onValueChange={setConsentMethod}>
                  <SelectTrigger data-testid="select-consent-method">
                    <SelectValue placeholder="Select consent method" />
                  </SelectTrigger>
                  <SelectContent>
                    {consentMethods.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={() => mutation.mutate({ consentType: "voice_transcription", status: "granted", method: consentMethod })}
                  disabled={!consentMethod || mutation.isPending}
                  data-testid="button-grant-consent"
                >
                  {mutation.isPending ? "Saving..." : "Record Consent"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => mutation.mutate({ consentType: "voice_transcription", status: "declined" })}
                  disabled={mutation.isPending}
                  data-testid="button-decline-consent"
                >
                  Patient Declines
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Voice transcription consent can also be obtained later if the feature is enabled during the visit.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Link href={`/visits/${visitId}/intake`}>
          <Button variant="outline" data-testid="button-return-intake">
            Return to Intake
          </Button>
        </Link>
      </div>
    </div>
  );
}
