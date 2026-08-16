/**
 * Dashboard composition kit — import from here.
 * @example import { PageShell, EmptyState, FlowSteps } from "@/components/dashboard/kit";
 */
export { PageShell, type PageShellProps } from "./PageShell";
export { PageSection, type PageSectionProps } from "./PageSection";
export { EmptyState, type EmptyStateProps } from "./EmptyState";
export {
  LoadingBlock,
  MetricCardsSkeleton,
  KanbanSkeleton,
  type LoadingBlockProps,
} from "./LoadingBlock";
export { MetricCards, type MetricCardItem, type MetricCardsProps } from "./MetricCards";
export { Toolbar, type ToolbarProps } from "./Toolbar";
export {
  FlowSteps,
  PageFlow,
  type FlowStepItem,
  type FlowStepsProps,
  type PageFlowProps,
} from "./FlowSteps";
export { StatusBadge, type StatusBadgeProps, type StatusBadgeTone } from "./StatusBadge";
export { BackLink, type BackLinkProps } from "./BackLink";
