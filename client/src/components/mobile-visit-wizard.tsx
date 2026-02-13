import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ShieldCheck,
  HeartPulse,
  Pill,
  ClipboardList,
  Target,
  FileText,
  CheckCircle2,
  Circle,
  ArrowRight,
  ChevronRight,
  Mic,
  Ban,
  Activity,
  AlertTriangle,
  User,
} from "lucide-react";

const stepIcons: Record<string, any> = {
  identity: ShieldCheck,
  vitals: HeartPulse,
  medications: Pill,
  assessment: ClipboardList,
  measure: Target,
  careplan: FileText,
  timeline: Activity,
};

function getStepIcon(id: string) {
  if (id.startsWith("assessment-")) return ClipboardList;
  if (id.startsWith("measure-")) return Target;
  return stepIcons[id] || Circle;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function MobileVisitWizard({ visitId }: { visitId: string }) {
  const [, setLocation] = useLocation();

  const { data: overview, isLoading } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "overview"],
    enabled: !!visitId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4" data-testid="mobile-visit-wizard">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-3 w-full" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const visit = overview?.visit;
  const member = overview?.member;
  const checklist = overview?.checklist || [];
  const vitals = overview?.vitals;
  const medRecon = overview?.medRecon || [];
  const exclusions = overview?.exclusions || [];
  const extractedFields = overview?.extractedFields || [];

  const assessmentItems = checklist.filter((c: any) => c.itemType === "assessment");
  const measureItems = checklist.filter((c: any) => c.itemType === "measure");

  const objectiveSteps = [
    {
      id: "identity",
      label: "Identity Verification",
      href: `/visits/${visitId}/intake/identity`,
      done: visit?.identityVerified,
      category: "Setup",
    },
    {
      id: "vitals",
      label: "Vitals & Physical Exam",
      href: `/visits/${visitId}/intake/vitals`,
      done: !!vitals,
      category: "Clinical",
    },
    {
      id: "medications",
      label: "Medication Reconciliation",
      href: `/visits/${visitId}/intake/medications`,
      done: medRecon.length > 0,
      category: "Clinical",
    },
    ...assessmentItems.map((a: any) => ({
      id: `assessment-${a.itemId}`,
      label: a.itemName,
      href: `/visits/${visitId}/intake/assessment/${a.itemId}`,
      done: a.status === "complete" || a.status === "unable_to_assess",
      status: a.status,
      category: "Assessments",
    })),
    ...measureItems.map((m: any) => ({
      id: `measure-${m.itemId}`,
      label: m.itemName,
      href: `/visits/${visitId}/intake/measure/${m.itemId}`,
      done: m.status === "complete" || m.status === "unable_to_assess",
      status: m.status,
      category: "Measures",
    })),
  ];

  const getExclusionForObjective = (key: string) =>
    exclusions.find((e: any) => e.objectiveKey === key);

  const getStatus = (step: any): "completed" | "voice_captured" | "excluded" | "pending" | "in_progress" => {
    if (step.done) return "completed";
    if (getExclusionForObjective(step.id)) return "excluded";
    if (step.status === "in_progress") return "in_progress";
    return "pending";
  };

  const completedCount = objectiveSteps.filter((s) => getStatus(s) === "completed").length;
  const excludedCount = objectiveSteps.filter((s) => getStatus(s) === "excluded").length;
  const totalSteps = objectiveSteps.length;
  const resolvedCount = completedCount + excludedCount;
  const progressPct = totalSteps > 0 ? Math.round((resolvedCount / totalSteps) * 100) : 0;
  const allDone = resolvedCount === totalSteps && totalSteps > 0;

  const statusConfig: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
    completed: { color: "#277493", bgColor: "#27749315", icon: CheckCircle2, label: "Done" },
    voice_captured: { color: "#7c3aed", bgColor: "#7c3aed15", icon: Mic, label: "Voice" },
    excluded: { color: "#FEA002", bgColor: "#FEA00215", icon: Ban, label: "Excluded" },
    in_progress: { color: "#FEA002", bgColor: "#FEA00215", icon: Activity, label: "In Progress" },
    pending: { color: "#94a3b8", bgColor: "#94a3b810", icon: Circle, label: "Pending" },
  };

  const categories = ["Setup", "Clinical", "Assessments", "Measures"];
  const groupedSteps = categories
    .map((cat) => ({
      category: cat,
      steps: objectiveSteps.filter((s) => s.category === cat),
    }))
    .filter((g) => g.steps.length > 0);

  const memberName = member ? `${member.firstName} ${member.lastName}` : "";

  return (
    <div className="pb-20" data-testid="mobile-visit-wizard">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="text-white text-xs font-bold" style={{ backgroundColor: "#2E456B" }}>
              {memberName ? getInitials(memberName) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold truncate" data-testid="text-mobile-patient-name">
              {memberName}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {resolvedCount}/{totalSteps} completed
              </span>
              <span className="text-xs text-muted-foreground">
                {progressPct}%
              </span>
            </div>
          </div>
        </div>

        <Progress value={progressPct} className="h-2" data-testid="mobile-progress-bar" />

        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/visits/${visitId}/intake/voice-capture`}>
            <Button variant="outline" size="sm" data-testid="button-mobile-voice">
              <Mic className="w-4 h-4 mr-1" /> Voice Capture
            </Button>
          </Link>
          <Link href={`/visits/${visitId}/intake/timeline`}>
            <Button variant="outline" size="sm" data-testid="button-mobile-timeline">
              <Activity className="w-4 h-4 mr-1" /> Timeline
            </Button>
          </Link>
          <Link href={`/visits/${visitId}/intake/patient-context`}>
            <Button variant="outline" size="sm" data-testid="button-mobile-context">
              <User className="w-4 h-4 mr-1" /> Context
            </Button>
          </Link>
        </div>

        {groupedSteps.map((group) => (
          <div key={group.category} className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              {group.category}
            </h3>
            <div className="space-y-2">
              {group.steps.map((step) => {
                const status = getStatus(step);
                const cfg = statusConfig[status];
                const StepIcon = getStepIcon(step.id);
                const StatusIcon = cfg.icon;

                return (
                  <Link key={step.id} href={step.href}>
                    <Card className="hover-elevate cursor-pointer" data-testid={`mobile-step-${step.id}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex items-center justify-center w-10 h-10 rounded-md flex-shrink-0"
                            style={{ backgroundColor: cfg.bgColor }}
                          >
                            <StepIcon className="w-5 h-5" style={{ color: cfg.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium block truncate">{step.label}</span>
                            <span className="text-xs flex items-center gap-1" style={{ color: cfg.color }}>
                              <StatusIcon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-16 left-0 right-0 p-4 border-t bg-background" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
        <Link href={`/visits/${visitId}/finalize`}>
          <Button className="w-full" size="lg" disabled={!allDone} data-testid="button-mobile-finalize">
            {allDone ? "Review & Finalize" : `${totalSteps - resolvedCount} Steps Remaining`}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
