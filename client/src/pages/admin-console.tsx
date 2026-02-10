import { useState } from "react";
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
} from "lucide-react";

export default function AdminConsole() {
  const { data: planPacks, isLoading: loadingPacks } = useQuery<any[]>({ queryKey: ["/api/admin/plan-packs"] });
  const { data: assessments, isLoading: loadingAssessments } = useQuery<any[]>({ queryKey: ["/api/admin/assessment-definitions"] });
  const { data: measures, isLoading: loadingMeasures } = useQuery<any[]>({ queryKey: ["/api/admin/measure-definitions"] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-admin-title">Admin Console</h1>
        <p className="text-sm text-muted-foreground mt-1">Configuration management for plan packs, assessments, measures, and AI providers</p>
      </div>

      <Tabs defaultValue="packs">
        <TabsList className="flex-wrap">
          <TabsTrigger value="packs" data-testid="tab-plan-packs"><Package className="w-3 h-3 mr-1" /> Plan Packs</TabsTrigger>
          <TabsTrigger value="assessments" data-testid="tab-assessments"><ClipboardList className="w-3 h-3 mr-1" /> Assessments</TabsTrigger>
          <TabsTrigger value="measures" data-testid="tab-measures"><Target className="w-3 h-3 mr-1" /> Measures</TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai-providers"><Bot className="w-3 h-3 mr-1" /> AI Providers</TabsTrigger>
        </TabsList>

        <TabsContent value="packs" className="mt-4 space-y-3">
          {loadingPacks ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : planPacks?.length ? (
            planPacks.map((pack: any) => (
              <Card key={pack.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-semibold" data-testid={`text-pack-name-${pack.id}`}>{pack.planName}</span>
                      <span className="text-xs text-muted-foreground">Plan ID: {pack.planId} | Type: {pack.visitType?.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={pack.active ? "default" : "secondary"} className="text-xs">
                        {pack.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
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
                </CardContent>
              </Card>
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

        <TabsContent value="assessments" className="mt-4 space-y-3">
          {loadingAssessments ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : assessments?.length ? (
            assessments.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-semibold">{a.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ID: {a.instrumentId} | Version: {a.version} | Category: {a.category}
                    </span>
                  </div>
                  <Badge variant={a.active ? "default" : "secondary"} className="text-xs">
                    {a.active ? "Active" : "Inactive"}
                  </Badge>
                </CardContent>
              </Card>
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
      </Tabs>
    </div>
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
            isPending={updateMutation.isPending}
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

function ProviderCard({ provider, onUpdate, isPending }: { provider: any; onUpdate: (u: any) => void; isPending: boolean }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    displayName: provider.displayName,
    providerType: provider.providerType,
    apiKeySecretName: provider.apiKeySecretName,
    baseUrl: provider.baseUrl || "",
    modelName: provider.modelName,
    extractionModel: provider.extractionModel,
    active: provider.active,
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
            <div className="flex items-start gap-1.5">
              <Globe className="w-3 h-3 mt-0.5 text-muted-foreground" />
              <div>
                <span className="text-xs text-muted-foreground block">Base URL</span>
                <span className="text-xs font-mono">{provider.baseUrl || "Default"}</span>
              </div>
            </div>
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
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">API Key Secret Name</Label>
                <Input
                  value={form.apiKeySecretName}
                  onChange={(e) => setForm({ ...form, apiKeySecretName: e.target.value })}
                  className="mt-1 font-mono text-xs"
                  data-testid="input-secret-name"
                />
              </div>
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
              <div>
                <Label className="text-xs">Transcription Model</Label>
                <Input
                  value={form.modelName}
                  onChange={(e) => setForm({ ...form, modelName: e.target.value })}
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
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">API Key Secret Name</Label>
            <Input
              value={form.apiKeySecretName}
              onChange={(e) => setForm({ ...form, apiKeySecretName: e.target.value })}
              className="mt-1 font-mono text-xs"
              data-testid="input-new-secret-name"
            />
          </div>
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
          <div>
            <Label className="text-xs">Transcription Model</Label>
            <Input
              value={form.modelName}
              onChange={(e) => setForm({ ...form, modelName: e.target.value })}
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
