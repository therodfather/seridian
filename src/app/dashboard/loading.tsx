import { PageSkeleton } from "@/components/dashboard/PageSkeleton";

export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <PageSkeleton rows={4} />
    </div>
  );
}
