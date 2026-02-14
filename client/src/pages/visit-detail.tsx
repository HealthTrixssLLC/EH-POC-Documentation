import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  User,
  FileText,
  ClipboardCheck,
  Target,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const statusTimeline = ["scheduled", "in_progress", "ready_for_review", "finalized", "synced", "emr_submitted", "export_generated"];

export default function VisitDetail() {
  const [, params] = useRoute("/visits/:id/detail");
  const visitId = params?.id;
  const { toast } = useToast();

  const { data: bundle, isLoading } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "bundle"],
    enabled: !!visitId,
  });

  const { data: note } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "note"],
    enabled: !!visitId,
  });

  const { data: tasks } = useQuery<any[]>({
    queryKey: ["/api/visits", visitId, "tasks"],
    enabled: !!visitId,
  });

  const handleExport = async () => {
    try {
      const res = await apiRequest("POST", `/api/visits/${visitId}/export`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.fhirBundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `visit-${visitId}-fhir-bundle.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export downloaded" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const visit = bundle?.visit;
  const member = bundle?.member;
  const checklist = bundle?.checklist || [];
  const vitals = bundle?.vitals;

  const currentStatusIdx = statusTimeline.indexOf(visit?.status || "scheduled");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/visits">
            <Button variant="ghost" size="sm" data-testid="button-back-visits">
              <ChevronLeft className="w-4 h-4 mr-1" /> Visits
            </Button>
          </Link>
          <h1 className="text-xl font-bold" data-testid="text-visit-detail-title">Visit Detail</h1>
        </div>
        <Button variant="outline" onClick={handleExport} data-testid="button-export">
          <Download className="w-4 h-4 mr-2" /> Export FHIR Bundle
        </Button>
      </div>

      {member && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center justify-center w-10 h-10 rounded-md" style={{ backgroundColor: "#2E456B15" }}>
              <User className="w-5 h-5" style={{ color: "#2E456B" }} />
            </div>
            <div>
              <h2 className="text-base font-bold">{member.firstName} {member.lastName}</h2>
              <span className="text-xs text-muted-foreground">DOB: {member.dob} | ID: {member.memberId}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="secondary">{visit?.visitType?.replace(/_/g, " ")}</Badge>
              <Badge variant={visit?.status === "finalized" || visit?.status === "ready_for_review" ? "default" : "secondary"}>
                {visit?.status?.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {statusTimeline.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-shrink-0">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
              i <= currentStatusIdx ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {i <= currentStatusIdx ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {s.replace(/_/g, " ")}
            </div>
            {i < statusTimeline.length - 1 && <div className="w-4 h-px bg-border" />}
          </div>
        ))}
      </div>

      <Tabs defaultValue="note">
        <TabsList>
          <TabsTrigger value="note" data-testid="tab-note"><FileText className="w-3 h-3 mr-1" /> Clinical Note</TabsTrigger>
          <TabsTrigger value="checklist" data-testid="tab-checklist"><ClipboardCheck className="w-3 h-3 mr-1" /> Checklist</TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks"><Target className="w-3 h-3 mr-1" /> Care Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="note" className="mt-4">
          <Card>
            <CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert">
              {note ? (
                <div className="space-y-4">
                  {note.chiefComplaint && <div><h4>Chief Complaint</h4><p>{note.chiefComplaint}</p></div>}
                  {note.hpiNotes && <div><h4>History of Present Illness</h4><p>{note.hpiNotes}</p></div>}
                  {vitals && (
                    <div>
                      <h4>Vitals</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                        {vitals.systolic && <span>BP: {vitals.systolic}/{vitals.diastolic} mmHg</span>}
                        {vitals.heartRate && <span>HR: {vitals.heartRate} bpm</span>}
                        {vitals.temperature && <span>Temp: {vitals.temperature}F</span>}
                        {vitals.oxygenSaturation && <span>O2: {vitals.oxygenSaturation}%</span>}
                        {vitals.weight && <span>Weight: {vitals.weight} kg</span>}
                        {vitals.bmi && <span>BMI: {vitals.bmi}</span>}
                      </div>
                    </div>
                  )}
                  {note.rosNotes && <div><h4>Review of Systems</h4><p>{note.rosNotes}</p></div>}
                  {note.examNotes && <div><h4>Physical Exam</h4><p>{note.examNotes}</p></div>}
                  {note.assessmentNotes && <div><h4>Assessment</h4><p>{note.assessmentNotes}</p></div>}
                  {note.planNotes && <div><h4>Plan</h4><p>{note.planNotes}</p></div>}
                  {note.assessmentMeasuresSummary && <div><h4>Assessments & Measures</h4><p>{note.assessmentMeasuresSummary}</p></div>}
                  {visit?.signedBy && (
                    <div className="pt-4 border-t">
                      <p className="text-sm">
                        <strong>Signed by:</strong> {visit.signedBy}<br />
                        <strong>Date:</strong> {visit.signedAt}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mb-2 opacity-40" />
                  <span className="text-sm">Clinical note not yet generated</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="mt-4 space-y-2">
          {checklist.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.status === "complete" ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#277493" }} />
                    ) : item.status === "unable_to_assess" ? (
                      <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#E74C3C" }} />
                    ) : (
                      <Clock className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    )}
                    <span className="text-sm truncate">{item.itemName}</span>
                  </div>
                  <Badge
                    variant={item.status === "unable_to_assess" ? "destructive" : "secondary"}
                    className="text-xs capitalize"
                  >
                    {item.status === "unable_to_assess" ? "Declined" : item.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {item.status === "unable_to_assess" && (item.unableToAssessReason || item.unableToAssessNote) && (
                  <div className="ml-6 space-y-0.5" data-testid={`decline-detail-${item.id}`}>
                    {item.unableToAssessReason && (
                      <p className="text-xs text-muted-foreground">
                        Reason: {item.unableToAssessReason}
                      </p>
                    )}
                    {item.unableToAssessNote && (
                      <p className="text-xs text-muted-foreground">
                        Note: {item.unableToAssessNote}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="tasks" className="mt-4 space-y-2">
          {tasks?.length ? (
            tasks.map((t: any) => (
              <Card key={t.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium">{t.title}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">{t.taskType.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{t.status}</Badge>
                    </div>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-8 text-muted-foreground">
                <Target className="w-8 h-8 mb-2 opacity-40" />
                <span className="text-sm">No care plan tasks</span>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
