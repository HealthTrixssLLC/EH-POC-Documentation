import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("feh_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback((u: User) => {
    setUser(u);
    localStorage.setItem("feh_user", JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("feh_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
