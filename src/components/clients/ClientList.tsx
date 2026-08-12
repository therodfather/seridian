"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Badge, Button, Skeleton } from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/EmptyState";

type Client = Doc<"clients">;

interface ClientListProps {
  onEdit?: (clientId: Id<"clients">) => void;
  onAdd?: () => void;
}

function ClientRow({
  client,
  issueCount,
  onEdit,
}: {
  client: Client;
  issueCount: number;
  onEdit?: (clientId: Id<"clients">) => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-lg border border-white/[0.06] bg-[#0c1222]/80 px-4 py-3",
        "transition-all duration-150",
        "hover:border-seridian-500/20 hover:bg-[#0c1222]",
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-seridian-500/10 text-sm font-semibold text-seridian-400 uppercase">
        {client.name.charAt(0) || "?"}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <a
            href={`/dashboard/clients/${client._id}`}
            className="truncate text-sm font-medium text-slate-200 hover:text-white transition-colors"
          >
            {client.name}
          </a>
          <Badge
            variant={client.status === "active" ? "default" : "secondary"}
            className={cn(
              "shrink-0 text-[10px] px-1.5 py-0",
              client.status === "active"
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-slate-500/10 text-slate-500 border-slate-500/20",
            )}
          >
            {client.status}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {client.company || "No company"}
          {client.industry && (
            <span className="ml-1.5 text-slate-600">· {client.industry}</span>
          )}
        </p>
      </div>

      <div className="hidden shrink-0 items-center gap-4 sm:flex">
        <div className="text-right">
          <p className="text-xs text-slate-500">{issueCount}</p>
          <p className="text-[10px] text-slate-600">issues</p>
        </div>

        {client.email && (
          <div className="hidden text-right md:block">
            <p className="truncate max-w-[160px] text-xs text-slate-500">
              {client.email}
            </p>
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-slate-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          onClick={() => onEdit?.(client._id)}
        >
          Edit
        </Button>
      </div>
    </div>
  );
}

export function ClientList({ onEdit, onAdd }: ClientListProps) {
  const clients = useQuery(api.clients.list, {});
  const issues = useQuery(api.issues.list, {});

  const issueCountByClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const issue of issues ?? []) {
      if (issue.clientId) {
        map.set(issue.clientId, (map.get(issue.clientId) ?? 0) + 1);
      }
    }
    return map;
  }, [issues]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Clients</h2>
          <p className="text-sm text-slate-500">
            {clients === undefined
              ? "Loading..."
              : `${clients.length} client${clients.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button type="button" size="sm" onClick={onAdd} className="self-start">
          + Add Client
        </Button>
      </div>

      {clients === undefined ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[60px] rounded-lg" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="Add your first client to unlock deals, proposals, and files."
          action={
            <Button type="button" size="sm" onClick={onAdd}>
              + Add Client
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {clients.map((client) => (
            <ClientRow
              key={client._id}
              client={client}
              issueCount={issueCountByClient.get(client._id) ?? 0}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
