import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stethoscope, LogIn } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const roleOptions = [
  { value: "np", label: "Nurse Practitioner" },
  { value: "supervisor", label: "Clinical Supervisor" },
  { value: "care_coordinator", label: "Care Coordinator" },
  { value: "admin", label: "Administrator" },
  { value: "compliance", label: "Compliance" },
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
              ForEachHealth
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

        <p className="text-center text-xs text-muted-foreground">
          HIPAA-compliant clinical platform. All access is monitored and audited.
        </p>
      </div>
    </div>
  );
}
