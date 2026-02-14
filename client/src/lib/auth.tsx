import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  sessionLocked: boolean;
  unlockSession: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  sessionLocked: false,
  unlockSession: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("feh_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [sessionLocked, setSessionLocked] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const { data: securitySettings } = useQuery<{
    sessionTimeoutMinutes: number;
  }>({
    queryKey: ["/api/security-settings"],
    enabled: !!user,
    staleTime: 60000,
  });

  const login = useCallback((u: User) => {
    setUser(u);
    setSessionLocked(false);
    lastActivityRef.current = Date.now();
    localStorage.setItem("feh_user", JSON.stringify(u));
    localStorage.setItem("feh_last_activity", String(Date.now()));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setSessionLocked(false);
    localStorage.removeItem("feh_user");
    localStorage.removeItem("feh_last_activity");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const unlockSession = useCallback(() => {
    setSessionLocked(false);
    lastActivityRef.current = Date.now();
    localStorage.setItem("feh_last_activity", String(Date.now()));
  }, []);

  useEffect(() => {
    if (!user || !securitySettings?.sessionTimeoutMinutes) return;

    const timeoutMs = securitySettings.sessionTimeoutMinutes * 60 * 1000;

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      localStorage.setItem("feh_last_activity", String(Date.now()));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setSessionLocked(true);
      }, timeoutMs);
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    const storedLastActivity = localStorage.getItem("feh_last_activity");
    if (storedLastActivity) {
      const elapsed = Date.now() - parseInt(storedLastActivity);
      if (elapsed > timeoutMs) {
        setSessionLocked(true);
      }
    }

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user, securitySettings?.sessionTimeoutMinutes]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, sessionLocked, unlockSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
