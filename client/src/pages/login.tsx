import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stethoscope, LogIn, UserCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password, role });
      const user = await res.json();
      login(user);
      setLocation("/");
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

        <Card>
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold text-center" data-testid="text-login-heading">
              Sign In
            </h2>
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

        <p className="text-center text-xs text-muted-foreground">
          HIPAA-compliant clinical platform. All access is monitored and audited.
        </p>
      </div>
    </div>
  );
}
