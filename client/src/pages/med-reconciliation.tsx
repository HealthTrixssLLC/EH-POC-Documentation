import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronLeft,
  Plus,
  Check,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Pill,
  CheckCircle2,
  ChevronDown,
  Pencil,
  X,
  ClipboardCheck,
  Activity,
  CalendarIcon,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import type { MedReconciliation, MedicationHistory, Member } from "@shared/schema";

const BEERS_CRITERIA = [
  {
    category: "Anticholinergics",
    medications: ["diphenhydramine", "chlorpheniramine", "hydroxyzine", "promethazine", "doxepin"],
    reason: "High anticholinergic burden; increased risk of confusion, dry mouth, constipation, urinary retention in elderly",
    severity: "high" as const,
  },
  {
    category: "Benzodiazepines",
    medications: ["diazepam", "lorazepam", "alprazolam", "clonazepam", "temazepam", "triazolam"],
    reason: "Increased risk of cognitive impairment, delirium, falls, fractures in older adults",
    severity: "high" as const,
  },
  {
    category: "NSAIDs (chronic use)",
    medications: ["ibuprofen", "naproxen", "indomethacin", "ketorolac", "meloxicam", "piroxicam"],
    reason: "Increased risk of GI bleeding, peptic ulcer disease, acute kidney injury, and fluid retention",
    severity: "high" as const,
  },
  {
    category: "Muscle Relaxants",
    medications: ["cyclobenzaprine", "methocarbamol", "carisoprodol", "metaxalone"],
    reason: "Poorly tolerated by older adults due to anticholinergic effects, sedation, and risk of fracture",
    severity: "moderate" as const,
  },
  {
    category: "Antipsychotics (1st gen)",
    medications: ["haloperidol", "chlorpromazine", "thioridazine"],
    reason: "Increased risk of stroke and mortality in persons with dementia; avoid unless for schizophrenia or bipolar",
    severity: "high" as const,
  },
  {
    category: "Hypoglycemics",
    medications: ["glyburide", "chlorpropamide"],
    reason: "Higher risk of severe prolonged hypoglycemia in older adults",
    severity: "high" as const,
  },
  {
    category: "GI Antispasmodics",
    medications: ["dicyclomine", "hyoscyamine"],
    reason: "Highly anticholinergic; uncertain effectiveness in older adults",
    severity: "moderate" as const,
  },
  {
    category: "Cardiovascular",
    medications: ["amiodarone", "nifedipine", "digoxin", "doxazosin"],
    reason: "Amiodarone: thyroid/pulmonary toxicity. Nifedipine IR: hypotension risk. Digoxin >0.125mg: toxicity. Doxazosin: orthostatic hypotension",
    severity: "high" as const,
  },
  {
    category: "CNS",
    medications: ["meperidine", "pentazocine", "barbiturates"],
    reason: "Meperidine: neurotoxic metabolite. Pentazocine: CNS effects. Barbiturates: high rate of physical dependence, tolerance",
    severity: "high" as const,
  },
  {
    category: "Proton Pump Inhibitors (>8 weeks)",
    medications: ["omeprazole", "pantoprazole", "lansoprazole", "esomeprazole"],
    reason: "Risk of C. difficile infection, bone loss, and fractures with prolonged use beyond 8 weeks",
    severity: "moderate" as const,
  },
];

