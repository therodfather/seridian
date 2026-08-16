"use client";

import { use } from "react";
import { Id } from "convex/_generated/dataModel";
import { IvrBuilder } from "@/components/ivr/IvrBuilder";

export default function IvrFlowPage({
  params,
}: {
  params: Promise<{ flowId: string }>;
}) {
  const { flowId } = use(params);
  return <IvrBuilder flowId={flowId as Id<"ivrFlows">} />;
}
