"use client";

import { BusinessOverview } from "@/components/business/BusinessOverview";
import { DashboardGuard } from "@/components/dashboard/DashboardGuard";

export default function DashboardPage() {
  return (
    <DashboardGuard>
      <BusinessOverview />
    </DashboardGuard>
  );
}
