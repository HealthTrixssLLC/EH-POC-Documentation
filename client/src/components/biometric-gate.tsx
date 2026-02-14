import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fingerprint, Stethoscope, RefreshCw } from "lucide-react";
import { useBiometricAuth } from "@/hooks/use-biometric-auth";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export function BiometricGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  const { data: securitySettings } = useQuery<{
    biometricRequired: boolean;
  }>({
    queryKey: ["/api/security-settings"],
    enabled: isAuthenticated,
    staleTime: 60000,
  });

  const biometricEnabled = securitySettings?.biometricRequired ?? false;
  const { isAvailable, isVerified, isChecking, error, authenticate } = useBiometricAuth(biometricEnabled);

  useEffect(() => {
    if (isAuthenticated && biometricEnabled && isAvailable && !isVerified) {
      authenticate();
    }
  }, [isAuthenticated, biometricEnabled, isAvailable, isVerified]);

  if (!isAuthenticated || !biometricEnabled || isVerified || !isAvailable) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-md" style={{ backgroundColor: "#2E456B" }}>
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Biometric Required</h1>
          <p className="text-sm text-muted-foreground text-center">
            Verify your identity with Face ID or Touch ID to continue
          </p>
        </div>

        <Card>
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <Fingerprint className="w-16 h-16" style={{ color: "#277493" }} />
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button
              onClick={authenticate}
              disabled={isChecking}
              className="w-full"
              data-testid="button-biometric-verify"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Verify Identity
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
