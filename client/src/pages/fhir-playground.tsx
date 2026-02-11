import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, resolveUrl } from "@/lib/queryClient";
import {
  Download,
  Upload,
  FileJson,
  Copy,
  Check,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Eye,
  RefreshCw,
} from "lucide-react";

const SAMPLE_PATIENT = {
  resourceType: "Patient",
  identifier: [{ system: "urn:easy-health:member-id", value: "FHIR-DEMO-001" }],
  name: [{ family: "Rodriguez", given: ["Elena"], use: "official" }],
  birthDate: "1952-08-14",
  gender: "female",
  telecom: [
    { system: "phone", value: "555-0199", use: "home" },
    { system: "email", value: "elena.rodriguez@example.com" },
  ],
  address: [{ use: "home", line: ["456 Oak Drive"], city: "Austin", state: "TX", postalCode: "78701" }],
  generalPractitioner: [{ display: "Dr. Sarah Chen" }],
};

const SAMPLE_BUNDLE = {
  resourceType: "Bundle",
  type: "transaction",
  entry: [
    {
      resource: {
        resourceType: "Patient",
        identifier: [{ system: "urn:easy-health:member-id", value: "FHIR-BUNDLE-001" }],
        name: [{ family: "Kim", given: ["David"], use: "official" }],
        birthDate: "1958-03-22",
        gender: "male",
        telecom: [{ system: "phone", value: "555-0234" }],
        address: [{ use: "home", line: ["789 Pine St"], city: "Denver", state: "CO", postalCode: "80202" }],
      },
    },
    {
      resource: {
        resourceType: "Encounter",
        status: "planned",
        class: { code: "HH", display: "home health" },
        type: [{ coding: [{ code: "annual_wellness", display: "annual wellness" }] }],
        period: { start: new Date().toISOString().split("T")[0] },
      },
    },
  ],
};

type EndpointType = "patient" | "encounter" | "observation" | "condition" | "bundle";

