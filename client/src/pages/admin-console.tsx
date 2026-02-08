import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList,
  Target,
  Package,
} from "lucide-react";

export default function AdminConsole() {
  const { data: planPacks, isLoading: loadingPacks } = useQuery<any[]>({ queryKey: ["/api/admin/plan-packs"] });
  const { data: assessments, isLoading: loadingAssessments } = useQuery<any[]>({ queryKey: ["/api/admin/assessment-definitions"] });
  const { data: measures, isLoading: loadingMeasures } = useQuery<any[]>({ queryKey: ["/api/admin/measure-definitions"] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-admin-title">Admin Console</h1>
        <p className="text-sm text-muted-foreground mt-1">Configuration management for plan packs, assessments, and measures</p>
      </div>

      <Tabs defaultValue="packs">
        <TabsList>
          <TabsTrigger value="packs" data-testid="tab-plan-packs"><Package className="w-3 h-3 mr-1" /> Plan Packs</TabsTrigger>
          <TabsTrigger value="assessments" data-testid="tab-assessments"><ClipboardList className="w-3 h-3 mr-1" /> Assessments</TabsTrigger>
          <TabsTrigger value="measures" data-testid="tab-measures"><Target className="w-3 h-3 mr-1" /> Measures</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
