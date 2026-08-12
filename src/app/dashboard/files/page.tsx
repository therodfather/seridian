"use client";

import { FileManager } from "@/components/files/FileManager";
import { DashboardGuard } from "@/components/dashboard/DashboardGuard";

export default function FilesPage() {
  return (
    <DashboardGuard>
      <FileManager />
    </DashboardGuard>
  );
}
