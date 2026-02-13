import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  HeartPulse,
  ClipboardList,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  Shield,
  FileWarning,
  Pill,
  Activity,
  TrendingUp,
} from "lucide-react";
import { usePlatform } from "@/hooks/use-platform";

export default function PatientContext() {
  const { isMobileLayout } = usePlatform();
  const [, params] = useRoute("/visits/:id/intake/patient-context");
  const visitId = params?.id;

  const { data: overview, isLoading } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "overview"],
    enabled: !!visitId,
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

  const member = overview?.member;
  const vitals = overview?.vitals;
  const medRecon = overview?.medRecon || [];
  const assessmentResponses = overview?.assessmentResponses || [];
  const vitalsFlags = overview?.vitalsFlags || [];
  const assessmentFlags = overview?.assessmentFlags || [];
  const allFlags = [...vitalsFlags, ...assessmentFlags.map((f: any) => ({ ...f, message: `${f.instrumentId}: Score ${f.score} - ${f.interpretation}`, label: f.instrumentId }))];

  return (
    <div className={`space-y-4 ${isMobileLayout ? "pb-20 px-4" : ""}`}>
      {isMobileLayout ? (
        <h1 className="text-lg font-bold pt-2" data-testid="text-context-title">Patient Context</h1>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/visits/${visitId}/intake`}>
            <Button variant="ghost" size="sm" data-testid="button-back-intake">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Intake
            </Button>
          </Link>
          <h1 className="text-xl font-bold" data-testid="text-context-title">
            Patient Context {member ? `- ${member.firstName} ${member.lastName}` : ""}
          </h1>
        </div>
      )}

      {/* Clinical Alerts */}
      {allFlags.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: "#E74C3C" }} />
              <h3 className="text-sm font-semibold">Clinical Alerts</h3>
              <Badge variant="destructive" className="text-xs">{allFlags.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {allFlags.map((flag: any, i: number) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-md border" style={{
                borderColor: flag.severity === "critical" ? "#E74C3C" : "#FEA002",
                backgroundColor: flag.severity === "critical" ? "rgba(231, 76, 60, 0.05)" : "rgba(254, 160, 2, 0.05)"
              }} data-testid={`flag-${i}`}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: flag.severity === "critical" ? "#E74C3C" : "#FEA002" }} />
                <div>
                  <span className="text-sm font-medium">{flag.label}</span>
                  <p className="text-xs text-muted-foreground">{flag.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Patient Demographics */}
      {member && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" style={{ color: "#2E456B" }} />
              <h3 className="text-sm font-semibold">Patient Information</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-lg font-bold" data-testid="text-patient-name">{member.firstName} {member.lastName}</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>DOB: {member.dob} | Gender: {member.gender || "N/A"}</p>
                  <p>Member ID: {member.memberId}</p>
                  {member.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {member.phone}</p>}
                  {member.address && <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {member.address}, {member.city}, {member.state} {member.zip}</p>}
                </div>
              </div>
              <div className="space-y-3">
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
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Visit Vitals */}
      {vitals && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4" style={{ color: "#E74C3C" }} />
              <h3 className="text-sm font-semibold">Current Visit Vitals</h3>
              {vitalsFlags.length > 0 && <Badge variant="destructive" className="text-xs">{vitalsFlags.length} abnormal</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Blood Pressure", value: `${(vitals as any).systolic || "--"}/${(vitals as any).diastolic || "--"}`, unit: "mmHg", fields: ["systolic", "diastolic"] },
                { label: "Heart Rate", value: (vitals as any).heartRate || "--", unit: "bpm", fields: ["heartRate"] },
                { label: "SpO2", value: (vitals as any).oxygenSaturation || "--", unit: "%", fields: ["oxygenSaturation"] },
                { label: "Temperature", value: (vitals as any).temperature || "--", unit: "F", fields: ["temperature"] },
                { label: "Respiratory Rate", value: (vitals as any).respiratoryRate || "--", unit: "/min", fields: ["respiratoryRate"] },
                { label: "Weight", value: (vitals as any).weight || "--", unit: "lbs", fields: ["weight"] },
                { label: "BMI", value: (vitals as any).bmi || "--", unit: "", fields: ["bmi"] },
                { label: "Pain", value: (vitals as any).painLevel ?? "--", unit: "/10", fields: ["painLevel"] },
              ].map((v) => {
                const flagged = vitalsFlags.some((f: any) => v.fields.includes(f.field));
                return (
                  <div key={v.label} className={`p-3 rounded-md border ${flagged ? "border-destructive" : ""}`} style={flagged ? { backgroundColor: "rgba(231, 76, 60, 0.05)" } : {}} data-testid={`vital-card-${v.fields[0]}`}>
                    <span className="text-xs text-muted-foreground block">{v.label}</span>
                    <span className={`text-lg font-bold ${flagged ? "text-destructive" : ""}`}>{v.value}</span>
                    <span className="text-xs text-muted-foreground ml-1">{v.unit}</span>
                    {flagged && <AlertTriangle className="w-3 h-3 inline-block ml-1" style={{ color: "#E74C3C" }} />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment Results */}
      {assessmentResponses.filter((ar: any) => ar.status === "complete").length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" style={{ color: "#277493" }} />
              <h3 className="text-sm font-semibold">Assessment Results</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {assessmentResponses.filter((ar: any) => ar.status === "complete").map((ar: any) => {
              const flagged = assessmentFlags.some((f: any) => f.instrumentId === ar.instrumentId);
              return (
                <div key={ar.id} className={`flex items-center justify-between gap-3 p-3 rounded-md border ${flagged ? "border-amber-400 dark:border-amber-700" : ""}`} style={flagged ? { backgroundColor: "rgba(254, 160, 2, 0.05)" } : {}} data-testid={`assessment-result-${ar.instrumentId}`}>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{ar.instrumentId}</span>
                    <p className="text-xs text-muted-foreground">{ar.interpretation || "Completed"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-lg font-bold" style={flagged ? { color: "#FEA002" } : { color: "#277493" }}>{ar.computedScore ?? "--"}</span>
                    {flagged && <AlertTriangle className="w-4 h-4" style={{ color: "#FEA002" }} />}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Medication Reconciliation Detail */}
      {medRecon.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4" style={{ color: "#277493" }} />
                <h3 className="text-sm font-semibold">Medication Reconciliation</h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span>{medRecon.length} total</span>
                <span>{medRecon.filter((m: any) => m.status === "verified").length} verified</span>
                <span>{medRecon.filter((m: any) => m.status === "new").length} new</span>
                <span>{medRecon.filter((m: any) => m.status === "discontinued").length} discontinued</span>
                {medRecon.filter((m: any) => m.isBeersRisk || (m.interactionFlags && m.interactionFlags.length > 0)).length > 0 && (
                  <Badge variant="destructive" className="text-xs">{medRecon.filter((m: any) => m.isBeersRisk || (m.interactionFlags && m.interactionFlags.length > 0)).length} warnings</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {medRecon.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between gap-2 text-sm p-2.5 rounded-md border" data-testid={`med-context-${m.id}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{m.medicationName}</span>
                  {m.dosage && <span className="text-xs text-muted-foreground flex-shrink-0">{m.dosage}</span>}
                  {m.frequency && <span className="text-xs text-muted-foreground flex-shrink-0">{m.frequency}</span>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Badge variant="secondary" className="text-xs capitalize">{m.status}</Badge>
                  {(m.isBeersRisk || (m.interactionFlags && m.interactionFlags.length > 0)) && <AlertTriangle className="w-3 h-3" style={{ color: "#FEA002" }} />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Chart Medications */}
      {member?.medications?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4" style={{ color: "#2E456B" }} />
              <h3 className="text-sm font-semibold">Chart Medications (Pre-Visit)</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {member.medications.map((m: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">{m}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation to Clinical Timeline */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link href={`/visits/${visitId}/intake/timeline`}>
          <Button variant="outline" size="sm" data-testid="button-context-timeline">
            <TrendingUp className="w-4 h-4 mr-1" /> View Full Clinical Timeline
          </Button>
        </Link>
        <Link href={`/visits/${visitId}/intake`}>
          <Button variant="outline" size="sm" data-testid="button-back-intake-bottom">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Intake
          </Button>
        </Link>
      </div>
    </div>
  );
}
