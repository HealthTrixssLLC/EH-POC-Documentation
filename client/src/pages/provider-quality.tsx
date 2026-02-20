import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlatform } from "@/hooks/use-platform";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, TrendingUp, BarChart3, AlertTriangle } from "lucide-react";

interface Provider {
  providerId: string;
  providerName: string;
  encounterCount: number;
  avgCompleteness: number;
  avgDiagnosis: number;
  avgCoding: number;
  avgOverall: number;
  auditedEncounters: number;
}

interface OrgAverages {
  completeness: number;
  diagnosisSupport: number;
  codingCompliance: number;
  overall: number;
}

interface SummaryResponse {
  providers: Provider[];
  orgAverages: OrgAverages;
}

interface RollingMetrics {
  encounterCount: number;
  avgCompleteness: number;
  avgDiagnosis: number;
  avgCoding: number;
  avgOverall: number;
  auditedCount?: number;
}

interface DetailResponse {
  providerId: string;
  snapshots: any[];
  encounterCount: number;
  rolling30: RollingMetrics;
  rolling60: RollingMetrics;
  rolling90: RollingMetrics;
  flagBreakdown: Array<{ flag: string; count: number }>;
  trend: any[];
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  return "destructive";
}

function SummaryView({ onSelectProvider }: { onSelectProvider: (id: string) => void }) {
  const { data: summary, isLoading } = useQuery<SummaryResponse>({
    queryKey: ["/api/providers/quality-summary"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No provider quality data available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Completeness</h3>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: "#002B5C" }} data-testid="text-org-avg-completeness">
              {summary.orgAverages.completeness}%
            </div>
            <Progress value={summary.orgAverages.completeness} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Diagnosis Support</h3>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: "#277493" }} data-testid="text-org-avg-diagnosis">
              {summary.orgAverages.diagnosisSupport}%
            </div>
            <Progress value={summary.orgAverages.diagnosisSupport} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Coding Compliance</h3>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: "#FEA002" }} data-testid="text-org-avg-coding">
              {summary.orgAverages.codingCompliance}%
            </div>
            <Progress value={summary.orgAverages.codingCompliance} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Overall</h3>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: "#002B5C" }} data-testid="text-org-avg-overall">
              {summary.orgAverages.overall}%
            </div>
            <Progress value={summary.orgAverages.overall} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: "#277493" }} />
            <h3 className="text-base font-semibold">Provider Rankings</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.providers.map((provider) => (
              <div
                key={provider.providerId}
                onClick={() => onSelectProvider(provider.providerId)}
                className="p-4 rounded-lg border hover-elevate cursor-pointer transition-all"
                data-testid={`card-provider-${provider.providerId}`}
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-2">{provider.providerName}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">{provider.encounterCount} encounters</span>
                      <span className="text-xs text-muted-foreground">{provider.auditedEncounters} audited</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getScoreColor(provider.avgOverall)}`}>
                        {provider.avgOverall}%
                      </div>
                      <div className="text-xs text-muted-foreground">Overall</div>
                    </div>
                    <Badge variant={getScoreBadgeVariant(provider.avgOverall)} className="text-xs">
                      {provider.avgOverall >= 80 ? "Good" : provider.avgOverall >= 60 ? "Fair" : "Poor"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Completeness</div>
                    <Progress value={provider.avgCompleteness} className="h-2" />
                    <div className="text-xs font-medium mt-1">{provider.avgCompleteness}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Diagnosis</div>
                    <Progress value={provider.avgDiagnosis} className="h-2" />
                    <div className="text-xs font-medium mt-1">{provider.avgDiagnosis}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Coding</div>
                    <Progress value={provider.avgCoding} className="h-2" />
                    <div className="text-xs font-medium mt-1">{provider.avgCoding}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailView({ providerId, onBack }: { providerId: string; onBack: () => void }) {
  const { data: detail, isLoading } = useQuery<DetailResponse>({
    queryKey: ["/api/providers", providerId, "quality"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-to-summary">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Summary
        </Button>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-to-summary">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Summary
        </Button>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Provider details not found
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-to-summary">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Summary
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">30-Day Metrics</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Overall</span>
                <span className={`text-sm font-bold ${getScoreColor(detail.rolling30.avgOverall)}`}>
                  {detail.rolling30.avgOverall}%
                </span>
              </div>
              <Progress value={detail.rolling30.avgOverall} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Completeness</span>
                <span className="text-xs font-medium">{detail.rolling30.avgCompleteness}%</span>
              </div>
              <Progress value={detail.rolling30.avgCompleteness} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Diagnosis</span>
                <span className="text-xs font-medium">{detail.rolling30.avgDiagnosis}%</span>
              </div>
              <Progress value={detail.rolling30.avgDiagnosis} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Coding</span>
                <span className="text-xs font-medium">{detail.rolling30.avgCoding}%</span>
              </div>
              <Progress value={detail.rolling30.avgCoding} className="h-2" />
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t">
              {detail.rolling30.encounterCount} encounters
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">60-Day Metrics</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Overall</span>
                <span className={`text-sm font-bold ${getScoreColor(detail.rolling60.avgOverall)}`}>
                  {detail.rolling60.avgOverall}%
                </span>
              </div>
              <Progress value={detail.rolling60.avgOverall} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Completeness</span>
                <span className="text-xs font-medium">{detail.rolling60.avgCompleteness}%</span>
              </div>
              <Progress value={detail.rolling60.avgCompleteness} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Diagnosis</span>
                <span className="text-xs font-medium">{detail.rolling60.avgDiagnosis}%</span>
              </div>
              <Progress value={detail.rolling60.avgDiagnosis} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Coding</span>
                <span className="text-xs font-medium">{detail.rolling60.avgCoding}%</span>
              </div>
              <Progress value={detail.rolling60.avgCoding} className="h-2" />
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t">
              {detail.rolling60.encounterCount} encounters
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">90-Day Metrics</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Overall</span>
                <span className={`text-sm font-bold ${getScoreColor(detail.rolling90.avgOverall)}`}>
                  {detail.rolling90.avgOverall}%
                </span>
              </div>
              <Progress value={detail.rolling90.avgOverall} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Completeness</span>
                <span className="text-xs font-medium">{detail.rolling90.avgCompleteness}%</span>
              </div>
              <Progress value={detail.rolling90.avgCompleteness} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Diagnosis</span>
                <span className="text-xs font-medium">{detail.rolling90.avgDiagnosis}%</span>
              </div>
              <Progress value={detail.rolling90.avgDiagnosis} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Coding</span>
                <span className="text-xs font-medium">{detail.rolling90.avgCoding}%</span>
              </div>
              <Progress value={detail.rolling90.avgCoding} className="h-2" />
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t">
              {detail.rolling90.encounterCount} encounters
            </div>
          </CardContent>
        </Card>
      </div>

      {detail.flagBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" style={{ color: "#FEA002" }} />
              <h3 className="text-base font-semibold">Quality Flag Breakdown</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {detail.flagBreakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{item.flag.replace(/_/g, " ")}</span>
                  <Badge variant="secondary" className="text-xs">
                    {item.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {detail.snapshots.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" style={{ color: "#277493" }} />
              <h3 className="text-base font-semibold">Quality Snapshots</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {detail.snapshots.map((snapshot, idx) => (
                <div key={idx} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-medium text-sm">{snapshot.periodLabel || `Period ${idx + 1}`}</span>
                    <span className={`text-sm font-bold ${getScoreColor(snapshot.overallScore || 0)}`}>
                      {snapshot.overallScore || 0}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Completeness:</span>
                      <div className="font-medium">{snapshot.completenessScore || 0}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Diagnosis:</span>
                      <div className="font-medium">{snapshot.diagnosisSupportScore || 0}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Coding:</span>
                      <div className="font-medium">{snapshot.codingComplianceScore || 0}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ProviderQuality() {
  const { isMobileLayout } = usePlatform();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  return (
    <div className={`space-y-6 ${isMobileLayout ? "pb-20" : ""}`}>
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-provider-quality-title">
          Provider Quality Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Longitudinal provider quality metrics and performance trends
        </p>
      </div>

      {selectedProviderId ? (
        <DetailView providerId={selectedProviderId} onBack={() => setSelectedProviderId(null)} />
      ) : (
        <SummaryView onSelectProvider={setSelectedProviderId} />
      )}
    </div>
  );
}
