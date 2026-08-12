"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { LoginScreen } from "@/components/auth/LoginScreen";

export interface DashboardUser {
  pubkey: string;
  name: string;
}

interface DashboardAuthValue {
  user: DashboardUser | null;
  loading: boolean;
  handleLogin: (pubkey: string, name: string) => void;
  handleLogout: () => void;
}

const DashboardAuthContext = createContext<DashboardAuthValue | null>(null);

function getStoredUser(): DashboardUser | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("seridian_user");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as DashboardUser;
  } catch {
    return null;
  }
}

export function DashboardAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredUser());
    setLoading(false);
  }, []);

  const handleLogin = useCallback((pubkey: string, name: string) => {
    localStorage.setItem("seridian_user", JSON.stringify({ pubkey, name }));
    setUser({ pubkey, name });
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("seridian_user");
    setUser(null);
  }, []);

  return (
    <DashboardAuthContext.Provider
      value={{ user, loading, handleLogin, handleLogout }}
    >
      {children}
    </DashboardAuthContext.Provider>
  );
}

export function useDashboardAuth() {
  const ctx = useContext(DashboardAuthContext);
  if (!ctx) {
    throw new Error("useDashboardAuth must be used within DashboardAuthProvider");
  }
  return ctx;
}

export function DashboardGuard({ children }: { children: ReactNode }) {
  const { user, loading, handleLogin } = useDashboardAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-seridian-500 border-t-transparent" />
          <p className="text-xs text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <>{children}</>;
}