const DRUG_INTERACTIONS = [
  {
    drugs: [["warfarin"], ["ibuprofen", "naproxen", "indomethacin", "ketorolac", "meloxicam", "piroxicam"]],
    risk: "Increased bleeding risk",
    severity: "high" as const,
  },
  {
    drugs: [["lisinopril", "enalapril", "ramipril"], ["potassium", "potassium chloride", "k-dur"]],
    risk: "Hyperkalemia",
    severity: "high" as const,
  },
  {
    drugs: [["sertraline", "fluoxetine", "citalopram", "escitalopram", "paroxetine"], ["phenelzine", "tranylcypromine", "isocarboxazid", "selegiline"]],
    risk: "Serotonin syndrome",
    severity: "high" as const,
  },
  {
    drugs: [["metformin"], ["contrast dye", "iodinated contrast"]],
    risk: "Lactic acidosis risk",
    severity: "high" as const,
  },
  {
    drugs: [["digoxin"], ["amiodarone"]],
    risk: "Digoxin toxicity",
    severity: "high" as const,
  },
  {
    drugs: [["lisinopril", "enalapril", "ramipril"], ["spironolactone", "eplerenone"]],
    risk: "Hyperkalemia",
    severity: "high" as const,
  },
  {
    drugs: [["metoprolol", "atenolol", "carvedilol", "propranolol"], ["verapamil", "diltiazem"]],
    risk: "Severe bradycardia",
    severity: "high" as const,
  },
  {
    drugs: [["theophylline"], ["ciprofloxacin", "levofloxacin"]],
    risk: "Theophylline toxicity",
    severity: "high" as const,
  },
  {
    drugs: [["warfarin"], ["metronidazole", "fluconazole", "trimethoprim"]],
    risk: "Increased INR / bleeding risk",
    severity: "high" as const,
  },
  {
    drugs: [["simvastatin", "atorvastatin", "lovastatin"], ["erythromycin", "clarithromycin"]],
    risk: "Rhabdomyolysis risk",
    severity: "high" as const,
  },
];

const COMMON_MEDS = [
  "Lisinopril", "Metformin", "Amlodipine", "Atorvastatin", "Omeprazole",
  "Metoprolol", "Losartan", "Levothyroxine", "Gabapentin", "Hydrochlorothiazide",
  "Sertraline", "Simvastatin", "Pantoprazole", "Furosemide", "Clopidogrel",
  "Warfarin", "Alprazolam", "Prednisone", "Tramadol", "Amoxicillin",
  "Carvedilol", "Digoxin", "Spironolactone", "Diltiazem", "Verapamil",
  "Ibuprofen", "Naproxen", "Diazepam", "Lorazepam", "Diphenhydramine",
  "Hydroxyzine", "Cyclobenzaprine", "Haloperidol", "Glyburide", "Lansoprazole",
  "Esomeprazole", "Fluoxetine", "Citalopram", "Escitalopram", "Paroxetine",
  "Propranolol", "Atenolol", "Enalapril", "Ramipril", "Nifedipine",
];

const ROUTES = ["oral", "sublingual", "topical", "inhalation", "injection", "rectal", "ophthalmic", "otic", "nasal", "transdermal"];
const FREQUENCIES = ["daily", "twice daily", "three times daily", "four times daily", "every 4 hours", "every 6 hours", "every 8 hours", "every 12 hours", "weekly", "biweekly", "monthly", "as needed"];
const CATEGORIES = ["cardiovascular", "endocrine", "respiratory", "neurological", "psychiatric", "gastrointestinal", "musculoskeletal", "pain", "antibiotic", "anticoagulant", "supplement", "other"];

const STATUS_COLORS: Record<string, string> = {
  verified: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  modified: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  discontinued: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  held: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

const SOURCE_COLORS: Record<string, string> = {
  history: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  home: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  chart: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  practice: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
};

function normalizeForMatch(name: string): string[] {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
}

function checkBeers(medName: string): { category: string; reason: string; severity: string } | null {
  const words = normalizeForMatch(medName);
  for (const entry of BEERS_CRITERIA) {
    for (const beersMed of entry.medications) {
      const beersWords = normalizeForMatch(beersMed);
      if (beersWords.some(bw => words.some(w => w.includes(bw) || bw.includes(w)))) {
        return { category: entry.category, reason: entry.reason, severity: entry.severity };
      }
    }
  }
  return null;
}

function checkInteractions(meds: MedReconciliation[]): Array<{ med1: string; med2: string; risk: string; severity: string }> {
  const results: Array<{ med1: string; med2: string; risk: string; severity: string }> = [];
  const seen = new Set<string>();

  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      const words1 = normalizeForMatch(meds[i].medicationName);
      const words2 = normalizeForMatch(meds[j].medicationName);

      for (const interaction of DRUG_INTERACTIONS) {
        const [group1, group2] = interaction.drugs;
        const match1in1 = group1.some(d => words1.some(w => w.includes(d) || d.includes(w)));
        const match2in2 = group2.some(d => words2.some(w => w.includes(d) || d.includes(w)));
        const match1in2 = group1.some(d => words2.some(w => w.includes(d) || d.includes(w)));
        const match2in1 = group2.some(d => words1.some(w => w.includes(d) || d.includes(w)));

        if ((match1in1 && match2in2) || (match1in2 && match2in1)) {
          const key = [meds[i].medicationName, meds[j].medicationName].sort().join("|");
          if (!seen.has(key + interaction.risk)) {
            seen.add(key + interaction.risk);
            results.push({
              med1: meds[i].medicationName,
              med2: meds[j].medicationName,
              risk: interaction.risk,
              severity: interaction.severity,
            });
          }
        }
      }
    }
  }
  return results;
}

