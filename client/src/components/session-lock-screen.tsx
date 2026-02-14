import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, LogIn, LogOut, Stethoscope } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function SessionLockScreen() {
  const { user, unlockSession, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/unlock", {
        username: user.username,
        password,
      });
      unlockSession();
    } catch (err: any) {
      toast({
        title: "Unlock failed",
        description: "Incorrect password",
        variant: "destructive",
      });
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-md" style={{ backgroundColor: "#2E456B" }}>
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Session Locked</h1>
          <p className="text-sm text-muted-foreground text-center">
            Your session was locked due to inactivity
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">{user?.fullName || user?.username}</span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unlock-password">Password</Label>
                <Input
                  id="unlock-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password to unlock"
                  autoFocus
                  required
                  data-testid="input-unlock-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="button-unlock">
                <LogIn className="w-4 h-4 mr-2" />
                {loading ? "Unlocking..." : "Unlock Session"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            data-testid="button-logout-lock"
          >
            <LogOut className="w-4 h-4 mr-1" /> Sign out instead
          </Button>
        </div>
      </div>
    </div>
  );
}
