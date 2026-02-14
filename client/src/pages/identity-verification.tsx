import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePlatform } from "@/hooks/use-platform";

const verificationMethods = [
  { value: "photo_id", label: "Photo ID (Driver's License, Passport)" },
  { value: "dob_verification", label: "Date of Birth Verification" },
  { value: "insurance_card", label: "Insurance Card Match" },
  { value: "verbal_confirmation", label: "Verbal Confirmation" },
];

export default function IdentityVerification() {
  const { isMobileLayout } = usePlatform();
  const [, params] = useRoute("/visits/:id/intake/identity");
  const visitId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [method, setMethod] = useState("");

  const { data: bundle, isLoading } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "bundle"],
    enabled: !!visitId,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/visits/${visitId}/verify-identity`, { method });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "bundle"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "overview"] });
      toast({ title: "Identity verified successfully" });
      setLocation(`/visits/${visitId}/intake`);
    },
    onError: (err: any) => {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const visit = bundle?.visit;
  const member = bundle?.member;

  if (visit?.identityVerified) {
    return (
      <div className={`space-y-6 ${isMobileLayout ? "pb-20" : ""}`}>
        {isMobileLayout ? (
          <h1 className="text-lg font-bold pt-2">Identity Verification</h1>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <Link href={`/visits/${visitId}/intake`}>
              <Button variant="ghost" size="sm" data-testid="button-back-intake">
                <ChevronLeft className="w-4 h-4 mr-1" /> Intake
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Identity Verification</h1>
          </div>
        )}

        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle2 className="w-12 h-12 mb-3" style={{ color: "#277493" }} />
            <h2 className="text-lg font-semibold mb-1" data-testid="text-identity-verified">Identity Verified</h2>
            <p className="text-sm text-muted-foreground">
              {member?.firstName} {member?.lastName} - verified via {visit.identityMethod?.replace(/_/g, " ")}
            </p>
            <Link href={`/visits/${visitId}/intake`}>
              <Button variant="outline" className="mt-4" data-testid="button-return-intake">
                Return to Intake
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isMobileLayout ? "pb-20" : ""}`}>
      {isMobileLayout ? (
        <h1 className="text-lg font-bold pt-2">Identity Verification</h1>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/visits/${visitId}/intake`}>
            <Button variant="ghost" size="sm" data-testid="button-back-intake">
              <ChevronLeft className="w-4 h-4 mr-1" /> Intake
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Identity Verification</h1>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" style={{ color: "#2E456B" }} />
            <h2 className="text-base font-semibold">Verify Patient Identity</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Confirm the identity of {member?.firstName} {member?.lastName} before proceeding with the visit.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {member && (
            <div className="p-3 rounded-md border space-y-1">
              <div className="text-sm"><strong>Name:</strong> {member.firstName} {member.lastName}</div>
              <div className="text-sm"><strong>DOB:</strong> {member.dob}</div>
              <div className="text-sm"><strong>Member ID:</strong> {member.memberId}</div>
              {member.address && (
                <div className="text-sm"><strong>Address:</strong> {member.address}, {member.city}, {member.state} {member.zip}</div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Verification Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger data-testid="select-verification-method">
                <SelectValue placeholder="Select verification method" />
              </SelectTrigger>
              <SelectContent>
                {verificationMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => mutation.mutate()}
            disabled={!method || mutation.isPending}
            className="w-full"
            data-testid="button-confirm-identity"
          >
            {mutation.isPending ? "Verifying..." : "Confirm Identity"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
