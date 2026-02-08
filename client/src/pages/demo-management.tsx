import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  RotateCcw,
  Download,
  Upload,
  FileJson,
  Users,
  ClipboardList,
  Stethoscope,
  Play,
  Copy,
  Check,
  AlertTriangle,
  Database,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";

export default function DemoManagement() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("reset");

  const { data: bundles, isLoading: loadingBundles } = useQuery<any[]>({
    queryKey: ["/api/demo/fhir-bundles"],
  });

  const { data: sampleBundle, isLoading: loadingSample } = useQuery<any>({
    queryKey: ["/api/demo/sample-import-bundle"],
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/demo/reset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({ title: "Database reset complete", description: "All data has been restored to initial demo state. You will be logged out." });
      setTimeout(() => logout(), 1500);
    },
    onError: (err: any) => {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (bundleJson: any) => {
      const res = await apiRequest("POST", "/api/fhir/Bundle", bundleJson);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast({ title: "FHIR Bundle imported", description: `Successfully imported ${data?.entry?.length || 0} resources` });
    },
    onError: (err: any) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  function downloadJson(data: any, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyToClipboard(data: any, id: string) {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const demoScenarios = [
    {
      title: "Complete NP Visit Workflow",
      description: "Walk through a full visit: identity verification, vitals, assessments, HEDIS measures, care plan, and finalization.",
      role: "NP",
      credential: "sarah.np / password",
      steps: ["Log in as sarah.np", "Click an upcoming visit on Dashboard", "Click 'Start Visit'", "Complete Identity Verification", "Record Vitals & Exam", "Complete each Assessment", "Complete HEDIS Measures", "Add Care Plan Tasks", "Click 'Review & Finalize'", "Sign and submit"],
      entryUrl: "/visits",
    },
    {
      title: "Supervisor Review",
      description: "Review and approve or request corrections on a finalized visit.",
      role: "Supervisor",
      credential: "dr.williams / password",
      steps: ["Log in as dr.williams", "Go to Review Queue", "Click a pending visit", "Review documentation", "Approve or Request Correction"],
      entryUrl: "/reviews",
    },
    {
      title: "Care Coordination",
      description: "Manage follow-up tasks and referrals created during visits.",
      role: "Care Coordinator",
      credential: "emma.coord / password",
      steps: ["Log in as emma.coord", "Go to Care Tasks", "Find a pending task", "Update status and add outcome notes"],
      entryUrl: "/coordination",
    },
    {
      title: "FHIR Import/Export",
      description: "Export visit data as FHIR R4 bundles or import patient data from external systems.",
      role: "Admin",
      credential: "admin / password",
      steps: ["Log in as admin", "Go to FHIR Interop", "Select a visit and export", "Switch to Import tab", "Load sample data and import"],
      entryUrl: "/admin/fhir",
    },
    {
      title: "CDS & Auto-Coding",
      description: "Trigger clinical decision support alerts by entering abnormal vitals.",
      role: "NP",
      credential: "sarah.np / password",
      steps: ["Log in as sarah.np", "Start a visit", "Go to Vitals & Exam", "Enter elevated BP (160/100), HR (110)", "Save to see CDS recommendations", "Go to Review & Finalize to see auto-generated codes"],
      entryUrl: "/visits",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center justify-center w-10 h-10 rounded-md" style={{ backgroundColor: "#FEA00215" }}>
            <Database className="w-5 h-5" style={{ color: "#FEA002" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-demo-title">Demo Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Reset data, download FHIR bundles, and follow guided demo scenarios
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-demo">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="reset" data-testid="tab-reset">Reset & Seed</TabsTrigger>
          <TabsTrigger value="fhir" data-testid="tab-fhir-bundles">FHIR Bundles</TabsTrigger>
          <TabsTrigger value="scenarios" data-testid="tab-scenarios">Demo Scenarios</TabsTrigger>
        </TabsList>

        <TabsContent value="reset" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <RotateCcw className="w-5 h-5 text-muted-foreground" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">Database Reset & Re-Seed</h2>
                  <p className="text-xs text-muted-foreground">Wipe all data and restore to the initial demo state</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border p-4 space-y-3">
                <p className="text-sm">This will restore the database to its initial state with:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { icon: Users, label: "6 demo users (2 NPs, supervisor, coordinator, admin, compliance)" },
                    { icon: Users, label: "3 patients with full demographics and clinical history" },
                    { icon: ClipboardList, label: "3 scheduled visits with checklists" },
                    { icon: Stethoscope, label: "4 assessment + 5 measure definitions" },
                    { icon: FileJson, label: "8 clinical decision rules" },
                    { icon: Database, label: "Plan packs, targets, care plan tasks" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <item.icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">
                    This will delete all existing data including any visits, assessments, and clinical data you've created during testing. You will be logged out after reset.
                  </p>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={resetMutation.isPending} data-testid="button-reset-db">
                    {resetMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Resetting...</>
                    ) : (
                      <><RotateCcw className="w-4 h-4 mr-2" /> Reset Database</>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Database?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all data and restore the initial demo state. Any visits, assessments, or clinical data you've entered will be lost. You will need to log in again after the reset.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-reset">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => resetMutation.mutate()}
                      className="bg-destructive text-destructive-foreground"
                      data-testid="button-confirm-reset"
                    >
                      Yes, Reset Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">Demo Credentials</h2>
                  <p className="text-xs text-muted-foreground">All accounts use "password" as the password</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { username: "sarah.np", role: "Nurse Practitioner", name: "Sarah Johnson, NP" },
                  { username: "michael.np", role: "Nurse Practitioner", name: "Michael Chen, NP" },
                  { username: "dr.williams", role: "Supervisor", name: "Dr. Lisa Williams" },
                  { username: "emma.coord", role: "Care Coordinator", name: "Emma Davis" },
                  { username: "admin", role: "Administrator", name: "System Admin" },
                  { username: "compliance", role: "Compliance", name: "Robert Taylor" },
                ].map((cred) => (
                  <div key={cred.username} className="flex items-center gap-3 p-3 rounded-md border">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium truncate">{cred.name}</span>
                      <span className="text-xs text-muted-foreground">{cred.username} / password</span>
                    </div>
                    <Badge variant="secondary" className="text-xs ml-auto flex-shrink-0">{cred.role}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fhir" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Download className="w-5 h-5 text-muted-foreground" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">Export FHIR Bundles</h2>
                  <p className="text-xs text-muted-foreground">Download complete FHIR R4 bundles for each patient</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingBundles ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
              ) : bundles?.length ? (
                bundles.map((b: any) => (
                  <div key={b.memberId} className="flex items-center justify-between gap-3 p-4 rounded-md border flex-wrap" data-testid={`bundle-card-${b.memberId}`}>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-sm font-semibold">{b.memberName}</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{b.memberId}</Badge>
                        <span className="text-xs text-muted-foreground">{b.visitCount} visit{b.visitCount !== 1 ? "s" : ""}</span>
                        <span className="text-xs text-muted-foreground">{b.bundle.entry.length} FHIR resources</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(b.bundle, b.memberId)}
                        data-testid={`button-copy-bundle-${b.memberId}`}
                      >
                        {copied === b.memberId ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                        {copied === b.memberId ? "Copied" : "Copy"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadJson(b.bundle, `fhir-bundle-${b.memberId}.json`)}
                        data-testid={`button-download-bundle-${b.memberId}`}
                      >
                        <Download className="w-3 h-3 mr-1" /> Download
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <FileJson className="w-8 h-8 mb-2 opacity-30" />
                  <span className="text-sm">No patients found to export</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">Sample Import Bundle</h2>
                  <p className="text-xs text-muted-foreground">Ready-to-use FHIR bundle with 2 new patients and encounters for import testing</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingSample ? (
                <Skeleton className="h-20 w-full" />
              ) : sampleBundle ? (
                <div className="space-y-3">
                  <div className="rounded-md border p-4 space-y-2">
                    <p className="text-sm font-medium">Bundle Contents:</p>
                    <div className="space-y-1">
                      {sampleBundle.entry?.map((e: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge variant="secondary" className="text-xs">{e.resource.resourceType}</Badge>
                          <span className="text-muted-foreground">
                            {e.resource.resourceType === "Patient"
                              ? `${e.resource.name?.[0]?.given?.join(" ")} ${e.resource.name?.[0]?.family} (${e.resource.identifier?.[0]?.value})`
                              : `Home visit - ${e.resource.period?.start}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(sampleBundle, "sample")}
                      data-testid="button-copy-sample"
                    >
                      {copied === "sample" ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                      {copied === "sample" ? "Copied" : "Copy JSON"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadJson(sampleBundle, "sample-import-bundle.json")}
                      data-testid="button-download-sample"
                    >
                      <Download className="w-3 h-3 mr-1" /> Download
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => importMutation.mutate(sampleBundle)}
                      disabled={importMutation.isPending}
                      data-testid="button-import-sample"
                    >
                      {importMutation.isPending ? (
                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Importing...</>
                      ) : (
                        <><Upload className="w-3 h-3 mr-1" /> Import Directly</>
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="mt-4 space-y-4">
          {demoScenarios.map((scenario, idx) => (
            <Card key={idx} data-testid={`scenario-card-${idx}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{scenario.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{scenario.description}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">{scenario.role}</Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Login:</span>
                  <Badge variant="outline" className="text-xs font-mono">{scenario.credential}</Badge>
                </div>

                <div className="space-y-1.5">
                  {scenario.steps.map((step, si) => (
                    <div key={si} className="flex items-start gap-2 text-sm">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium bg-muted text-muted-foreground">
                        {si + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>

                <Link href={scenario.entryUrl}>
                  <Button variant="outline" size="sm" data-testid={`button-start-scenario-${idx}`}>
                    <Play className="w-3 h-3 mr-1" /> Go to {scenario.title.split(" ")[0]}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