const ENDPOINT_OPTIONS: { value: EndpointType; label: string; description: string }[] = [
  { value: "patient", label: "Patient", description: "GET /api/fhir/Patient/:id" },
  { value: "encounter", label: "Encounter", description: "GET /api/fhir/Encounter/:id" },
  { value: "observation", label: "Observation", description: "GET /api/fhir/Observation?encounter=:id" },
  { value: "condition", label: "Condition", description: "GET /api/fhir/Condition?encounter=:id" },
  { value: "bundle", label: "Bundle (Full Visit)", description: "GET /api/fhir/Bundle?visit=:id" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="icon"
      variant="ghost"
      data-testid="button-copy-json"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
}

function JsonViewer({ data, label }: { data: any; label?: string }) {
  const text = JSON.stringify(data, null, 2);
  const resourceType = data?.resourceType;
  const entryCount = data?.entry?.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <FileJson className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label || resourceType || "JSON"}</span>
          {resourceType && <Badge variant="outline" className="text-xs">{resourceType}</Badge>}
          {entryCount !== undefined && <Badge variant="secondary" className="text-xs">{entryCount} entries</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <CopyButton text={text} />
          <Button
            size="icon"
            variant="ghost"
            data-testid="button-download-json"
            onClick={() => {
              const blob = new Blob([text], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `fhir-${(resourceType || "data").toLowerCase()}-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <pre className="text-xs overflow-auto max-h-96 p-4 bg-muted/30 rounded-b-md font-mono leading-relaxed" data-testid="text-json-output">
          {text}
        </pre>
      </CardContent>
    </Card>
  );
}

function ExportTab() {
  const [selectedVisit, setSelectedVisit] = useState<string>("");
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointType>("bundle");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { data: visits = [], isLoading: visitsLoading } = useQuery<any[]>({ queryKey: ["/api/visits"] });
  const { data: memberMap } = useQuery<any>({ queryKey: ["/api/fhir/Patient"] });

  const memberLookup = useMemo(() => {
    const map: Record<string, string> = {};
    if (memberMap?.entry) {
      memberMap.entry.forEach((e: any) => {
        if (e.resource?.id) {
          const n = e.resource.name?.[0];
          map[e.resource.id] = n ? `${n.given?.[0] || ""} ${n.family || ""}`.trim() : e.resource.id;
        }
      });
    }
    return map;
  }, [memberMap]);

  const fetchResource = async () => {
    if (!selectedVisit && selectedEndpoint !== "patient") return;
    setLoading(true);
    try {
      let url = "";
      const visit = visits.find((v: any) => v.id === selectedVisit);
      switch (selectedEndpoint) {
        case "patient":
          url = visit ? `/api/fhir/Patient/${visit.memberId}` : "";
          break;
        case "encounter":
          url = `/api/fhir/Encounter/${selectedVisit}`;
          break;
        case "observation":
          url = `/api/fhir/Observation?encounter=${selectedVisit}`;
          break;
        case "condition":
          url = `/api/fhir/Condition?encounter=${selectedVisit}`;
          break;
        case "bundle":
          url = `/api/fhir/Bundle?visit=${selectedVisit}`;
          break;
      }
      if (!url) return;
      const response = await fetch(url);
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.message });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Visit</label>
              <Select value={selectedVisit} onValueChange={setSelectedVisit} data-testid="select-export-visit">
                <SelectTrigger data-testid="select-trigger-visit">
                  <SelectValue placeholder="Select a visit..." />
                </SelectTrigger>
                <SelectContent>
                  {visitsLoading ? (
                    <SelectItem value="_loading" disabled>Loading...</SelectItem>
                  ) : visits.map((v: any) => (
                    <SelectItem key={v.id} value={v.id} data-testid={`option-visit-${v.id}`}>
                      {memberLookup[v.memberId] || v.memberId} - {v.scheduledDate} ({v.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">FHIR Resource</label>
              <Select value={selectedEndpoint} onValueChange={(v) => setSelectedEndpoint(v as EndpointType)}>
                <SelectTrigger data-testid="select-trigger-endpoint">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENDPOINT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {ENDPOINT_OPTIONS.find(o => o.value === selectedEndpoint)?.description}
            </span>
            <Button
              onClick={fetchResource}
              disabled={!selectedVisit || loading}
              data-testid="button-fetch-export"
            >
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
              Fetch Resource
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && <JsonViewer data={result} label={`FHIR ${selectedEndpoint}`} />}
    </div>
  );
}

function ImportTab() {
  const [jsonInput, setJsonInput] = useState("");
  const [importType, setImportType] = useState<"patient" | "bundle">("bundle");
  const [result, setResult] = useState<any>(null);
  const [demoBundleLoading, setDemoBundleLoading] = useState(false);
  const [demoBundleLoaded, setDemoBundleLoaded] = useState(false);
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = importType === "patient" ? "/api/fhir/Patient" : "/api/fhir/Bundle";
      const res = await apiRequest("POST", url, payload);
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fhir/Patient"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Import successful", description: `FHIR ${importType === "patient" ? "Patient" : "Bundle"} processed` });
    },
    onError: (err: any) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      importMutation.mutate(parsed);
    } catch {
      toast({ title: "Invalid JSON", description: "Please enter valid JSON", variant: "destructive" });
    }
  };

  const loadSample = () => {
    if (importType === "patient") {
      setJsonInput(JSON.stringify(SAMPLE_PATIENT, null, 2));
    } else {
      setJsonInput(JSON.stringify(SAMPLE_BUNDLE, null, 2));
    }
  };

  const loadDemoBundle = async () => {
    setDemoBundleLoading(true);
    try {
      const response = await fetch(resolveUrl("/api/fhir/demo-bundle"));
      const data = await response.json();
      setJsonInput(JSON.stringify(data, null, 2));
      setImportType("bundle");
      setDemoBundleLoaded(true);
      toast({ title: "Demo bundle loaded", description: `${data.entry?.length || 0} FHIR resources ready to import (5 patients with clinical data)` });
    } catch (err: any) {
      toast({ title: "Failed to load demo bundle", description: err.message, variant: "destructive" });
    }
    setDemoBundleLoading(false);
  };

  const downloadDemoBundle = async () => {
    try {
      const response = await fetch(resolveUrl("/api/fhir/demo-bundle"));
      const data = await response.json();
      const text = JSON.stringify(data, null, 2);
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "easy-health-demo-fhir-bundle.json";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Bundle downloaded", description: "FHIR Bundle saved as easy-health-demo-fhir-bundle.json" });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-semibold" data-testid="text-demo-bundle-title">Demo FHIR Bundle</h3>
              <p className="text-xs text-muted-foreground">
                5 patients with conditions, medications, allergies, and scheduled encounters (65 resources)
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={loadDemoBundle}
              disabled={demoBundleLoading}
              data-testid="button-load-demo-bundle"
            >
              {demoBundleLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Load Demo Bundle
            </Button>
            <Button
              variant="outline"
              onClick={downloadDemoBundle}
              data-testid="button-download-demo-bundle"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Bundle
            </Button>
            {demoBundleLoaded && (
              <Badge variant="secondary" className="text-xs" data-testid="badge-demo-loaded">Ready to import</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Import Type</label>
              <Select value={importType} onValueChange={(v) => { setImportType(v as "patient" | "bundle"); setResult(null); }}>
                <SelectTrigger className="w-[200px]" data-testid="select-trigger-import-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">FHIR Patient</SelectItem>
                  <SelectItem value="bundle">FHIR Bundle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={loadSample} data-testid="button-load-sample">
              <FileJson className="w-4 h-4 mr-2" />
              Load Sample {importType === "patient" ? "Patient" : "Bundle"}
            </Button>
          </div>

          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={`Paste a FHIR R4 ${importType === "patient" ? "Patient" : "Bundle"} resource here as JSON...`}
            className="font-mono text-xs min-h-[250px]"
            data-testid="textarea-fhir-import"
          />

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">
              POST /api/fhir/{importType === "patient" ? "Patient" : "Bundle"}
            </span>
            <Button
              onClick={handleImport}
              disabled={!jsonInput.trim() || importMutation.isPending}
              data-testid="button-submit-import"
            >
              {importMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Import
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && <JsonViewer data={result} label="Import Result" />}
    </div>
  );
}

function EndpointsTab() {
  const endpoints = [
    { method: "GET", path: "/api/fhir/Patient", description: "List all members as FHIR Patient resources" },
    { method: "GET", path: "/api/fhir/Patient/:id", description: "Get a single member as FHIR Patient" },
    { method: "GET", path: "/api/fhir/Encounter/:id", description: "Get a visit as FHIR Encounter" },
    { method: "GET", path: "/api/fhir/Observation?encounter=:id", description: "Get vitals for a visit as FHIR Observations" },
    { method: "GET", path: "/api/fhir/Condition?encounter=:id", description: "Get diagnoses/ICD-10 codes as FHIR Conditions" },
    { method: "GET", path: "/api/fhir/Bundle?visit=:id", description: "Get full visit as FHIR Bundle (Patient, Encounter, Observations, Conditions, Assessments, Notes, Tasks)" },
    { method: "POST", path: "/api/fhir/Patient", description: "Create/update a member from a FHIR Patient resource" },
    { method: "POST", path: "/api/fhir/Bundle", description: "Import a FHIR Bundle (Patient + Encounter) to create members and visits" },
  ];

  return (
    <div className="space-y-3">
      {endpoints.map((ep, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-start gap-3 flex-wrap">
            <Badge variant={ep.method === "GET" ? "default" : "secondary"} className="text-xs font-mono mt-0.5">
              {ep.method}
            </Badge>
            <div className="flex flex-col gap-0.5 min-w-0">
              <code className="text-sm font-mono" data-testid={`text-endpoint-${i}`}>{ep.path}</code>
              <span className="text-xs text-muted-foreground">{ep.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function FhirPlayground() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-fhir-title">FHIR Interoperability</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import and export clinical data using FHIR R4 standard resources
        </p>
      </div>

      <Tabs defaultValue="export" data-testid="tabs-fhir">
        <TabsList>
          <TabsTrigger value="export" data-testid="tab-export">
            <ArrowUpFromLine className="w-3 h-3 mr-1" /> Export
          </TabsTrigger>
          <TabsTrigger value="import" data-testid="tab-import">
            <ArrowDownToLine className="w-3 h-3 mr-1" /> Import
          </TabsTrigger>
          <TabsTrigger value="endpoints" data-testid="tab-endpoints">
            <FileJson className="w-3 h-3 mr-1" /> API Reference
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="mt-4">
          <ExportTab />
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <ImportTab />
        </TabsContent>

        <TabsContent value="endpoints" className="mt-4">
          <EndpointsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
