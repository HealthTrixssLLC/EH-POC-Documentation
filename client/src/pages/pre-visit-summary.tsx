import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { usePlatform } from "@/hooks/use-platform";
import {
  User,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
  Pill,
  HeartPulse,
  ClipboardCheck,
  ArrowRight,
  ChevronLeft,
  Shield,
  Target,
  FileWarning,
  Activity,
  Stethoscope,
  CircleAlert,
  CheckCircle2,
  XCircle,
  Clock,
  FlaskConical,
  Syringe,
} from "lucide-react";

const checklistStatusColors: Record<string, string> = {
  not_started: "secondary",
  in_progress: "default",
  complete: "default",
  unable_to_assess: "outline",
};

const conditionStatusConfig: Record<string, { label: string; variant: string; icon: any }> = {
  pending: { label: "Needs Review", variant: "secondary", icon: Clock },
  confirmed: { label: "Confirmed", variant: "default", icon: CheckCircle2 },
  dismissed: { label: "Dismissed", variant: "outline", icon: XCircle },
};

const priorityColors: Record<string, string> = {
  high: "#E74C3C",
  medium: "#FEA002",
  low: "#277493",
};

export default function PreVisitSummary() {
  const [, params] = useRoute("/visits/:id/summary");
  const visitId = params?.id;
  const { isMobileLayout } = usePlatform();

  const { data: bundle, isLoading } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "bundle"],
    enabled: !!visitId,
  });

  const { data: hieData, isLoading: hieLoading } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "previsit-summary"],
    enabled: !!visitId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const visit = bundle?.visit;
  const member = bundle?.member;
  const checklist = bundle?.checklist || [];
  const targets = bundle?.targets || [];

  const hasHie = hieData?.hasHieData === true;
  const actionItems = hieData?.actionItems || [];
  const suspectedDiagnoses = hieData?.suspectedDiagnoses;
  const medicationReview = hieData?.medicationReview;
  const careGaps = hieData?.careGaps || [];
  const ingestionSummary = hieData?.ingestionSummary;

  return (
    <div className={`space-y-6 ${isMobileLayout ? "pb-24 px-4" : ""}`}>
      {!isMobileLayout && (
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/visits">
            <Button variant="ghost" size="sm" data-testid="button-back-visits">
              <ChevronLeft className="w-4 h-4 mr-1" /> Visits
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <h1 className="text-xl font-bold" data-testid="text-previsit-title">Pre-Visit Summary</h1>
        </div>
      )}
      {isMobileLayout && (
        <h1 className="text-lg font-bold pt-2" data-testid="text-previsit-title-mobile">Pre-Visit Summary</h1>
      )}

      {member && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center justify-center w-12 h-12 rounded-md flex-shrink-0" style={{ backgroundColor: "#2E456B15" }}>
                  <User className="w-6 h-6" style={{ color: "#2E456B" }} />
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold" data-testid="text-member-name">
                    {member.firstName} {member.lastName}
                  </h2>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span>DOB: {member.dob}</span>
                    <span>ID: {member.memberId}</span>
                    {member.gender && <span>Gender: {member.gender}</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                {member.phone && (
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {member.phone}</span>
                )}
                {member.address && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {member.address}, {member.city}, {member.state} {member.zip}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {visit && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="w-4 h-4" /> {visit.scheduledDate} {visit.scheduledTime || ""}
              </span>
              <Badge variant="secondary">{visit.visitType?.replace(/_/g, " ")}</Badge>
              {visit.travelNotes && <span className="text-muted-foreground">Travel: {visit.travelNotes}</span>}
              {visit.safetyNotes && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="w-3 h-3" /> {visit.safetyNotes}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {hieLoading && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      )}

      {hasHie && (
        <Card data-testid="card-hie-intelligence">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: "#277493" }} />
                <h3 className="text-sm font-semibold">External Records Review</h3>
              </div>
              {ingestionSummary && (
                <span className="text-xs text-muted-foreground" data-testid="text-hie-source">
                  Source: {ingestionSummary.sourceSystem} &middot; Received {new Date(ingestionSummary.lastIngested).toLocaleDateString()}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {actionItems.length > 0 && (
              <div className="rounded-md p-3 space-y-2" style={{ backgroundColor: "#FEA00210", border: "1px solid #FEA00230" }} data-testid="section-action-items">
                <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#FEA002" }}>
                  <CircleAlert className="w-3.5 h-3.5" />
                  Before You Begin
                </span>
                {actionItems.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm" data-testid={`action-item-${i}`}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: priorityColors[item.priority] || "#277493" }} />
                    <span>{item.message}</span>
                  </div>
                ))}
              </div>
            )}

            {suspectedDiagnoses && suspectedDiagnoses.total > 0 && (
              <div data-testid="section-suspected-diagnoses">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5" />
                    Suspected Diagnoses from External Records
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {suspectedDiagnoses.pending > 0 && (
                      <Badge variant="secondary" className="text-xs" data-testid="badge-diagnoses-pending">
                        {suspectedDiagnoses.pending} needs review
                      </Badge>
                    )}
                    {suspectedDiagnoses.confirmed > 0 && (
                      <Badge variant="default" className="text-xs" data-testid="badge-diagnoses-confirmed">
                        {suspectedDiagnoses.confirmed} confirmed
                      </Badge>
                    )}
                    {suspectedDiagnoses.dismissed > 0 && (
                      <Badge variant="outline" className="text-xs" data-testid="badge-diagnoses-dismissed">
                        {suspectedDiagnoses.dismissed} dismissed
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {suspectedDiagnoses.items.map((cond: any) => {
                    const cfg = conditionStatusConfig[cond.status] || conditionStatusConfig.pending;
                    const StatusIcon = cfg.icon;
                    return (
                      <div key={cond.id} className="flex items-center justify-between gap-3 p-2 rounded-md border text-sm flex-wrap" data-testid={`suspected-condition-${cond.icdCode}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: cond.status === "confirmed" ? "#277493" : cond.status === "dismissed" ? undefined : "#FEA002" }} />
                          <span className="font-medium">{cond.description}</span>
                          <Badge variant="outline" className="text-xs font-mono">{cond.icdCode}</Badge>
                        </div>
                        <Badge variant={cfg.variant as any} className="text-xs">
                          {cfg.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {medicationReview && medicationReview.total > 0 && (
              <div data-testid="section-hie-medications">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5" />
                    Medications from External Records
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs" data-testid="badge-meds-total">
                      {medicationReview.total} found
                    </Badge>
                    {medicationReview.pendingVerification > 0 && (
                      <Badge variant="secondary" className="text-xs" data-testid="badge-meds-pending">
                        {medicationReview.pendingVerification} to verify
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {medicationReview.pendingVerification > 0
                    ? `${medicationReview.pendingVerification} medication${medicationReview.pendingVerification > 1 ? "s" : ""} from external records need to be verified with the patient during medication reconciliation.`
                    : "All external medications have been reviewed."}
                </p>
              </div>
            )}

            {careGaps.length > 0 && (
              <div data-testid="section-care-gaps">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                  <FlaskConical className="w-3.5 h-3.5" />
                  Quality Measure Opportunities
                </span>
                <div className="space-y-1.5">
                  {careGaps.slice(0, 5).map((gap: any) => (
                    <div key={gap.measureId} className="flex items-center justify-between gap-3 p-2 rounded-md border text-sm flex-wrap" data-testid={`care-gap-${gap.measureId}`}>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-medium">{gap.measureName}</span>
                        {gap.recommendation && (
                          <span className="text-xs text-muted-foreground">{gap.recommendation}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        {gap.hieEvidence?.length > 0 && (
                          <Badge variant="outline" className="text-xs" style={{ borderColor: "#27749340", color: "#277493" }}>
                            HIE evidence
                          </Badge>
                        )}
                        <Badge variant={gap.status === "gap" ? "secondary" : "outline"} className="text-xs capitalize">
                          {gap.status === "gap" ? "Open" : "Partial"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {careGaps.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      +{careGaps.length - 5} more measure{careGaps.length - 5 > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" style={{ color: "#277493" }} />
              <h3 className="text-sm font-semibold">Required Assessments & Measures</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {checklist.length ? (
              checklist.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between gap-3 p-2 rounded-md border text-sm flex-wrap" data-testid={`checklist-item-${item.id}`}>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium truncate">{item.itemName}</span>
                    <span className="text-xs text-muted-foreground capitalize">{item.itemType.replace(/_/g, " ")}</span>
                  </div>
                  <Badge variant={checklistStatusColors[item.status] as any} className="text-xs capitalize">
                    {item.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <ClipboardCheck className="w-6 h-6 mb-2 opacity-40" />
                <span className="text-xs">No required items</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {targets.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" style={{ color: "#FEA002" }} />
                  <h3 className="text-sm font-semibold">Plan Targets & Care Gaps</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {targets.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm p-2 rounded-md border">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                      backgroundColor: t.priority === "high" ? "#E74C3C" : t.priority === "medium" ? "#FEA002" : "#277493"
                    }} />
                    <span className="truncate">{t.description}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {member && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4" style={{ color: "#E74C3C" }} />
                  <h3 className="text-sm font-semibold">Clinical History</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {member.conditions?.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block mb-1">Conditions</span>
                    <div className="flex flex-wrap gap-1">
                      {member.conditions.map((c: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {member.medications?.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                      <Pill className="w-3 h-3" /> Medications
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {member.medications.map((m: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{m}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {member.allergies?.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                      <FileWarning className="w-3 h-3" /> Allergies
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {member.allergies.map((a: string, i: number) => (
                        <Badge key={i} variant="destructive" className="text-xs">{a}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {member.riskFlags?.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                      <Shield className="w-3 h-3" /> Risk Flags
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {member.riskFlags.map((r: string, i: number) => (
                        <Badge key={i} variant="destructive" className="text-xs">{r}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {!isMobileLayout && (
        <div className="flex justify-end">
          <Link href={`/visits/${visitId}/intake`}>
            <Button data-testid="button-start-visit">
              Start Visit <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      {isMobileLayout && (
        <div className="fixed bottom-16 left-0 right-0 p-4 border-t bg-background" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
          <Link href={`/visits/${visitId}/intake`}>
            <Button className="w-full" size="lg" data-testid="button-start-visit-mobile">
              Start Visit <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
