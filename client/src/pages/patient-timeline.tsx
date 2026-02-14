import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Activity, FlaskConical, Pill, TrendingUp, TrendingDown, Minus, Building2, Globe, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { usePlatform } from "@/hooks/use-platform";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useMemo, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart, Legend, Scatter,
} from "recharts";
import type { Member, LabResult, MedicationHistory, VitalsHistory } from "@shared/schema";

const SOURCE_COLORS = {
  practice: "hsl(var(--chart-1))",
  hie: "hsl(var(--chart-3))",
};

const CATEGORY_COLORS: Record<string, string> = {
  cardiovascular: "hsl(var(--chart-1))",
  diabetes: "hsl(var(--chart-2))",
  respiratory: "hsl(var(--chart-3))",
  mental_health: "hsl(var(--chart-4))",
  pain: "hsl(var(--chart-5))",
  thyroid: "hsl(var(--chart-1))",
  anticoagulant: "hsl(var(--chart-2))",
  gastrointestinal: "hsl(var(--chart-3))",
  metabolic: "hsl(var(--chart-4))",
  other: "hsl(var(--chart-5))",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SourceBadge({ source }: { source: string }) {
  return (
    <Badge variant={source === "practice" ? "default" : "secondary"} className="text-xs">
      {source === "practice" ? <Building2 className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
      {source === "practice" ? "Practice" : "HIE"}
    </Badge>
  );
}

function TrendIndicator({ values }: { values: number[] }) {
  if (values.length < 2) return <Minus className="w-4 h-4 text-muted-foreground" />;
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const diff = last - prev;
  const pct = Math.abs((diff / prev) * 100).toFixed(1);
  if (diff > 0) return <span className="flex items-center gap-1 text-xs text-destructive"><TrendingUp className="w-3 h-3" /> +{pct}%</span>;
  if (diff < 0) return <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><TrendingDown className="w-3 h-3" /> -{pct}%</span>;
  return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Minus className="w-3 h-3" /> 0%</span>;
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  const isPractice = payload?.source === "practice";
  return (
    <circle
      cx={cx}
      cy={cy}
      r={isPractice ? 5 : 4}
      fill={isPractice ? SOURCE_COLORS.practice : SOURCE_COLORS.hie}
      stroke="hsl(var(--background))"
      strokeWidth={2}
    />
  );
}

function LabTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="bg-popover border rounded-md p-3 shadow-md text-sm">
      <p className="font-medium">{formatDateFull(label)}</p>
      <div className="flex items-center gap-2 mt-1">
        <SourceBadge source={data?.source || "practice"} />
        {data?.actorName && (
          <span className="text-xs text-muted-foreground">by {data.actorName}</span>
        )}
      </div>
      {payload.map((p: any, i: number) => (
        <p key={i} className="mt-1">
          <span className="font-medium">{data?.value}</span> {data?.unit}
          {data?.referenceMin != null && data?.referenceMax != null && (
            <span className="text-muted-foreground ml-1">(ref: {data.referenceMin}-{data.referenceMax})</span>
          )}
        </p>
      ))}
      {data?.status && data.status !== "normal" && (
        <Badge variant="destructive" className="mt-1 text-xs">{data.status.toUpperCase()}</Badge>
      )}
    </div>
  );
}

function VitalsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="bg-popover border rounded-md p-3 shadow-md text-sm">
      <p className="font-medium">{formatDateFull(label)}</p>
      <div className="flex items-center gap-2 mt-1">
        <SourceBadge source={data?.source || "practice"} />
        {data?.actorName && (
          <span className="text-xs text-muted-foreground">by {data.actorName}</span>
        )}
      </div>
      {payload.map((p: any, i: number) => (
        <p key={i} className="mt-1" style={{ color: p.color }}>
          {p.name}: <span className="font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function LabChart({ testName, labs }: { testName: string; labs: LabResult[] }) {
  const sorted = [...labs].sort((a, b) => a.collectedDate.localeCompare(b.collectedDate));
  const refMin = sorted[0]?.referenceMin ?? undefined;
  const refMax = sorted[0]?.referenceMax ?? undefined;
  const unit = sorted[0]?.unit || "";
  const values = sorted.map(l => l.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const padding = (maxVal - minVal) * 0.2 || 5;
  const yMin = Math.floor(Math.min(minVal, refMin ?? minVal) - padding);
  const yMax = Math.ceil(Math.max(maxVal, refMax ?? maxVal) + padding);

  return (
    <Card data-testid={`card-lab-${testName.replace(/\s+/g, '-').toLowerCase()}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2 space-y-0">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-sm font-medium">{testName}</CardTitle>
          <span className="text-xs text-muted-foreground">({unit})</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendIndicator values={values} />
          <span className="text-xs text-muted-foreground">
            Latest: <span className="font-medium">{values[values.length - 1]}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={sorted} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="collectedDate" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
            <YAxis domain={[yMin, yMax]} tick={{ fontSize: 11 }} />
            <RechartsTooltip content={<LabTooltip />} />
            {refMin != null && refMax != null && (
              <Area
                dataKey="value"
                type="monotone"
                fill="none"
                stroke="none"
                baseValue={refMin}
              />
            )}
            {refMin != null && (
              <ReferenceLine y={refMin} stroke="hsl(var(--chart-4))" strokeDasharray="4 4" strokeWidth={1} label={{ value: `Min ${refMin}`, position: "left", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            )}
            {refMax != null && (
              <ReferenceLine y={refMax} stroke="hsl(var(--chart-4))" strokeDasharray="4 4" strokeWidth={1} label={{ value: `Max ${refMax}`, position: "left", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 6, stroke: "hsl(var(--background))", strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: SOURCE_COLORS.practice }} />
            Practice
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: SOURCE_COLORS.hie }} />
            HIE
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-4 border-t-2 border-dashed inline-block" style={{ borderColor: "hsl(var(--chart-4))" }} />
            Reference Range
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LabDrilldown({ testName, labs }: { testName: string; labs: LabResult[] }) {
  const [showCount, setShowCount] = useState(10);
  const sorted = [...labs].sort((a, b) => b.collectedDate.localeCompare(a.collectedDate));
  const visible = sorted.slice(0, showCount);
  const hasMore = showCount < sorted.length;

  return (
    <Card data-testid={`drilldown-lab-${testName.replace(/\s+/g, '-').toLowerCase()}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{testName} — All Results ({sorted.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Actor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((lab, idx) => (
              <TableRow key={lab.id || idx} data-testid={`row-lab-result-${idx}`}>
                <TableCell className="text-sm">{formatDateFull(lab.collectedDate)}</TableCell>
                <TableCell className="text-sm font-medium">{lab.value}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{lab.unit}</TableCell>
                <TableCell>
                  <Badge
                    variant={lab.status === "normal" ? "secondary" : "destructive"}
                    className="text-xs"
                    data-testid={`badge-lab-status-${idx}`}
                  >
                    {(lab.status || "normal").toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell><SourceBadge source={lab.source} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{lab.actorName || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {hasMore && (
          <div className="flex justify-center mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCount(prev => prev + 10)}
              data-testid={`button-show-more-${testName.replace(/\s+/g, '-').toLowerCase()}`}
            >
              Show More ({sorted.length - showCount} remaining)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MedicationDetailPanel({ med }: { med: MedicationHistory }) {
  return (
    <Card data-testid={`panel-med-detail-${med.medicationName.replace(/\s+/g, '-').toLowerCase()}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Pill className="w-4 h-4" />
          {med.medicationName}
          <Badge variant={med.status === "active" ? "default" : "secondary"} className="text-xs ml-2">
            {med.status === "active" ? "Active" : "Discontinued"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Dosage:</span>{" "}
            <span className="font-medium">{med.dosage || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Frequency:</span>{" "}
            <span className="font-medium">{med.frequency || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Route:</span>{" "}
            <span className="font-medium">{med.route || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Prescriber:</span>{" "}
            <span className="font-medium">{med.prescriber || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Start Date:</span>{" "}
            <span className="font-medium">{formatDateFull(med.startDate)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">End Date:</span>{" "}
            <span className="font-medium">{med.endDate ? formatDateFull(med.endDate) : "Ongoing"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Source:</span>{" "}
            <SourceBadge source={med.source} />
          </div>
          {med.actorName && (
            <div data-testid="text-med-actor">
              <span className="text-muted-foreground">Recorded by:</span>{" "}
              <span className="font-medium">{med.actorName}</span>
            </div>
          )}
          {med.changeType && (
            <div data-testid="text-med-change-type">
              <span className="text-muted-foreground">Change:</span>{" "}
              <Badge variant="secondary" className="text-xs">{med.changeType}</Badge>
            </div>
          )}
          {med.changeReason && (
            <div data-testid="text-med-change-reason">
              <span className="text-muted-foreground">Reason:</span>{" "}
              <span className="font-medium">{med.changeReason}</span>
            </div>
          )}
          {med.status === "discontinued" && med.reason && (
            <div className="md:col-span-2" data-testid="text-med-dc-reason">
              <span className="text-muted-foreground">D/C Reason:</span>{" "}
              <span className="font-medium">{med.reason}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MedicationsTable({ medications, sourceFilter }: { medications: MedicationHistory[]; sourceFilter: string }) {
  const [sortField, setSortField] = useState<string>("medicationName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }, [sortField]);

  const filtered = useMemo(() => {
    let items = [...medications];
    if (sourceFilter !== "all") {
      items = items.filter(m => m.source === sourceFilter);
    }
    items.sort((a, b) => {
      const aVal = (a as any)[sortField] || "";
      const bVal = (b as any)[sortField] || "";
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
  }, [medications, sourceFilter, sortField, sortDir]);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 inline ml-1" />
      : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  return (
    <Card data-testid="card-medications-table">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">All Medications</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("medicationName")} data-testid="sort-med-name">
                Name <SortIcon field="medicationName" />
              </TableHead>
              <TableHead>Dosage</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("status")} data-testid="sort-med-status">
                Status <SortIcon field="status" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("source")} data-testid="sort-med-source">
                Source <SortIcon field="source" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("startDate")} data-testid="sort-med-start">
                Start <SortIcon field="startDate" />
              </TableHead>
              <TableHead>End</TableHead>
              <TableHead>Change Type</TableHead>
              <TableHead>Change Reason</TableHead>
              <TableHead>Actor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((med, idx) => (
              <TableRow key={med.id || idx} data-testid={`row-med-${idx}`}>
                <TableCell className="text-sm font-medium">{med.medicationName}</TableCell>
                <TableCell className="text-sm">{med.dosage || "—"}</TableCell>
                <TableCell>
                  <Badge variant={med.status === "active" ? "default" : "secondary"} className="text-xs">
                    {med.status === "active" ? "Active" : "D/C"}
                  </Badge>
                </TableCell>
                <TableCell><SourceBadge source={med.source} /></TableCell>
                <TableCell className="text-sm">{formatDateFull(med.startDate)}</TableCell>
                <TableCell className="text-sm">{med.endDate ? formatDateFull(med.endDate) : "—"}</TableCell>
                <TableCell className="text-sm">
                  {med.changeType ? <Badge variant="secondary" className="text-xs">{med.changeType}</Badge> : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{med.changeReason || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{med.actorName || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No medications found
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VitalsSection({ vitalsHistory, vitalType }: { vitalsHistory: VitalsHistory[]; vitalType: string }) {
  const sorted = [...vitalsHistory].sort((a, b) => a.measureDate.localeCompare(b.measureDate));

  const configs: Record<string, { label: string; keys: { key: string; label: string; color: string }[]; yLabel: string }> = {
    bp: {
      label: "Blood Pressure",
      keys: [
        { key: "systolic", label: "Systolic", color: "hsl(var(--chart-1))" },
        { key: "diastolic", label: "Diastolic", color: "hsl(var(--chart-2))" },
      ],
      yLabel: "mmHg",
    },
    hr: {
      label: "Heart Rate",
      keys: [{ key: "heartRate", label: "Heart Rate", color: "hsl(var(--chart-3))" }],
      yLabel: "bpm",
    },
    o2: {
      label: "Oxygen Saturation",
      keys: [{ key: "oxygenSaturation", label: "SpO2", color: "hsl(var(--chart-1))" }],
      yLabel: "%",
    },
    weight: {
      label: "Weight & BMI",
      keys: [
        { key: "weight", label: "Weight (lbs)", color: "hsl(var(--chart-2))" },
        { key: "bmi", label: "BMI", color: "hsl(var(--chart-4))" },
      ],
      yLabel: "",
    },
  };

  const config = configs[vitalType];
  if (!config) return null;

  const refLines: Record<string, { value: number; label: string }[]> = {
    bp: [
      { value: 140, label: "Systolic High" },
      { value: 90, label: "Diastolic High" },
    ],
    hr: [
      { value: 100, label: "Tachycardia" },
      { value: 60, label: "Bradycardia" },
    ],
    o2: [{ value: 92, label: "Low O2" }],
    weight: [{ value: 30, label: "BMI Obese" }],
  };

  return (
    <Card data-testid={`card-vitals-${vitalType}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
        {config.yLabel && <span className="text-xs text-muted-foreground">({config.yLabel})</span>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={sorted} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="measureDate" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <RechartsTooltip content={<VitalsTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {(refLines[vitalType] || []).map((ref, i) => (
              <ReferenceLine
                key={i}
                y={ref.value}
                stroke="hsl(var(--destructive))"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{ value: ref.label, position: "right", fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              />
            ))}
            {config.keys.map((k) => (
              <Line
                key={k.key}
                type="monotone"
                dataKey={k.key}
                name={k.label}
                stroke={k.color}
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 6, stroke: "hsl(var(--background))", strokeWidth: 2 }}
                connectNulls
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: SOURCE_COLORS.practice }} />
            Practice
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: SOURCE_COLORS.hie }} />
            HIE
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MedicationGantt({ medications, lookbackYears = 2, onMedClick }: { medications: MedicationHistory[]; lookbackYears?: number; onMedClick?: (med: MedicationHistory) => void }) {
  const today = new Date();
  const lookbackStart = new Date(today.getFullYear() - lookbackYears, today.getMonth(), today.getDate());
  const totalDays = Math.ceil((today.getTime() - lookbackStart.getTime()) / (1000 * 60 * 60 * 24));

  const filtered = medications.filter(med => {
    const startDate = new Date(med.startDate + "T00:00:00");
    const endDate = med.endDate ? new Date(med.endDate + "T00:00:00") : today;
    return endDate >= lookbackStart && startDate <= today;
  }).sort((a, b) => {
    const catOrder = Object.keys(CATEGORY_COLORS);
    const catA = catOrder.indexOf(a.category || "other");
    const catB = catOrder.indexOf(b.category || "other");
    if (catA !== catB) return catA - catB;
    return a.startDate.localeCompare(b.startDate);
  });

  const getBarStyle = (med: MedicationHistory) => {
    const startDate = new Date(med.startDate + "T00:00:00");
    const endDate = med.endDate ? new Date(med.endDate + "T00:00:00") : today;
    const clampedStart = startDate < lookbackStart ? lookbackStart : startDate;
    const clampedEnd = endDate > today ? today : endDate;
    const startOffset = Math.max(0, (clampedStart.getTime() - lookbackStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(3, (clampedEnd.getTime() - clampedStart.getTime()) / (1000 * 60 * 60 * 24));
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${Math.min((duration / totalDays) * 100, 100 - (startOffset / totalDays) * 100)}%`,
    };
  };

  const months: { label: string; position: string }[] = [];
  const cursor = new Date(lookbackStart.getFullYear(), lookbackStart.getMonth(), 1);
  while (cursor <= today) {
    const offset = (cursor.getTime() - lookbackStart.getTime()) / (1000 * 60 * 60 * 24);
    if (offset >= 0) {
      months.push({
        label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        position: `${(offset / totalDays) * 100}%`,
      });
    }
    cursor.setMonth(cursor.getMonth() + 3);
  }

  let prevCategory = "";

  return (
    <Card data-testid="card-medication-gantt">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Pill className="w-4 h-4" />
            Medication Timeline ({lookbackYears}-Year Lookback)
          </CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: SOURCE_COLORS.practice }} />
              Practice
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: SOURCE_COLORS.hie }} />
              HIE
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="w-6 h-3 rounded-sm inline-block border-2 border-dashed opacity-50" />
              Discontinued
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="relative border-b pb-1 mb-2" style={{ height: 24 }}>
            {months.map((m, i) => (
              <span
                key={i}
                className="absolute text-xs text-muted-foreground"
                style={{ left: m.position, transform: "translateX(-50%)" }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="space-y-1">
            {filtered.map((med, idx) => {
              const barStyle = getBarStyle(med);
              const isActive = med.status === "active";
              const color = CATEGORY_COLORS[med.category || "other"] || CATEGORY_COLORS.other;
              const isPractice = med.source === "practice";
              const showCatLabel = med.category !== prevCategory;
              prevCategory = med.category || "";

              return (
                <div key={med.id || idx}>
                  {showCatLabel && (
                    <div className="text-xs font-medium text-muted-foreground mt-2 mb-1 capitalize">
                      {(med.category || "other").replace(/_/g, " ")}
                    </div>
                  )}
                  <div
                    className="flex items-center gap-2 cursor-pointer hover-elevate rounded-sm"
                    style={{ minHeight: 28 }}
                    onClick={() => onMedClick?.(med)}
                    data-testid={`med-bar-${med.medicationName.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    <div className="w-36 md:w-48 flex-shrink-0 text-xs truncate flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: isPractice ? SOURCE_COLORS.practice : SOURCE_COLORS.hie }} />
                      <span className="font-medium truncate">{med.medicationName}</span>
                      {med.dosage && <span className="text-muted-foreground hidden md:inline">{med.dosage}</span>}
                    </div>
                    <div className="flex-1 relative" style={{ height: 20 }}>
                      <div
                        className="absolute top-0 h-full rounded-sm transition-all"
                        style={{
                          ...barStyle,
                          backgroundColor: color,
                          opacity: isActive ? 0.85 : 0.4,
                          borderRight: isActive ? `3px solid ${color}` : "none",
                          borderStyle: isActive ? "solid" : "dashed",
                          borderWidth: isActive ? 0 : 2,
                          borderColor: color,
                        }}
                      >
                        <div className="absolute inset-0 flex items-center px-1 overflow-hidden">
                          <span className="text-xs font-medium truncate" style={{ color: isActive ? "white" : "transparent", textShadow: isActive ? "0 1px 2px rgba(0,0,0,0.3)" : "none" }}>
                            {med.frequency || ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-20 flex-shrink-0 text-right">
                      <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                        {isActive ? "Active" : "D/C"}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No medication history within the lookback period
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PatientTimeline() {
  const { isMobileLayout } = usePlatform();
  const params = useParams<{ id: string }>();
  const visitId = params.id;
  const [labCategory, setLabCategory] = useState<string>("all");
  const [vitalType, setVitalType] = useState<string>("bp");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedLabTest, setSelectedLabTest] = useState<string | null>(null);
  const [selectedMed, setSelectedMed] = useState<MedicationHistory | null>(null);

  const { data: bundle } = useQuery<any>({ queryKey: ["/api/visits", visitId, "bundle"] });
  const memberId = bundle?.visit?.memberId;
  const member = bundle?.member as Member | undefined;

  const { data: labs = [], isLoading: labsLoading } = useQuery<LabResult[]>({
    queryKey: ["/api/members", memberId, "labs"],
    enabled: !!memberId,
  });

  const { data: meds = [], isLoading: medsLoading } = useQuery<MedicationHistory[]>({
    queryKey: ["/api/members", memberId, "medications"],
    enabled: !!memberId,
  });

  const { data: vitals = [], isLoading: vitalsLoading } = useQuery<VitalsHistory[]>({
    queryKey: ["/api/members", memberId, "vitals-history"],
    enabled: !!memberId,
  });

  const labsByTest = useMemo(() => {
    const grouped: Record<string, LabResult[]> = {};
    labs.forEach(lab => {
      if (!grouped[lab.testName]) grouped[lab.testName] = [];
      grouped[lab.testName].push(lab);
    });
    return grouped;
  }, [labs]);

  const labCategories = useMemo(() => {
    const cats = new Set(labs.map(l => l.category || "other"));
    return Array.from(cats).sort();
  }, [labs]);

  const filteredLabs = useMemo(() => {
    if (sourceFilter === "all") return labs;
    return labs.filter(l => l.source === sourceFilter);
  }, [labs, sourceFilter]);

  const filteredVitals = useMemo(() => {
    if (sourceFilter === "all") return vitals;
    return vitals.filter(v => v.source === sourceFilter);
  }, [vitals, sourceFilter]);

  const filteredMeds = useMemo(() => {
    if (sourceFilter === "all") return meds;
    return meds.filter(m => m.source === sourceFilter);
  }, [meds, sourceFilter]);

  const filteredLabsByTest = useMemo(() => {
    const grouped: Record<string, LabResult[]> = {};
    filteredLabs.forEach(lab => {
      if (!grouped[lab.testName]) grouped[lab.testName] = [];
      grouped[lab.testName].push(lab);
    });
    return grouped;
  }, [filteredLabs]);

  const filteredLabTests = useMemo(() => {
    if (labCategory === "all") return Object.keys(filteredLabsByTest).sort();
    return Object.keys(filteredLabsByTest).filter(name =>
      filteredLabsByTest[name].some(l => (l.category || "other") === labCategory)
    ).sort();
  }, [filteredLabsByTest, labCategory]);

  const isLoading = labsLoading || medsLoading || vitalsLoading;

  return (
    <div className={`space-y-6 max-w-6xl mx-auto ${isMobileLayout ? "pb-20" : ""}`}>
      {isMobileLayout ? (
        <h1 className="text-lg font-bold pt-2" data-testid="text-page-title">Clinical Timeline</h1>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/visits/${visitId}/intake`}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold" data-testid="text-page-title">Patient Clinical Timeline</h1>
            {member && (
              <p className="text-sm text-muted-foreground">
                {member.firstName} {member.lastName} ({member.memberId}) — {member.dob}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-48" data-testid="select-source-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="practice">Practice</SelectItem>
            <SelectItem value="hie">HIE</SelectItem>
          </SelectContent>
        </Select>
        {sourceFilter !== "all" && (
          <Badge variant="secondary" className="text-xs" data-testid="badge-active-filter">
            Filtering: {sourceFilter === "practice" ? "Practice" : "HIE"}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="h-48 flex items-center justify-center text-muted-foreground">Loading...</CardContent></Card>
          ))}
        </div>
      ) : (
        <Tabs defaultValue="vitals" className="space-y-4">
          <TabsList data-testid="tabs-timeline">
            <TabsTrigger value="vitals" data-testid="tab-vitals">
              <Activity className="w-4 h-4 mr-1" />
              Vitals
            </TabsTrigger>
            <TabsTrigger value="labs" data-testid="tab-labs">
              <FlaskConical className="w-4 h-4 mr-1" />
              Lab Results
            </TabsTrigger>
            <TabsTrigger value="medications" data-testid="tab-medications">
              <Pill className="w-4 h-4 mr-1" />
              Rx History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vitals" className="space-y-4">
            <div className="flex items-center gap-2">
              <Select value={vitalType} onValueChange={setVitalType}>
                <SelectTrigger className="w-48" data-testid="select-vital-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bp">Blood Pressure</SelectItem>
                  <SelectItem value="hr">Heart Rate</SelectItem>
                  <SelectItem value="o2">Oxygen Saturation</SelectItem>
                  <SelectItem value="weight">Weight & BMI</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
                <span>{filteredVitals.length} data points</span>
                <span className="text-muted-foreground/50">|</span>
                <span>{filteredVitals.filter(v => v.source === "practice").length} practice</span>
                <span className="text-muted-foreground/50">|</span>
                <span>{filteredVitals.filter(v => v.source === "hie").length} HIE</span>
              </div>
            </div>
            <VitalsSection vitalsHistory={filteredVitals} vitalType={vitalType} />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">All Vitals Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {["bp", "hr", "o2", "weight"].map(type => {
                    const labels: Record<string, string> = { bp: "Blood Pressure", hr: "Heart Rate", o2: "SpO2", weight: "Weight" };
                    const latest = filteredVitals.length > 0 ? [...filteredVitals].sort((a, b) => b.measureDate.localeCompare(a.measureDate))[0] : null;
                    let value = "";
                    if (latest) {
                      if (type === "bp") value = `${latest.systolic || "-"}/${latest.diastolic || "-"} mmHg`;
                      else if (type === "hr") value = `${latest.heartRate || "-"} bpm`;
                      else if (type === "o2") value = `${latest.oxygenSaturation || "-"}%`;
                      else if (type === "weight") value = `${latest.weight || "-"} lbs (BMI: ${latest.bmi || "-"})`;
                    }
                    return (
                      <div
                        key={type}
                        className="p-3 rounded-md border cursor-pointer hover-elevate"
                        onClick={() => setVitalType(type)}
                        data-testid={`card-vital-summary-${type}`}
                      >
                        <p className="text-xs text-muted-foreground">{labels[type]}</p>
                        <p className="text-sm font-medium mt-1">{value || "N/A"}</p>
                        {latest && <p className="text-xs text-muted-foreground mt-1">{formatDate(latest.measureDate)}</p>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="labs" className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={labCategory} onValueChange={setLabCategory}>
                <SelectTrigger className="w-48" data-testid="select-lab-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {labCategories.map(cat => (
                    <SelectItem key={cat} value={cat} className="capitalize">{cat.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
                <span>{filteredLabs.length} results</span>
                <span className="text-muted-foreground/50">|</span>
                <span>{filteredLabs.filter(l => l.source === "practice").length} practice</span>
                <span className="text-muted-foreground/50">|</span>
                <span>{filteredLabs.filter(l => l.source === "hie").length} HIE</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredLabTests.map(testName => (
                <div
                  key={testName}
                  className="cursor-pointer"
                  onClick={() => setSelectedLabTest(prev => prev === testName ? null : testName)}
                  data-testid={`clickable-lab-${testName.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <LabChart testName={testName} labs={filteredLabsByTest[testName]} />
                </div>
              ))}
            </div>

            {selectedLabTest && filteredLabsByTest[selectedLabTest] && (
              <LabDrilldown testName={selectedLabTest} labs={filteredLabsByTest[selectedLabTest]} />
            )}

            {filteredLabTests.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No lab results found for the selected category
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="medications" className="space-y-4">
            <MedicationGantt medications={filteredMeds} lookbackYears={2} onMedClick={(med) => setSelectedMed(prev => prev?.id === med.id ? null : med)} />

            {selectedMed && (
              <MedicationDetailPanel med={selectedMed} />
            )}

            <MedicationsTable medications={meds} sourceFilter={sourceFilter} />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Medication Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-md border" data-testid="stat-active-meds">
                    <p className="text-xs text-muted-foreground">Active Medications</p>
                    <p className="text-lg font-semibold mt-1">{filteredMeds.filter(m => m.status === "active").length}</p>
                  </div>
                  <div className="p-3 rounded-md border" data-testid="stat-discontinued-meds">
                    <p className="text-xs text-muted-foreground">Discontinued (2yr)</p>
                    <p className="text-lg font-semibold mt-1">{filteredMeds.filter(m => m.status === "discontinued").length}</p>
                  </div>
                  <div className="p-3 rounded-md border" data-testid="stat-practice-meds">
                    <p className="text-xs text-muted-foreground">Practice Source</p>
                    <p className="text-lg font-semibold mt-1">{filteredMeds.filter(m => m.source === "practice").length}</p>
                  </div>
                  <div className="p-3 rounded-md border" data-testid="stat-hie-meds">
                    <p className="text-xs text-muted-foreground">HIE Source</p>
                    <p className="text-lg font-semibold mt-1">{filteredMeds.filter(m => m.source === "hie").length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
