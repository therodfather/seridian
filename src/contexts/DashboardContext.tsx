"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface DashboardState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;
  breadcrumbs: { label: string; href?: string }[];
  setBreadcrumbs: (items: { label: string; href?: string }[]) => void;
}

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; href?: string }[]>([]);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((p) => !p), []);
  const openModal = useCallback((id: string) => setActiveModal(id), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  return (
    <DashboardContext.Provider
      value={{
        sidebarCollapsed,
        toggleSidebar,
        activeModal,
        openModal,
        closeModal,
        breadcrumbs,
        setBreadcrumbs,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
