import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Stethoscope, LogIn, UserCircle, ShieldCheck, ArrowLeft, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const roleOptions = [
  { value: "np", label: "Nurse Practitioner" },
  { value: "supervisor", label: "Clinical Supervisor" },
  { value: "care_coordinator", label: "Care Coordinator" },
  { value: "admin", label: "Administrator" },
  { value: "compliance", label: "Compliance" },
];

const demoAccounts = [
  { username: "sarah.np", password: "password", role: "np", label: "Nurse Practitioner", name: "Sarah Johnson, NP" },
  { username: "dr.williams", password: "password", role: "supervisor", label: "Supervisor", name: "Dr. Lisa Williams" },
  { username: "emma.coord", password: "password", role: "care_coordinator", label: "Care Coordinator", name: "Emma Davis" },
  { username: "admin", password: "password", role: "admin", label: "Admin", name: "System Admin" },
  { username: "compliance", password: "password", role: "compliance", label: "Compliance", name: "Compliance Officer" },
];

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("np");
  const [loading, setLoading] = useState(false);
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaUserId, setMfaUserId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [resending, setResending] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: securitySettings } = useQuery<{
    mfaRequired: boolean;
    biometricRequired: boolean;
    sessionTimeoutMinutes: number;
  }>({
    queryKey: ["/api/security-settings"],
    staleTime: 60000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password, role });
      const data = await res.json();

      if (data.mfaRequired) {
        setMfaStep(true);
        setMfaUserId(data.userId);
        setMaskedPhone(data.maskedPhone || "");
        toast({ title: "Verification code sent", description: data.message });
      } else {
        login(data);
        setLocation("/");
      }
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (mfaCode.length !== 6) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/verify-mfa", {
        userId: mfaUserId,
        code: mfaCode,
      });
      const user = await res.json();
      login(user);
      setLocation("/");
    } catch (err: any) {
      toast({
        title: "Verification failed",
        description: err.message || "Invalid code",
        variant: "destructive",
      });
      setMfaCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      const res = await apiRequest("POST", "/api/auth/resend-mfa", {
        userId: mfaUserId,
      });
      const data = await res.json();
      toast({ title: "New code sent", description: data.message });
      setMfaCode("");
    } catch (err: any) {
      toast({
        title: "Failed to resend",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const handleBackToLogin = () => {
    setMfaStep(false);
    setMfaUserId("");
    setMfaCode("");
    setMaskedPhone("");
  };

  useEffect(() => {
    if (mfaCode.length === 6) {
      handleVerifyMfa();
    }
  }, [mfaCode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-md" style={{ backgroundColor: "#2E456B" }}>
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-app-title">
              Easy Health
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              In-Home Clinical Visit Platform
            </p>
          </div>
        </div>

        {!mfaStep ? (
          <>
            <Card>
              <CardHeader className="pb-4">
                <h2 className="text-lg font-semibold text-center" data-testid="text-login-heading">
                  Sign In
                </h2>
                {securitySettings?.mfaRequired && (
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#277493" }} />
                    <span className="text-xs" style={{ color: "#277493" }}>MFA verification enabled</span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      required
                      data-testid="input-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      data-testid="input-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((r) => (
                          <SelectItem key={r.value} value={r.value} data-testid={`option-role-${r.value}`}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
                    <LogIn className="w-4 h-4 mr-2" />
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <h3 className="text-sm font-semibold text-center text-muted-foreground">Demo Accounts</h3>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-2">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.username}
                      type="button"
                      onClick={() => {
                        setUsername(account.username);
                        setPassword(account.password);
                        setRole(account.role);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-md text-left text-sm hover-elevate active-elevate-2 border border-transparent"
                      data-testid={`button-demo-${account.role}`}
                    >
                      <UserCircle className="w-5 h-5 shrink-0 text-muted-foreground" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{account.name}</span>
                        <span className="text-xs text-muted-foreground">{account.label} &middot; {account.username}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full" style={{ backgroundColor: "#27749315" }}>
                  <ShieldCheck className="w-6 h-6" style={{ color: "#277493" }} />
                </div>
                <h2 className="text-lg font-semibold text-center" data-testid="text-mfa-heading">
                  Verify Your Identity
                </h2>
                <p className="text-sm text-muted-foreground text-center">
                  Enter the 6-digit verification code sent to {maskedPhone || "your phone"}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={mfaCode}
                  onChange={setMfaCode}
                  disabled={loading}
                  data-testid="input-mfa-code"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <span className="text-muted-foreground mx-1">-</span>
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                className="w-full"
                onClick={handleVerifyMfa}
                disabled={loading || mfaCode.length !== 6}
                data-testid="button-verify-mfa"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                {loading ? "Verifying..." : "Verify Code"}
              </Button>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToLogin}
                  data-testid="button-back-login"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={resending}
                  data-testid="button-resend-mfa"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${resending ? "animate-spin" : ""}`} />
                  {resending ? "Sending..." : "Resend Code"}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                For this demo, the verification code is logged to the server console.
              </p>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          HIPAA-compliant clinical platform. All access is monitored and audited.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/product" className="text-xs text-muted-foreground underline hover-elevate" data-testid="link-product">
            About Easy Health
          </Link>
          <span className="text-muted-foreground text-xs">|</span>
          <Link href="/privacy" className="text-xs text-muted-foreground underline hover-elevate" data-testid="link-privacy">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
