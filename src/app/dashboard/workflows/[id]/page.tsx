"use client";

import { use } from "react";
import { Id } from "convex/_generated/dataModel";
import { WorkflowBuilder } from "@/components/workflows/WorkflowBuilder";

export default function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <WorkflowBuilder workflowId={id as Id<"workflows">} />;
}
