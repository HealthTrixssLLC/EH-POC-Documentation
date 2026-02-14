import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import {
  ClipboardList,
  Target,
  Package,
  Bot,
  Check,
  AlertTriangle,
  Key,
  Globe,
  Cpu,
  Save,
  Plus,
  XCircle,
  Zap,
  Shield,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  Settings2,
  Loader2,
  Activity,
  CheckCircle2,
  Users,
  Trash2,
} from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  critical: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  emergency: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function AdminConsole() {
  const { data: planPacks, isLoading: loadingPacks } = useQuery<any[]>({ queryKey: ["/api/admin/plan-packs"] });
  const { data: assessments, isLoading: loadingAssessments } = useQuery<any[]>({ queryKey: ["/api/admin/assessment-definitions"] });
  const { data: measures, isLoading: loadingMeasures } = useQuery<any[]>({ queryKey: ["/api/admin/measure-definitions"] });
  const { data: clinicalRules, isLoading: loadingRules } = useQuery<any[]>({ queryKey: ["/api/clinical-rules"] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-admin-title">Admin Console</h1>
        <p className="text-sm text-muted-foreground mt-1">Configuration management for plan packs, clinical rules, assessments, measures, and AI providers</p>
      </div>

      <Tabs defaultValue="packs">
        <TabsList className="flex-wrap">
          <TabsTrigger value="packs" data-testid="tab-plan-packs"><Package className="w-3 h-3 mr-1" /> Plan Packs</TabsTrigger>
          <TabsTrigger value="rules" data-testid="tab-clinical-rules"><Zap className="w-3 h-3 mr-1" /> Clinical Rules</TabsTrigger>
          <TabsTrigger value="assessments" data-testid="tab-assessments"><ClipboardList className="w-3 h-3 mr-1" /> Assessments</TabsTrigger>
          <TabsTrigger value="measures" data-testid="tab-measures"><Target className="w-3 h-3 mr-1" /> Measures</TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai-providers"><Bot className="w-3 h-3 mr-1" /> AI Providers</TabsTrigger>
          <TabsTrigger value="members" data-testid="tab-members"><Users className="w-3 h-3 mr-1" /> Members</TabsTrigger>
          <TabsTrigger value="demo" data-testid="tab-demo-config"><Settings2 className="w-3 h-3 mr-1" /> Demo Mode</TabsTrigger>
          <TabsTrigger value="access-log" data-testid="tab-access-log"><Shield className="w-3 h-3 mr-1" /> Access Log</TabsTrigger>
        </TabsList>

        <TabsContent value="packs" className="mt-4 space-y-3">
          {loadingPacks ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : planPacks?.length ? (
            planPacks.map((pack: any) => (
              <PlanPackCard key={pack.id} pack={pack} />
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                <Package className="w-8 h-8 mb-2 opacity-40" />
                <span className="text-sm">No plan packs configured</span>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rules" className="mt-4 space-y-3">
          {loadingRules ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : clinicalRules?.length ? (
            clinicalRules.map((rule: any) => (
              <ClinicalRuleCard key={rule.id} rule={rule} />
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                <Zap className="w-8 h-8 mb-2 opacity-40" />
                <span className="text-sm">No clinical rules configured</span>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assessments" className="mt-4 space-y-3">
          {loadingAssessments ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : assessments?.length ? (
            assessments.map((a: any) => (
              <AssessmentCard key={a.id} assessment={a} />
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                <ClipboardList className="w-8 h-8 mb-2 opacity-40" />
                <span className="text-sm">No assessment definitions</span>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="measures" className="mt-4 space-y-3">
          {loadingMeasures ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : measures?.length ? (
            measures.map((m: any) => (
              <Card key={m.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-semibold">{m.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ID: {m.measureId} | Version: {m.version} | Category: {m.category}
                    </span>
                    {m.description && <span className="text-xs text-muted-foreground">{m.description}</span>}
                  </div>
                  <Badge variant={m.active ? "default" : "secondary"} className="text-xs">
                    {m.active ? "Active" : "Inactive"}
                  </Badge>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                <Target className="w-8 h-8 mb-2 opacity-40" />
                <span className="text-sm">No measure definitions</span>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <AiProviderConfig />
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <MemberPackageAssignment />
        </TabsContent>

        <TabsContent value="demo" className="mt-4">
          <DemoConfigPanel />
        </TabsContent>

        <TabsContent value="access-log" className="mt-4">
          <AccessLogPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlanPackCard({ pack }: { pack: any }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const modules = pack.moduleEnables || {};
  const flags = pack.featureFlags || {};

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest("PUT", `/api/plan-packs/${pack.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plan-packs"] });
      toast({ title: "Plan pack updated" });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card data-testid={`card-plan-pack-${pack.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-semibold" data-testid={`text-pack-name-${pack.id}`}>{pack.planName}</span>
            <span className="text-xs text-muted-foreground">Plan ID: {pack.planId} | Type: {pack.visitType?.replace(/_/g, " ")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs" data-testid={`badge-pack-version-${pack.id}`}>
              v{pack.version || "1.0"}
            </Badge>
            <Badge variant={pack.active ? "default" : "secondary"} className="text-xs">
              {pack.active ? "Active" : "Inactive"}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
              data-testid={`button-expand-pack-${pack.id}`}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {pack.description && (
          <p className="text-xs text-muted-foreground mt-1">{pack.description}</p>
        )}

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="text-xs font-medium text-muted-foreground">Required Assessments</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {pack.requiredAssessments?.map((a: string) => (
                <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground">Required Measures</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {pack.requiredMeasures?.map((m: string) => (
                <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
              ))}
            </div>
          </div>
        </div>

        {expanded && (
          <>
            <Separator className="my-3" />
            <div className="space-y-3">
              <div>
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Settings2 className="w-3 h-3" /> Module Configuration
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {Object.entries(modules).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        checked={val as boolean}
                        onCheckedChange={(checked) => {
                          updateMutation.mutate({
                            moduleEnables: { ...modules, [key]: checked },
                          });
                        }}
                        data-testid={`switch-module-${key}`}
                      />
                      <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <ToggleLeft className="w-3 h-3" /> Feature Flags
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {Object.entries(flags).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        checked={val as boolean}
                        onCheckedChange={(checked) => {
                          updateMutation.mutate({
                            featureFlags: { ...flags, [key]: checked },
                          });
                        }}
                        data-testid={`switch-flag-${key}`}
                      />
                      <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  NOPP: {pack.noppRequired ? "Required" : "Optional"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  ID Verification: {pack.identityVerificationRequired ? "Required" : "Optional"}
                </Badge>
              </div>

              <div className="mt-3 pt-3 border-t">
                <span className="text-xs font-medium text-muted-foreground">Version History</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs" data-testid={`text-pack-version-current-${pack.id}`}>Current: v{pack.version || "1.0"}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {pack.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ClinicalRuleCard({ rule }: { rule: any }) {
  const [editing, setEditing] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: rule.name,
    severity: rule.severity || "warning",
    documentationPrompt: rule.documentationPrompt || "",
    active: rule.active,
    priority: rule.priority,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest("PUT", `/api/clinical-rules/${rule.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical-rules"] });
      toast({ title: "Clinical rule updated" });
      setEditing(false);
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const severityClass = SEVERITY_COLORS[rule.severity || "warning"] || SEVERITY_COLORS.warning;
  const condition = rule.triggerCondition || {};

  return (
    <Card data-testid={`card-rule-${rule.id}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-4 h-4 shrink-0 text-muted-foreground" />
            <span className="text-sm font-semibold" data-testid={`text-rule-name-${rule.id}`}>{rule.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${severityClass}`} data-testid={`badge-severity-${rule.id}`}>
              {(rule.severity || "warning").toUpperCase()}
            </Badge>
            <Badge variant={rule.active ? "default" : "secondary"} className="text-xs">
              {rule.active ? "Active" : "Inactive"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(!editing)}
              data-testid={`button-edit-rule-${rule.id}`}
            >
              {editing ? "Cancel" : "Edit"}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{rule.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Trigger:</span>{" "}
            <span className="font-medium">{rule.triggerSource}</span>
            {condition.field && <span className="text-muted-foreground"> ({condition.field} {condition.operator} {condition.threshold})</span>}
            {condition.instrumentId && <span className="text-muted-foreground"> ({condition.instrumentId} score {condition.operator} {condition.scoreThreshold})</span>}
          </div>
          <div>
            <span className="text-muted-foreground">Priority:</span>{" "}
            <span className="font-medium capitalize">{rule.priority}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Category:</span>{" "}
            <span className="font-medium">{rule.category?.replace(/_/g, " ")}</span>
          </div>
        </div>

        {rule.recommendedAction && (
          <div className="text-xs">
            <span className="text-muted-foreground">Action:</span>{" "}
            <span>{rule.recommendedAction}</span>
          </div>
        )}

        {rule.documentationPrompt && !editing && (
          <div className="text-xs bg-muted p-2 rounded-md">
            <span className="text-muted-foreground">Documentation Prompt:</span>{" "}
            <span>{rule.documentationPrompt}</span>
          </div>
        )}

        {editing && (
          <div className="space-y-3 mt-2 p-3 bg-muted rounded-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Rule Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1"
                  data-testid="input-rule-name"
                />
              </div>
              <div>
                <Label className="text-xs">Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger className="mt-1" data-testid="select-rule-severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="mt-1" data-testid="select-rule-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 self-end">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                  data-testid="switch-rule-active"
                />
                <Label className="text-xs">Active</Label>
              </div>
            </div>
            <div>
              <Label className="text-xs">Documentation Prompt</Label>
              <Textarea
                value={form.documentationPrompt}
                onChange={(e) => setForm({ ...form, documentationPrompt: e.target.value })}
                placeholder="What the clinician should document when this rule fires..."
                className="mt-1 text-xs"
                rows={2}
                data-testid="input-rule-doc-prompt"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => updateMutation.mutate(form)}
                disabled={updateMutation.isPending}
                data-testid="button-save-rule"
              >
                <Save className="w-3 h-3 mr-1" /> Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AssessmentCard({ assessment }: { assessment: any }) {
  const [expanded, setExpanded] = useState(false);
  const branching = assessment.branchingRules;
  const hasBranching = branching && (branching.followUpAssessments?.length > 0 || branching.conditionalQuestions?.length > 0);

  return (
    <Card data-testid={`card-assessment-${assessment.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{assessment.name}</span>
              {hasBranching && (
                <Badge variant="outline" className="text-xs" style={{ borderColor: "#277493", color: "#277493" }}>
                  Branching
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              ID: {assessment.instrumentId} | Version: {assessment.version} | Category: {assessment.category}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={assessment.active ? "default" : "secondary"} className="text-xs">
              {assessment.active ? "Active" : "Inactive"}
            </Badge>
            {hasBranching && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExpanded(!expanded)}
                data-testid={`button-expand-assessment-${assessment.id}`}
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>

        {expanded && branching && (
          <>
            <Separator className="my-2" />
            <div className="space-y-2">
              {branching.followUpAssessments?.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Follow-Up Assessments</span>
                  {branching.followUpAssessments.map((f: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 mt-1 text-xs">
                      <Badge variant="outline" className="text-xs">{f.instrumentId}</Badge>
                      <span className="text-muted-foreground">when score {f.condition?.operator} {f.condition?.scoreThreshold}</span>
                      <span>{f.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {branching.conditionalQuestions?.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Conditional Prompts</span>
                  {branching.conditionalQuestions.map((c: any, i: number) => (
                    <div key={i} className="text-xs mt-1 p-2 bg-muted rounded-md">
                      <span className="font-medium">Q{c.questionId?.replace("q", "")}</span>
                      <span className="text-muted-foreground"> = "{c.condition?.answer}":</span>{" "}
                      <span>{c.prompt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AiProviderConfig() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);

  const { data: providers, isLoading } = useQuery<any[]>({ queryKey: ["/api/ai-providers"] });
  const { data: activeStatus } = useQuery<any>({ queryKey: ["/api/ai-providers/active"] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return apiRequest("PATCH", `/api/ai-providers/${id}`, { ...updates, userId: user?.id, userName: user?.fullName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers/active"] });
      toast({ title: "Provider updated" });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/ai-providers", { ...data, userId: user?.id, userName: user?.fullName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers/active"] });
      toast({ title: "Provider created" });
      setShowAdd(false);
    },
    onError: (err: any) => {
      toast({ title: "Creation failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/ai-providers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers/active"] });
      toast({ title: "Provider deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">AI Provider Status</span>
            </div>
            {activeStatus?.configured ? (
              <div className="flex items-center gap-2">
                {activeStatus.hasKey ? (
                  <Badge variant="default" className="text-xs" data-testid="badge-ai-status-active">
                    <Check className="w-3 h-3 mr-1" /> Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs" data-testid="badge-ai-status-nokey">
                    <AlertTriangle className="w-3 h-3 mr-1" /> API Key Missing
                  </Badge>
                )}
              </div>
            ) : (
              <Badge variant="secondary" className="text-xs" data-testid="badge-ai-status-none">
                <XCircle className="w-3 h-3 mr-1" /> Not Configured
              </Badge>
            )}
          </div>
          {activeStatus?.configured && !activeStatus.hasKey && (
            <div className="mt-3 p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">
                <Key className="w-3 h-3 inline mr-1" />
                Set the <code className="font-mono text-xs bg-background px-1 py-0.5 rounded">{activeStatus.provider?.apiKeySecretName}</code> environment
                secret to enable AI features (transcription, field extraction).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
      ) : (
        providers?.map((p: any) => (
          <ProviderCard
            key={p.id}
            provider={p}
            onUpdate={(updates) => updateMutation.mutate({ id: p.id, updates })}
            onDelete={() => deleteMutation.mutate(p.id)}
            isPending={updateMutation.isPending}
            isDeleting={deleteMutation.isPending}
          />
        ))
      )}

      {!showAdd && (
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-provider">
          <Plus className="w-3 h-3 mr-1" /> Add Provider
        </Button>
      )}

      {showAdd && (
        <AddProviderForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowAdd(false)}
          isPending={createMutation.isPending}
        />
      )}
    </div>
  );
}

function ProviderCard({ provider, onUpdate, onDelete, isPending, isDeleting }: { provider: any; onUpdate: (u: any) => void; onDelete: () => void; isPending: boolean; isDeleting: boolean }) {
  const [editing, setEditing] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({
    displayName: provider.displayName,
    providerType: provider.providerType,
    apiKeySecretName: provider.apiKeySecretName,
    baseUrl: provider.baseUrl || "",
    modelName: provider.modelName,
    extractionModel: provider.extractionModel,
    speechRegion: provider.speechRegion || "",
    speechEndpoint: provider.speechEndpoint || "",
    active: provider.active,
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ai-providers/${provider.id}/test`);
      return await res.json();
    },
    onSuccess: (data: any) => {
      setTestResult(data);
      if (data.success) {
        toast({ title: "Connection successful", description: `Model: ${data.model} | ${data.latencyMs}ms` });
      } else {
        toast({ title: "Connection failed", description: data.error, variant: "destructive" });
      }
    },
    onError: (err: any) => {
      setTestResult({ success: false, error: err.message });
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    },
  });

  const featureFlags = provider.featureFlags || {};

  return (
    <Card data-testid={`card-provider-${provider.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold" data-testid={`text-provider-name-${provider.id}`}>{provider.displayName}</span>
            <Badge variant="outline" className="text-xs">{provider.providerType}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={provider.active ? "default" : "secondary"} className="text-xs">
              {provider.active ? "Active" : "Inactive"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(!editing)}
              data-testid={`button-edit-provider-${provider.id}`}
            >
              {editing ? "Cancel" : "Edit"}
            </Button>
            {!confirmDelete ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirmDelete(true)}
                data-testid={`button-delete-provider-${provider.id}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { onDelete(); setConfirmDelete(false); }}
                  disabled={isDeleting}
                  data-testid={`button-confirm-delete-provider-${provider.id}`}
                >
                  {isDeleting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {!editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-1.5">
              <Key className="w-3 h-3 mt-0.5 text-muted-foreground" />
              <div>
                <span className="text-xs text-muted-foreground block">Secret Reference</span>
                <span className="text-xs font-mono">{provider.apiKeySecretName}</span>
              </div>
            </div>
            {provider.providerType === "azure_speech" ? (
              <>
                <div className="flex items-start gap-1.5">
                  <Globe className="w-3 h-3 mt-0.5 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Speech Region</span>
                    <span className="text-xs font-mono">{provider.speechRegion || "eastus"}</span>
                  </div>
                </div>
                {provider.speechEndpoint && (
                  <div className="flex items-start gap-1.5">
                    <Globe className="w-3 h-3 mt-0.5 text-muted-foreground" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Speech Endpoint</span>
                      <span className="text-xs font-mono">{provider.speechEndpoint}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-start gap-1.5">
                <Globe className="w-3 h-3 mt-0.5 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground block">Base URL</span>
                  <span className="text-xs font-mono">{provider.baseUrl || "Default"}</span>
                </div>
              </div>
            )}
            <div>
              <span className="text-xs text-muted-foreground block">Transcription Model</span>
              <span className="text-xs font-mono">{provider.modelName}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Extraction Model</span>
              <span className="text-xs font-mono">{provider.extractionModel}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-xs text-muted-foreground block mb-1">Feature Flags</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(featureFlags).map(([key, val]) => (
                  <Badge
                    key={key}
                    variant={val ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {key}: {val ? "on" : "off"}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setTestResult(null); testMutation.mutate(); }}
                  disabled={testMutation.isPending}
                  data-testid={`button-test-provider-${provider.id}`}
                >
                  {testMutation.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Activity className="w-3 h-3 mr-1" />
                  )}
                  {testMutation.isPending ? "Testing..." : "Test All Connections"}
                </Button>
                {testResult && (
                  <div className="flex items-center gap-1.5">
                    {testResult.success ? (
                      <Badge variant="default" className="text-xs" data-testid={`badge-test-success-${provider.id}`}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> All Passed ({testResult.latencyMs}ms)
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs" data-testid={`badge-test-fail-${provider.id}`}>
                        <XCircle className="w-3 h-3 mr-1" /> {testResult.reply || "Failed"}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              {testResult?.tests && (
                <div className="mt-2 space-y-1.5" data-testid={`div-test-results-${provider.id}`}>
                  {testResult.tests.map((t: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-0.5 rounded-md border p-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {t.success ? (
                            <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400 shrink-0" />
                          ) : (
                            <XCircle className="w-3 h-3 text-destructive shrink-0" />
                          )}
                          <span className="text-xs font-medium">{t.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{t.latencyMs}ms</span>
                      </div>
                      {t.model && (
                        <span className="text-xs text-muted-foreground ml-[18px]">Model: {t.model}</span>
                      )}
                      {t.success && t.reply && (
                        <span className="text-xs text-muted-foreground ml-[18px]">Response: "{t.reply}"</span>
                      )}
                      {!t.success && t.error && (
                        <p className="text-xs text-destructive ml-[18px] break-all">{t.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Display Name</Label>
                <Input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="mt-1"
                  data-testid="input-provider-name"
                />
              </div>
              <div>
                <Label className="text-xs">Provider Type</Label>
                <Select value={form.providerType} onValueChange={(v) => setForm({ ...form, providerType: v })}>
                  <SelectTrigger className="mt-1" data-testid="select-provider-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="azure_openai">Azure OpenAI</SelectItem>
                    <SelectItem value="azure_speech">Azure Speech</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{form.providerType === "azure_speech" ? "Speech Key Secret Name" : "API Key Secret Name"}</Label>
                <Input
                  value={form.apiKeySecretName}
                  onChange={(e) => setForm({ ...form, apiKeySecretName: e.target.value })}
                  placeholder={form.providerType === "azure_speech" ? "AZURE_SPEECH_KEY" : "OPENAI_API_KEY"}
                  className="mt-1 font-mono text-xs"
                  data-testid="input-secret-name"
                />
              </div>
              {form.providerType === "azure_speech" ? (
                <>
                  <div>
                    <Label className="text-xs">Speech Region</Label>
                    <Input
                      value={form.speechRegion}
                      onChange={(e) => setForm({ ...form, speechRegion: e.target.value })}
                      placeholder="eastus"
                      className="mt-1 font-mono text-xs"
                      data-testid="input-speech-region"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Speech Endpoint (optional)</Label>
                    <Input
                      value={form.speechEndpoint}
                      onChange={(e) => setForm({ ...form, speechEndpoint: e.target.value })}
                      placeholder="https://eastus.api.cognitive.microsoft.com"
                      className="mt-1 font-mono text-xs"
                      data-testid="input-speech-endpoint"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <Label className="text-xs">Base URL (optional)</Label>
                  <Input
                    value={form.baseUrl}
                    onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="mt-1 font-mono text-xs"
                    data-testid="input-base-url"
                  />
                </div>
              )}
              <div>
                <Label className="text-xs">Transcription Model</Label>
                <Input
                  value={form.modelName}
                  onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                  placeholder={form.providerType === "azure_speech" ? "azure-speech-to-text" : "whisper-1"}
                  className="mt-1 font-mono text-xs"
                  data-testid="input-model-name"
                />
              </div>
              <div>
                <Label className="text-xs">Extraction Model</Label>
                <Input
                  value={form.extractionModel}
                  onChange={(e) => setForm({ ...form, extractionModel: e.target.value })}
                  className="mt-1 font-mono text-xs"
                  data-testid="input-extraction-model"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
                data-testid="switch-provider-active"
              />
              <Label className="text-xs">Active</Label>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => { onUpdate(form); setEditing(false); }}
                disabled={isPending}
                data-testid="button-save-provider"
              >
                <Save className="w-3 h-3 mr-1" /> Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddProviderForm({ onSubmit, onCancel, isPending }: { onSubmit: (d: any) => void; onCancel: () => void; isPending: boolean }) {
  const [form, setForm] = useState({
    displayName: "",
    providerType: "openai",
    apiKeySecretName: "OPENAI_API_KEY",
    baseUrl: "",
    modelName: "gpt-4o-mini-transcribe",
    extractionModel: "gpt-4o-mini",
    speechRegion: "",
    speechEndpoint: "",
    active: false,
    featureFlags: { transcription: true, extraction: true, clinicalSuggestions: false },
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <span className="text-sm font-semibold">Add AI Provider</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Display Name</Label>
            <Input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="My AI Provider"
              className="mt-1"
              data-testid="input-new-provider-name"
            />
          </div>
          <div>
            <Label className="text-xs">Provider Type</Label>
            <Select value={form.providerType} onValueChange={(v) => setForm({ ...form, providerType: v })}>
              <SelectTrigger className="mt-1" data-testid="select-new-provider-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="azure_openai">Azure OpenAI</SelectItem>
                <SelectItem value="azure_speech">Azure Speech</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{form.providerType === "azure_speech" ? "Speech Key Secret Name" : "API Key Secret Name"}</Label>
            <Input
              value={form.apiKeySecretName}
              onChange={(e) => setForm({ ...form, apiKeySecretName: e.target.value })}
              placeholder={form.providerType === "azure_speech" ? "AZURE_SPEECH_KEY" : "OPENAI_API_KEY"}
              className="mt-1 font-mono text-xs"
              data-testid="input-new-secret-name"
            />
          </div>
          {form.providerType === "azure_speech" ? (
            <>
              <div>
                <Label className="text-xs">Speech Region</Label>
                <Input
                  value={form.speechRegion}
                  onChange={(e) => setForm({ ...form, speechRegion: e.target.value })}
                  placeholder="eastus"
                  className="mt-1 font-mono text-xs"
                  data-testid="input-new-speech-region"
                />
              </div>
              <div>
                <Label className="text-xs">Speech Endpoint (optional)</Label>
                <Input
                  value={form.speechEndpoint}
                  onChange={(e) => setForm({ ...form, speechEndpoint: e.target.value })}
                  placeholder="https://eastus.api.cognitive.microsoft.com"
                  className="mt-1 font-mono text-xs"
                  data-testid="input-new-speech-endpoint"
                />
              </div>
            </>
          ) : (
            <div>
              <Label className="text-xs">Base URL (optional)</Label>
              <Input
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="mt-1 font-mono text-xs"
                data-testid="input-new-base-url"
              />
            </div>
          )}
          <div>
            <Label className="text-xs">Transcription Model</Label>
            <Input
              value={form.modelName}
              onChange={(e) => setForm({ ...form, modelName: e.target.value })}
              placeholder={form.providerType === "azure_speech" ? "azure-speech-to-text" : "whisper-1"}
              className="mt-1 font-mono text-xs"
              data-testid="input-new-model"
            />
          </div>
          <div>
            <Label className="text-xs">Extraction Model</Label>
            <Input
              value={form.extractionModel}
              onChange={(e) => setForm({ ...form, extractionModel: e.target.value })}
              className="mt-1 font-mono text-xs"
              data-testid="input-new-extraction-model"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => onSubmit(form)}
            disabled={isPending || !form.displayName}
            data-testid="button-create-provider"
          >
            <Plus className="w-3 h-3 mr-1" /> Create
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DemoConfigPanel() {
  const { toast } = useToast();
  const { data: config, isLoading } = useQuery<any>({ queryKey: ["/api/demo-config"] });
  const [demoMode, setDemoMode] = useState(false);
  const [watermarkText, setWatermarkText] = useState("DEMO MODE");
  const [maxExports, setMaxExports] = useState(10);

  useEffect(() => {
    if (config) {
      setDemoMode(config.demoMode || false);
      setWatermarkText(config.watermarkText || "DEMO MODE");
      setMaxExports(config.maxExportsPerDay || 10);
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/demo-config", {
        demoMode,
        watermarkText,
        maxExportsPerDay: maxExports,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demo-config"] });
      toast({ title: "Demo configuration saved" });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-medium">Demo Mode</p>
              <p className="text-xs text-muted-foreground">When enabled, a watermark banner appears and access is logged</p>
            </div>
            <Switch
              checked={demoMode}
              onCheckedChange={setDemoMode}
              data-testid="switch-demo-mode"
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Watermark Text</Label>
              <Input
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="DEMO MODE"
                data-testid="input-watermark-text"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Exports Per Day</Label>
              <Input
                type="number"
                value={maxExports}
                onChange={(e) => setMaxExports(Number(e.target.value))}
                min={1}
                max={100}
                data-testid="input-max-exports"
              />
            </div>
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            data-testid="button-save-demo-config"
          >
            <Save className="w-4 h-4 mr-1" /> Save Configuration
          </Button>
        </CardContent>
      </Card>

      {demoMode && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">Demo Mode Active</span>
            </div>
            <p className="text-xs text-muted-foreground">
              A watermark banner reading "{watermarkText}" will appear at the top of the application. All access to sensitive operations will be logged to the audit trail.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MemberPackageAssignment() {
  const { toast } = useToast();
  const { data: members, isLoading: loadingMembers } = useQuery<any[]>({ queryKey: ["/api/admin/members"] });
  const { data: planPacks, isLoading: loadingPacks } = useQuery<any[]>({ queryKey: ["/api/admin/plan-packs"] });

  const assignMutation = useMutation({
    mutationFn: async ({ memberId, planPackId }: { memberId: string; planPackId: string }) => {
      const pack = planPacks?.find((p: any) => p.planId === planPackId);
      return apiRequest("PATCH", `/api/admin/members/${memberId}`, {
        planId: planPackId,
        planPackId: planPackId,
        planPackVersion: pack?.version || "1.0",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      toast({ title: "Member plan updated" });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  if (loadingMembers || loadingPacks) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold" data-testid="text-member-assignment-title">Member-to-Package Assignment</h3>
        <p className="text-xs text-muted-foreground mt-1">Assign members to plan packages and view their current version</p>
      </div>

      {members?.length ? (
        <div className="space-y-2">
          {members.map((member: any) => {
            const currentPack = planPacks?.find((p: any) => p.planId === member.planPackId || p.planId === member.planId);
            return (
              <Card key={member.id} data-testid={`card-member-${member.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium" data-testid={`text-member-name-${member.id}`}>
                        {member.firstName} {member.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ID: {member.memberId} | DOB: {member.dob}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {member.planPackVersion && (
                        <Badge variant="outline" className="text-xs" data-testid={`badge-member-version-${member.id}`}>
                          v{member.planPackVersion}
                        </Badge>
                      )}
                      <Select
                        value={member.planPackId || member.planId || ""}
                        onValueChange={(val) => assignMutation.mutate({ memberId: member.id, planPackId: val })}
                      >
                        <SelectTrigger className="w-48" data-testid={`select-member-plan-${member.id}`}>
                          <SelectValue placeholder="Select plan pack" />
                        </SelectTrigger>
                        <SelectContent>
                          {planPacks?.map((pack: any) => (
                            <SelectItem key={pack.planId} value={pack.planId} data-testid={`option-plan-${pack.planId}`}>
                              {pack.planName} (v{pack.version || "1.0"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {currentPack && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Current package:</span>
                      <Badge variant="secondary" className="text-xs">{currentPack.planName}</Badge>
                      <Badge variant="outline" className="text-xs">v{currentPack.version || "1.0"}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
            <Users className="w-8 h-8 mb-2 opacity-40" />
            <span className="text-sm">No members found</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AccessLogPanel() {
  const { data: events, isLoading } = useQuery<any[]>({ queryKey: ["/api/access-log"] });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const eventTypeLabels: Record<string, string> = {
    login: "Login",
    access_denied: "Access Denied",
    demo_config_updated: "Demo Config Updated",
    export: "Data Export",
    fhir_export: "FHIR Export",
    review_decision: "Review Decision",
    audit_assignment: "Audit Assignment",
    audit_outcome: "Audit Outcome",
    audit_sampling: "Audit Sampling",
  };

  const eventTypeColors: Record<string, string> = {
    login: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    access_denied: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    demo_config_updated: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    export: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    fhir_export: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    review_decision: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    audit_assignment: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    audit_outcome: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    audit_sampling: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{events?.length || 0} access events (most recent first)</p>
      {events?.length ? (
        events.map((e: any) => (
          <Card key={e.id} data-testid={`card-access-event-${e.id}`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <Badge className={`text-xs ${eventTypeColors[e.eventType] || ""}`}>
                    {eventTypeLabels[e.eventType] || e.eventType}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate">{e.userName || "System"}</span>
                  {e.userRole && <Badge variant="outline" className="text-xs">{e.userRole}</Badge>}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {e.timestamp ? new Date(e.timestamp).toLocaleString() : ""}
                </span>
              </div>
              {e.details && (
                <p className="text-xs text-muted-foreground mt-1 truncate">{e.details}</p>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No access events recorded yet
          </CardContent>
        </Card>
      )}
    </div>
  );
}
