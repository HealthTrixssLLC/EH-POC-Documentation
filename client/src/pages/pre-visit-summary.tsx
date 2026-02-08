import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";

const checklistStatusColors: Record<string, string> = {
  not_started: "secondary",
  in_progress: "default",
  complete: "default",
  unable_to_assess: "outline",
};

export default function PreVisitSummary() {
  const [, params] = useRoute("/visits/:id/summary");
  const visitId = params?.id;

  const { data: bundle, isLoading } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "bundle"],
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/visits">
          <Button variant="ghost" size="sm" data-testid="button-back-visits">
            <ChevronLeft className="w-4 h-4 mr-1" /> Visits
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-5" />
        <h1 className="text-xl font-bold" data-testid="text-previsit-title">Pre-Visit Summary</h1>
      </div>

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

      <div className="flex justify-end">
        <Link href={`/visits/${visitId}/intake`}>
          <Button data-testid="button-start-visit">
            Start Visit <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
