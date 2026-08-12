"use client";

import { useEffect } from "react";
import { EmptyState } from "@/components/dashboard/EmptyState";

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon="!"
      title="Something went wrong"
      description={
        error.digest
          ? `An unexpected error occurred. Reference: ${error.digest}`
          : "An unexpected error occurred on this page."
      }
      action={
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-lg bg-seridian-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-seridian-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seridian-500"
        >
          Try again
        </button>
      }
    />
  );
}
