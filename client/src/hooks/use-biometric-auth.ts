import { useState, useCallback, useEffect } from "react";

interface BiometricAuthResult {
  isAvailable: boolean;
  isVerified: boolean;
  isChecking: boolean;
  error: string | null;
  authenticate: () => Promise<boolean>;
}

function getCapacitor(): any {
  return (window as any).Capacitor;
}

function getNativeBiometric(): any {
  return (window as any).Plugins?.NativeBiometric;
}

export function useBiometricAuth(enabled: boolean): BiometricAuthResult {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isVerified, setIsVerified] = useState(!enabled);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsVerified(true);
      return;
    }

    const checkAvailability = async () => {
      try {
        const Capacitor = getCapacitor();
        if (Capacitor?.isNativePlatform?.()) {
          const NativeBiometric = getNativeBiometric();
          if (NativeBiometric) {
            const result = await NativeBiometric.isAvailable();
            setIsAvailable(result.isAvailable);
            return;
          }
        }
        setIsAvailable(false);
        setIsVerified(true);
      } catch {
        setIsAvailable(false);
        setIsVerified(true);
      }
    };

    checkAvailability();
  }, [enabled]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isAvailable || !enabled) {
      setIsVerified(true);
      return true;
    }

    setIsChecking(true);
    setError(null);
    try {
      const NativeBiometric = getNativeBiometric();
      if (!NativeBiometric) {
        setIsVerified(true);
        setIsChecking(false);
        return true;
      }
      await NativeBiometric.verifyIdentity({
        reason: "Authenticate to access Easy Health",
        title: "Easy Health",
        subtitle: "Verify your identity",
        description: "Use Face ID or Touch ID to continue",
      });
      setIsVerified(true);
      setIsChecking(false);
      return true;
    } catch (err: any) {
      setError(err?.message || "Biometric authentication failed");
      setIsChecking(false);
      return false;
    }
  }, [isAvailable, enabled]);

  return { isAvailable, isVerified, isChecking, error, authenticate };
}