export default function MedReconciliation() {
  const [, params] = useRoute("/visits/:id/intake/medications");
  const visitId = params?.id;
  const { toast } = useToast();
  const { user } = useAuth();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [medSearch, setMedSearch] = useState("");
  const [newMedForm, setNewMedForm] = useState({
    medicationName: "",
    genericName: "",
    dosage: "",
    frequency: "",
    route: "",
    category: "",
    notes: "",
  });

  const { data: bundle, isLoading: bundleLoading } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "bundle"],
    enabled: !!visitId,
  });

  const member: Member | undefined = bundle?.member;
  const memberId = member?.id;

  const { data: medHistory = [], isLoading: historyLoading } = useQuery<MedicationHistory[]>({
    queryKey: ["/api/members", memberId, "medications"],
    enabled: !!memberId,
  });

  const { data: reconciledMeds = [], isLoading: reconLoading } = useQuery<MedReconciliation[]>({
    queryKey: ["/api/visits", visitId, "med-reconciliation"],
    enabled: !!visitId,
  });

  const reconciledNames = useMemo(
    () => new Set(reconciledMeds.map(m => m.medicationName.toLowerCase())),
    [reconciledMeds]
  );

  const beersWarnings = useMemo(() => {
    const warnings: Array<{ medName: string; category: string; reason: string; severity: string }> = [];
    for (const med of reconciledMeds) {
      const beers = checkBeers(med.medicationName);
      if (beers) warnings.push({ medName: med.medicationName, ...beers });
    }
    return warnings;
  }, [reconciledMeds]);

  const interactions = useMemo(() => checkInteractions(reconciledMeds), [reconciledMeds]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { verified: 0, new: 0, modified: 0, discontinued: 0, held: 0 };
    for (const med of reconciledMeds) {
      if (counts[med.status] !== undefined) counts[med.status]++;
    }
    return counts;
  }, [reconciledMeds]);

  const chartMeds = useMemo(() => {
    return (member?.medications || []).map(name => ({
      medicationName: name,
      source: "chart" as const,
      status: "active" as const,
    }));
  }, [member?.medications]);

  const sortedHistory = useMemo(() => {
    const active = medHistory.filter(m => m.status === "active");
    const rest = medHistory.filter(m => m.status !== "active");
    return [...active, ...rest];
  }, [medHistory]);

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const resp = await apiRequest("POST", `/api/visits/${visitId}/med-reconciliation`, data);
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "med-reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      toast({ title: "Medication added to reconciliation" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add medication", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const resp = await apiRequest("PUT", `/api/visits/${visitId}/med-reconciliation/${id}`, data);
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "med-reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      setEditingId(null);
      toast({ title: "Medication updated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/visits/${visitId}/med-reconciliation/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "med-reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      toast({ title: "Medication removed" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to remove", description: err.message, variant: "destructive" });
    },
  });

  const handleQuickAdd = (medName: string, genericName?: string, dosage?: string, frequency?: string, route?: string, source = "history") => {
    if (reconciledNames.has(medName.toLowerCase())) return;
    const beers = checkBeers(medName);
    addMutation.mutate({
      memberId: memberId,
      medicationName: medName,
      genericName: genericName || "",
      dosage: dosage || "",
      frequency: frequency || "",
      route: route || "",
      status: "verified",
      source,
      isBeersRisk: !!beers,
      beersReason: beers?.reason || "",
      reconciledBy: user?.id || "",
    });
  };

  const handleAddNew = () => {
    if (!newMedForm.medicationName.trim()) return;
    const beers = checkBeers(newMedForm.medicationName);
    addMutation.mutate({
      memberId: memberId,
      medicationName: newMedForm.medicationName,
      genericName: newMedForm.genericName,
      dosage: newMedForm.dosage,
      frequency: newMedForm.frequency,
      route: newMedForm.route,
      category: newMedForm.category,
      notes: newMedForm.notes,
      status: "new",
      source: "home",
      isBeersRisk: !!beers,
      beersReason: beers?.reason || "",
      reconciledBy: user?.id || "",
    });
    setNewMedForm({ medicationName: "", genericName: "", dosage: "", frequency: "", route: "", category: "", notes: "" });
    setAddDialogOpen(false);
  };

  const startEdit = (med: MedReconciliation) => {
    setEditingId(med.id);
    setEditForm({
      status: med.status,
      dosage: med.dosage || "",
      frequency: med.frequency || "",
      notes: med.notes || "",
      startDate: med.startDate || "",
      endDate: med.endDate || "",
    });
  };

  const saveEdit = (id: string) => {
    updateMutation.mutate({ id, data: editForm });
  };

  const filteredCommonMeds = COMMON_MEDS.filter(m =>
    m.toLowerCase().includes(medSearch.toLowerCase())
  ).slice(0, 8);

  const isLoading = bundleLoading || historyLoading || reconLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const totalWarnings = beersWarnings.length + interactions.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={`/visits/${visitId}/intake`}>
          <Button variant="ghost" size="sm" data-testid="button-back-intake">
            <ChevronLeft className="w-4 h-4 mr-1" /> Intake
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold" data-testid="text-page-title">
            Medication Reconciliation
            {member && <span className="font-normal text-muted-foreground"> - {member.firstName} {member.lastName}</span>}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-md flex-shrink-0" style={{ backgroundColor: "#27749315" }}>
              <ClipboardCheck className="w-5 h-5" style={{ color: "#277493" }} />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="text-total-reconciled">{reconciledMeds.length}</div>
              <div className="text-xs text-muted-foreground">Meds Reconciled</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-md flex-shrink-0" style={{ backgroundColor: totalWarnings > 0 ? "#FEA00215" : "#27749315" }}>
              <AlertTriangle className="w-5 h-5" style={{ color: totalWarnings > 0 ? "#FEA002" : "#277493" }} />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="text-total-warnings">{totalWarnings}</div>
              <div className="text-xs text-muted-foreground">Warnings</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-md flex-shrink-0" style={{ backgroundColor: "#2E456B15" }}>
              <Plus className="w-5 h-5" style={{ color: "#2E456B" }} />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="text-new-meds">{statusCounts.new}</div>
              <div className="text-xs text-muted-foreground">New Meds Found</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {interactions.length > 0 && (
        <Alert variant="destructive">
          <ShieldAlert className="w-4 h-4" />
          <AlertDescription>
            <span className="font-semibold">Drug Interaction Warnings ({interactions.length})</span>
            <div className="mt-2 space-y-1">
              {interactions.map((int, i) => (
                <div key={i} className="text-sm flex items-start gap-2" data-testid={`text-interaction-${i}`}>
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span><strong>{int.med1}</strong> + <strong>{int.med2}</strong>: {int.risk}</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {beersWarnings.length > 0 && (
        <Alert className="border-amber-300 dark:border-amber-600">
          <AlertTriangle className="w-4 h-4" style={{ color: "#FEA002" }} />
          <AlertDescription>
            <span className="font-semibold" style={{ color: "#FEA002" }}>Beers Criteria Warnings ({beersWarnings.length})</span>
            <div className="mt-2 space-y-1">
              {beersWarnings.map((w, i) => (
                <div key={i} className="text-sm flex items-start gap-2" data-testid={`text-beers-warning-${i}`}>
                  <Pill className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#FEA002" }} />
                  <span><strong>{w.medName}</strong> ({w.category}): {w.reason}</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Pill className="w-5 h-5" style={{ color: "#2E456B" }} />
                  <h2 className="text-base font-semibold">Patient's Known Medications</h2>
                </div>
                <Badge variant="secondary" className="text-xs">{medHistory.length + chartMeds.length} total</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {chartMeds.length > 0 && (
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium text-muted-foreground hover-elevate rounded-md p-1">
                    <ChevronDown className="w-4 h-4" />
                    Chart Medications ({chartMeds.length})
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-1">
                    {chartMeds.map((med, i) => {
                      const isAdded = reconciledNames.has(med.medicationName.toLowerCase());
                      return (
                        <div
                          key={`chart-${i}`}
                          className="flex items-center justify-between gap-2 p-2 rounded-md border"
                          data-testid={`card-chart-med-${i}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge className={`text-xs no-default-hover-elevate no-default-active-elevate ${SOURCE_COLORS.chart}`} variant="secondary">chart</Badge>
                            <span className="text-sm truncate">{med.medicationName}</span>
                          </div>
                          {isAdded ? (
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#277493" }} />
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleQuickAdd(med.medicationName, "", "", "", "", "chart")}
                              disabled={addMutation.isPending}
                              data-testid={`button-add-chart-${i}`}
                            >
                              <Plus className="w-4 h-4 mr-1" /> Add
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {sortedHistory.length > 0 && (
                <>
                  <Separator />
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium text-muted-foreground hover-elevate rounded-md p-1">
                      <ChevronDown className="w-4 h-4" />
                      Medication History ({sortedHistory.length})
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-1">
                      {sortedHistory.map((med, i) => {
                        const isAdded = reconciledNames.has(med.medicationName.toLowerCase());
                        const beers = checkBeers(med.medicationName);
                        return (
                          <div
                            key={med.id}
                            className="flex items-center justify-between gap-2 p-2 rounded-md border"
                            data-testid={`card-history-med-${i}`}
                          >
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`text-xs no-default-hover-elevate no-default-active-elevate ${med.status === "active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`} variant="secondary">
                                  {med.status}
                                </Badge>
                                <span className="text-sm font-medium truncate">{med.medicationName}</span>
                                {beers && (
                                  <Badge variant="destructive" className="text-xs no-default-hover-elevate no-default-active-elevate" style={{ backgroundColor: "#FEA002", color: "#fff" }}>
                                    <AlertTriangle className="w-3 h-3 mr-1" /> Beers
                                  </Badge>
                                )}
                              </div>
                              {(med.dosage || med.frequency) && (
                                <span className="text-xs text-muted-foreground">
                                  {[med.dosage, med.frequency, med.route].filter(Boolean).join(" | ")}
                                </span>
                              )}
                            </div>
                            {isAdded ? (
                              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#277493" }} />
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleQuickAdd(med.medicationName, med.genericName || "", med.dosage || "", med.frequency || "", med.route || "", "history")}
                                disabled={addMutation.isPending}
                                data-testid={`button-add-history-${i}`}
                              >
                                <Plus className="w-4 h-4 mr-1" /> Add
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              {medHistory.length === 0 && chartMeds.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No medication history found for this patient
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5" style={{ color: "#277493" }} />
                  <h2 className="text-base font-semibold">Reconciliation List</h2>
                </div>
                <Button size="sm" onClick={() => setAddDialogOpen(true)} data-testid="button-add-new-med">
                  <Plus className="w-4 h-4 mr-1" /> Add New
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {reconciledMeds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No medications reconciled yet. Add from patient history or enter new medications.
                </div>
              ) : (
                reconciledMeds.map((med) => {
                  const beers = checkBeers(med.medicationName);
                  const medInteractions = interactions.filter(
                    int => int.med1 === med.medicationName || int.med2 === med.medicationName
                  );
                  const isEditing = editingId === med.id;

                  return (
                    <div key={med.id} className="border rounded-md p-3 space-y-2" data-testid={`card-reconciled-med-${med.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold">{med.medicationName}</span>
                            <Badge className={`text-xs no-default-hover-elevate no-default-active-elevate ${STATUS_COLORS[med.status] || ""}`} variant="secondary">
                              {med.status}
                            </Badge>
                            <Badge className={`text-xs no-default-hover-elevate no-default-active-elevate ${SOURCE_COLORS[med.source] || SOURCE_COLORS.history}`} variant="secondary">
                              {med.source}
                            </Badge>
                          </div>
                          {!isEditing && (
                            <>
                              <span className="text-xs text-muted-foreground">
                                {[med.dosage, med.frequency, med.route].filter(Boolean).join(" | ") || "No details"}
                              </span>
                              {(med.startDate || med.endDate) && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <CalendarIcon className="w-3 h-3" />
                                  {med.startDate && `Started: ${med.startDate}`}
                                  {med.startDate && med.endDate && " — "}
                                  {med.endDate && <span className={med.status === "discontinued" ? "text-red-600 dark:text-red-400 font-medium" : ""}>{`Ended: ${med.endDate}`}</span>}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!isEditing ? (
                            <>
                              <Button size="icon" variant="ghost" onClick={() => startEdit(med)} data-testid={`button-edit-med-${med.id}`}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteMutation.mutate(med.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-med-${med.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" onClick={() => saveEdit(med.id)} disabled={updateMutation.isPending} data-testid={`button-save-edit-${med.id}`}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} data-testid={`button-cancel-edit-${med.id}`}>
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {isEditing && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <div>
                            <Label className="text-xs">Status</Label>
                            <Select value={editForm.status} onValueChange={(v) => {
                              const updates: Record<string, string> = { status: v };
                              if ((v === "discontinued" || v === "held") && !editForm.endDate) {
                                updates.endDate = new Date().toISOString().split("T")[0];
                              }
                              if (v !== "discontinued" && v !== "held") {
                                updates.endDate = "";
                              }
                              setEditForm(f => ({ ...f, ...updates }));
                            }}>
                              <SelectTrigger data-testid={`select-status-${med.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="verified">Verified</SelectItem>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="modified">Modified</SelectItem>
                                <SelectItem value="discontinued">Discontinued</SelectItem>
                                <SelectItem value="held">Held</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Dosage</Label>
                            <Input
                              value={editForm.dosage}
                              onChange={(e) => setEditForm(f => ({ ...f, dosage: e.target.value }))}
                              placeholder="e.g. 10mg"
                              data-testid={`input-edit-dosage-${med.id}`}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Frequency</Label>
                            <Input
                              value={editForm.frequency}
                              onChange={(e) => setEditForm(f => ({ ...f, frequency: e.target.value }))}
                              placeholder="e.g. daily"
                              data-testid={`input-edit-frequency-${med.id}`}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Start Date</Label>
                            <Input
                              type="date"
                              value={editForm.startDate}
                              onChange={(e) => setEditForm(f => ({ ...f, startDate: e.target.value }))}
                              data-testid={`input-edit-start-date-${med.id}`}
                            />
                          </div>
                          {(editForm.status === "discontinued" || editForm.status === "held") && (
                            <div>
                              <Label className="text-xs flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                End Date
                              </Label>
                              <Input
                                type="date"
                                value={editForm.endDate}
                                onChange={(e) => setEditForm(f => ({ ...f, endDate: e.target.value }))}
                                data-testid={`input-edit-end-date-${med.id}`}
                              />
                            </div>
                          )}
                          <div>
                            <Label className="text-xs">Notes</Label>
                            <Input
                              value={editForm.notes}
                              onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                              placeholder="Notes..."
                              data-testid={`input-edit-notes-${med.id}`}
                            />
                          </div>
                        </div>
                      )}

                      {med.notes && !isEditing && (
                        <div className="text-xs text-muted-foreground italic">Note: {med.notes}</div>
                      )}

                      {beers && (
                        <div className="flex items-start gap-2 text-xs p-2 rounded-md" style={{ backgroundColor: "#FEA00210" }}>
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#FEA002" }} />
                          <span><strong>Beers Criteria ({beers.category}):</strong> {beers.reason}</span>
                        </div>
                      )}

                      {medInteractions.map((int, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs p-2 rounded-md bg-destructive/10">
                          <ShieldAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-destructive" />
                          <span className="text-destructive">
                            <strong>Interaction with {int.med1 === med.medicationName ? int.med2 : int.med1}:</strong> {int.risk}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-base font-semibold">Reconciliation Summary</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {(["verified", "new", "modified", "discontinued", "held"] as const).map((status) => (
              <div key={status} className="text-center">
                <div className="text-lg font-bold" data-testid={`text-count-${status}`}>{statusCounts[status]}</div>
                <Badge className={`text-xs capitalize no-default-hover-elevate no-default-active-elevate ${STATUS_COLORS[status]}`} variant="secondary">
                  {status}
                </Badge>
              </div>
            ))}
            <div className="text-center">
              <div className="text-lg font-bold" data-testid="text-total-warnings-summary">{totalWarnings}</div>
              {totalWarnings === 0 ? (
                <Badge variant="secondary" className="text-xs no-default-hover-elevate no-default-active-elevate bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> All Clear
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs no-default-hover-elevate no-default-active-elevate">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Warnings
                </Badge>
              )}
            </div>
          </div>
          {totalWarnings > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              {beersWarnings.length} Beers criteria warning{beersWarnings.length !== 1 ? "s" : ""} | {interactions.length} drug interaction{interactions.length !== 1 ? "s" : ""} detected
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Medication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Medication Name *</Label>
              <Input
                value={newMedForm.medicationName}
                onChange={(e) => {
                  setNewMedForm(f => ({ ...f, medicationName: e.target.value }));
                  setMedSearch(e.target.value);
                }}
                placeholder="Start typing medication name..."
                data-testid="input-new-med-name"
              />
              {medSearch.length >= 2 && filteredCommonMeds.length > 0 && (
                <div className="mt-1 border rounded-md max-h-32 overflow-auto">
                  {filteredCommonMeds.map((med) => (
                    <button
                      key={med}
                      className="w-full text-left text-sm p-2 hover-elevate cursor-pointer"
                      onClick={() => {
                        setNewMedForm(f => ({ ...f, medicationName: med }));
                        setMedSearch("");
                      }}
                      data-testid={`button-suggest-${med.toLowerCase()}`}
                    >
                      {med}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Generic Name</Label>
              <Input
                value={newMedForm.genericName}
                onChange={(e) => setNewMedForm(f => ({ ...f, genericName: e.target.value }))}
                placeholder="Generic name"
                data-testid="input-new-generic-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dosage</Label>
                <Input
                  value={newMedForm.dosage}
                  onChange={(e) => setNewMedForm(f => ({ ...f, dosage: e.target.value }))}
                  placeholder="e.g. 10mg"
                  data-testid="input-new-dosage"
                />
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={newMedForm.frequency} onValueChange={(v) => setNewMedForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger data-testid="select-new-frequency">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Route</Label>
                <Select value={newMedForm.route} onValueChange={(v) => setNewMedForm(f => ({ ...f, route: v }))}>
                  <SelectTrigger data-testid="select-new-route">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newMedForm.category} onValueChange={(v) => setNewMedForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger data-testid="select-new-category">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newMedForm.notes}
                onChange={(e) => setNewMedForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Additional notes..."
                className="resize-none"
                data-testid="input-new-notes"
              />
            </div>
            {newMedForm.medicationName && checkBeers(newMedForm.medicationName) && (
              <Alert className="border-amber-300 dark:border-amber-600">
                <AlertTriangle className="w-4 h-4" style={{ color: "#FEA002" }} />
                <AlertDescription className="text-sm">
                  <strong>Beers Criteria:</strong> {checkBeers(newMedForm.medicationName)!.reason}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} data-testid="button-cancel-add">Cancel</Button>
            <Button
              onClick={handleAddNew}
              disabled={!newMedForm.medicationName.trim() || addMutation.isPending}
              data-testid="button-confirm-add"
            >
              {addMutation.isPending ? "Adding..." : "Add Medication"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}