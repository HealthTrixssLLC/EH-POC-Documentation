import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ShieldCheck,
  HeartPulse,
  ClipboardList,
  Target,
  FileText,
  CheckCircle2,
  Circle,
  ArrowRight,
  AlertCircle,
  Activity,
} from "lucide-react";

const stepIcons: Record<string, any> = {
  identity: ShieldCheck,
  vitals: HeartPulse,
  assessments: ClipboardList,
  measures: Target,
  careplan: FileText,
  timeline: Activity,
};

export default function IntakeDashboard() {
  const [, params] = useRoute("/visits/:id/intake");
  const visitId = params?.id;

  const { data: bundle, isLoading } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "bundle"],
    enabled: !!visitId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const visit = bundle?.visit;
  const member = bundle?.member;
  const checklist = bundle?.checklist || [];
  const vitals = bundle?.vitals;

  const assessmentItems = checklist.filter((c: any) => c.itemType === "assessment");
  const measureItems = checklist.filter((c: any) => c.itemType === "measure");
  const completedItems = checklist.filter((c: any) => c.status === "complete" || c.status === "unable_to_assess").length;
  const totalItems = checklist.length;
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const steps = [
    {
      id: "identity",
      label: "Identity Verification",
      href: `/visits/${visitId}/intake/identity`,
      done: visit?.identityVerified,
      required: true,
    },
    {
      id: "vitals",
      label: "Vitals & Exam",
      href: `/visits/${visitId}/intake/vitals`,
      done: !!vitals,
      required: true,
    },
    ...assessmentItems.map((a: any) => ({
      id: `assessment-${a.itemId}`,
      label: a.itemName,
      href: `/visits/${visitId}/intake/assessment/${a.itemId}`,
      done: a.status === "complete" || a.status === "unable_to_assess",
      status: a.status,
      required: true,
    })),
    ...measureItems.map((m: any) => ({
      id: `measure-${m.itemId}`,
      label: m.itemName,
      href: `/visits/${visitId}/intake/measure/${m.itemId}`,
      done: m.status === "complete" || m.status === "unable_to_assess",
      status: m.status,
      required: true,
    })),
    {
      id: "timeline",
      label: "Patient Clinical Timeline",
      href: `/visits/${visitId}/intake/timeline`,
      done: false,
      required: false,
    },
    {
      id: "careplan",
      label: "Care Plan & Tasks",
      href: `/visits/${visitId}/intake/careplan`,
      done: false,
      required: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={`/visits/${visitId}/summary`}>
          <Button variant="ghost" size="sm" data-testid="button-back-summary">
            <ChevronLeft className="w-4 h-4 mr-1" /> Summary
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-intake-title">
            Visit Intake {member ? `- ${member.firstName} ${member.lastName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Complete all required items before finalizing
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <span className="text-sm font-medium">Visit Progress</span>
            <span className="text-sm text-muted-foreground" data-testid="text-progress">
              {completedItems} of {totalItems} items complete ({progressPct}%)
            </span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step) => {
          const Icon = stepIcons[step.id.split("-")[0]] || ClipboardList;
          return (
            <Link key={step.id} href={step.href}>
              <Card className="hover-elevate cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md flex-shrink-0" style={{
                      backgroundColor: step.done ? "#27749315" : "#2E456B15"
                    }}>
                      <Icon className="w-5 h-5" style={{ color: step.done ? "#277493" : "#2E456B" }} />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">{step.label}</span>
                        {step.done ? (
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#277493" }} />
                        ) : step.required ? (
                          <Circle className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {step.required && <span className="text-xs text-muted-foreground">Required</span>}
                        {(step as any).status && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {(step as any).status.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        {completedItems < totalItems && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>{totalItems - completedItems} item{totalItems - completedItems !== 1 ? "s" : ""} remaining before finalization</span>
          </div>
        )}
        <Link href={`/visits/${visitId}/finalize`}>
          <Button data-testid="button-review-finalize">
            Review & Finalize <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
