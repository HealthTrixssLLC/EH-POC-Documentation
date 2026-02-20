import { Badge } from "@/components/ui/badge";
import { Mic, Globe, User } from "lucide-react";

export type DataSource = "clinic" | "voice" | "hie" | "internal" | "external" | "voice_capture" | "practice" | "history" | "home" | "chart" | "patient_report";

const SOURCE_CONFIG: Record<string, { label: string; color: string; dotColor: string; borderColor: string; icon?: any }> = {
  clinic: {
    label: "Clinic",
    color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    dotColor: "bg-slate-800 dark:bg-slate-200",
    borderColor: "border-l-slate-800 dark:border-l-slate-200",
    icon: User,
  },
  internal: {
    label: "Clinic",
    color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    dotColor: "bg-slate-800 dark:bg-slate-200",
    borderColor: "border-l-slate-800 dark:border-l-slate-200",
    icon: User,
  },
  practice: {
    label: "Clinic",
    color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    dotColor: "bg-slate-800 dark:bg-slate-200",
    borderColor: "border-l-slate-800 dark:border-l-slate-200",
    icon: User,
  },
  voice: {
    label: "Voice",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    dotColor: "bg-purple-600 dark:bg-purple-400",
    borderColor: "border-l-purple-600 dark:border-l-purple-400",
    icon: Mic,
  },
  voice_capture: {
    label: "Voice",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    dotColor: "bg-purple-600 dark:bg-purple-400",
    borderColor: "border-l-purple-600 dark:border-l-purple-400",
    icon: Mic,
  },
  hie: {
    label: "HIE",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    dotColor: "bg-orange-500 dark:bg-orange-400",
    borderColor: "border-l-orange-500 dark:border-l-orange-400",
    icon: Globe,
  },
  external: {
    label: "HIE",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    dotColor: "bg-orange-500 dark:bg-orange-400",
    borderColor: "border-l-orange-500 dark:border-l-orange-400",
    icon: Globe,
  },
  history: {
    label: "History",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dotColor: "bg-slate-600 dark:bg-slate-400",
    borderColor: "border-l-slate-600 dark:border-l-slate-400",
  },
  home: {
    label: "Home",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dotColor: "bg-slate-600 dark:bg-slate-400",
    borderColor: "border-l-slate-600 dark:border-l-slate-400",
  },
  chart: {
    label: "Chart",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dotColor: "bg-slate-600 dark:bg-slate-400",
    borderColor: "border-l-slate-600 dark:border-l-slate-400",
  },
  patient_report: {
    label: "Patient",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dotColor: "bg-slate-600 dark:bg-slate-400",
    borderColor: "border-l-slate-600 dark:border-l-slate-400",
  },
};

export function normalizeSource(source: string | null | undefined): string {
  if (!source) return "clinic";
  return source;
}

export function getSourceConfig(source: string | null | undefined) {
  const s = normalizeSource(source);
  return SOURCE_CONFIG[s] || SOURCE_CONFIG.clinic;
}

export function SourceBadge({ source, className = "" }: { source: string | null | undefined; className?: string }) {
  const config = getSourceConfig(source);
  const Icon = config.icon;
  return (
    <Badge
      variant="secondary"
      className={`text-xs no-default-hover-elevate no-default-active-elevate ${config.color} ${className}`}
      data-testid={`badge-source-${normalizeSource(source)}`}
    >
      {Icon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
}

export function SourceDot({ source, className = "" }: { source: string | null | undefined; className?: string }) {
  const config = getSourceConfig(source);
  return (
    <div
      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dotColor} ${className}`}
      title={config.label}
      data-testid={`dot-source-${normalizeSource(source)}`}
    />
  );
}

export function SourceBorderClass(source: string | null | undefined): string {
  const config = getSourceConfig(source);
  return `border-l-[3px] ${config.borderColor}`;
}

export function SourceLegend({ sources, className = "" }: { sources?: DataSource[]; className?: string }) {
  const defaultSources: DataSource[] = ["clinic", "voice", "hie"];
  const displaySources = sources || defaultSources;

  return (
    <div className={`flex items-center gap-4 text-xs text-muted-foreground ${className}`} data-testid="source-legend">
      {displaySources.map((s) => {
        const config = getSourceConfig(s);
        const Icon = config.icon;
        return (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
            {Icon && <Icon className="w-3 h-3" />}
            <span>{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}
