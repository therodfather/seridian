"use client";

import { createElement, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc } from "convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@bytecats/ui-kit";
import {
  type Activity,
  type ActivityType,
  groupByDate,
  timeAgo,
  getActivityIcon,
  getActivityColor,
} from "@/lib/activities";

const MAX_ITEMS = 20;

// ---------------------------------------------------------------------------
// Activity builders — derive Activity objects from Convex entities
// ---------------------------------------------------------------------------

function buildActivities(
  issues: Doc<"issues">[] | undefined,
  deals: Doc<"deals">[] | undefined,
  bookings: Doc<"bookings">[] | undefined,
  proposals: Doc<"proposals">[] | undefined,
  clients: Doc<"clients">[] | undefined,
): Activity[] {
  const activities: Activity[] = [];

  if (issues) {
    for (const issue of issues) {
      const ts = issue.linearUpdatedAt
        ? new Date(issue.linearUpdatedAt).getTime()
        : issue.linearCreatedAt
          ? new Date(issue.linearCreatedAt).getTime()
          : 0;

      if (ts === 0) continue;

      // Treat done issues as updates, everything else as creates
      const type: ActivityType =
        issue.status === "done" ? "issue_updated" : "issue_created";

      activities.push({
        id: `issue-${issue._id}`,
        type,
        title: issue.title,
        description:
          issue.status === "done"
            ? `Marked as done`
            : `Status: ${issue.status.replace("_", " ")}`,
        timestamp: ts,
        user: issue.assignee,
        entityId: issue._id,
        entityType: "issue",
      });
    }
  }

  if (deals) {
    for (const deal of deals) {
      activities.push({
        id: `deal-${deal._id}`,
        type: deal.stage === "lead" ? "deal_created" : "deal_stage_changed",
        title: deal.name,
        description:
          deal.stage === "lead"
            ? `New deal — $${deal.value.toLocaleString()}`
            : `Stage → ${deal.stage.replace("_", " ")}`,
        timestamp: deal._creationTime,
        entityId: deal._id,
        entityType: "deal",
      });
    }
  }

  if (bookings) {
    for (const booking of bookings) {
      activities.push({
        id: `booking-${booking._id}`,
        type: "booking_created",
        title: booking.title,
        description: `${booking.type} — ${new Date(booking.startTime).toLocaleDateString()}`,
        timestamp: new Date(booking.startTime).getTime(),
        entityId: booking._id,
        entityType: "booking",
      });
    }
  }

  if (proposals) {
    for (const proposal of proposals) {
      if (proposal.status === "sent" && proposal.sentAt) {
        activities.push({
          id: `proposal-${proposal._id}`,
          type: "proposal_sent",
          title: proposal.title,
          description: proposal.value
            ? `Sent — $${proposal.value.toLocaleString()}`
            : "Sent",
          timestamp: proposal.sentAt,
          user: proposal.createdBy,
          entityId: proposal._id,
          entityType: "proposal",
        });
      } else {
        activities.push({
          id: `proposal-${proposal._id}`,
          type: "proposal_created",
          title: proposal.title,
          description: `Status: ${proposal.status}`,
          timestamp: proposal._creationTime,
          user: proposal.createdBy,
          entityId: proposal._id,
          entityType: "proposal",
        });
      }
    }
  }

  if (clients) {
    for (const client of clients) {
      activities.push({
        id: `client-${client._id}`,
        type: "client_added",
        title: client.name,
        description: client.company,
        timestamp: client._creationTime,
        entityId: client._id,
        entityType: "client",
      });
    }
  }

  // Sort descending by timestamp, cap at MAX_ITEMS
  activities.sort((a, b) => b.timestamp - a.timestamp);
  return activities.slice(0, MAX_ITEMS);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ActivityItem({ activity }: { activity: Activity }) {
  return (
    <div className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03]">
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${getActivityColor(activity.type)}`}
        aria-hidden="true"
      >
        {createElement(getActivityIcon(activity.type), { className: "w-4 h-4" })}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-200 truncate">
          {activity.title}
        </p>
        {activity.description && (
          <p className="text-xs text-slate-500 truncate">{activity.description}</p>
        )}
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
          <time dateTime={new Date(activity.timestamp).toISOString()}>
            {timeAgo(activity.timestamp)}
          </time>
          {activity.user && (
            <>
              <span className="text-white/10">·</span>
              <span>{activity.user}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-1 px-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-2.5">
          <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <span className="text-2xl text-slate-600" aria-hidden="true">
        ○
      </span>
      <p className="mt-2 text-sm text-slate-500">No recent activity</p>
      <p className="text-xs text-slate-600">
        Activity will appear here as things happen.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ActivityFeed() {
  const issues = useQuery(api.issues.list, {});
  const deals = useQuery(api.deals.list, {});
  const bookings = useQuery(api.bookings.list, {});
  const proposals = useQuery(api.proposals.list, {});
  const clients = useQuery(api.clients.list, {});

  const loading =
    issues === undefined ||
    deals === undefined ||
    bookings === undefined ||
    proposals === undefined ||
    clients === undefined;

  const activities = useMemo(
    () => buildActivities(issues, deals, bookings, proposals, clients),
    [issues, deals, bookings, proposals, clients],
  );

  const grouped = useMemo(() => groupByDate(activities), [activities]);

  return (
    <Card className="rounded-xl border-white/[0.06] bg-[#0c1222]/80">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold text-slate-300">
          Recent Activity
        </CardTitle>
        {!loading && activities.length > 0 && (
          <Link
            href="/dashboard/issues"
            className="text-xs text-seridian-400 transition-colors hover:text-seridian-300"
          >
            View all
          </Link>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <FeedSkeleton />
        ) : activities.length === 0 ? (
          <EmptyFeed />
        ) : (
          <div className="space-y-4">
            {Array.from(grouped.entries()).map(([label, items]) => (
              <section key={label}>
                <h3 className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-slate-600">
                  {label}
                </h3>
                <div className="space-y-0.5">
                  {items.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
