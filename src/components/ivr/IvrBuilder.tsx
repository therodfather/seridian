"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@bytecats/ui-kit";
import { ArrowLeft, PhoneCall, Save, Upload } from "lucide-react";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { AddNodeMenu, IvrNodeInspector } from "./IvrNodeInspector";
import {
  createBlankNode,
  NODE_TYPE_LABELS,
  type IvrGraph,
  type IvrNode,
  type IvrNodeType,
} from "./ivrTypes";

interface IvrBuilderProps {
  flowId: Id<"ivrFlows">;
}

export function IvrBuilder({ flowId }: IvrBuilderProps) {
  const { user } = useDashboardAuth();
  const currentUserId = user?.pubkey ?? "";
  const flow = useQuery(
    api.ivr.get,
    currentUserId ? { currentUserId, flowId } : "skip",
  );
  const callLogs = useQuery(
    api.ivr.listCallLogs,
    currentUserId ? { currentUserId, flowId, limit: 15 } : "skip",
  );
  const saveDraft = useMutation(api.ivr.saveDraft);
  const publish = useMutation(api.ivr.publish);
  const assignNumber = useAction(api.telnyx.assignNumber);
  const listNumbers = useAction(api.telnyx.listPhoneNumbers);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [graph, setGraph] = useState<IvrGraph | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [numbers, setNumbers] = useState<
    Array<{ id: string; phoneNumber: string }>
  >([]);
  const [pickedNumberId, setPickedNumberId] = useState<string>("");

  useEffect(() => {
    if (!flow) return;
    setName(flow.name);
    setDescription(flow.description ?? "");
    setGraph(flow.draftGraph as IvrGraph);
    setSelectedId(flow.draftGraph.entryNodeId);
    setDirty(false);
  }, [flow]);

  const selected = graph?.nodes.find((n) => n.id === selectedId) ?? null;

  const updateGraph = (next: IvrGraph) => {
    setGraph(next);
    setDirty(true);
  };

  const handleNodeChange = (node: IvrNode) => {
    if (!graph) return;
    updateGraph({
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === node.id ? node : n)),
    });
  };

  const handleAddNode = (type: IvrNodeType) => {
    if (!graph) return;
    const node = createBlankNode(type);
    updateGraph({ ...graph, nodes: [...graph.nodes, node] });
    setSelectedId(node.id);
  };

  const handleDeleteNode = () => {
    if (!graph || !selected) return;
    if (graph.nodes.length <= 1) {
      setMessage("Keep at least one node");
      return;
    }
    const nextNodes = graph.nodes
      .filter((n) => n.id !== selected.id)
      .map((n) => ({
        ...n,
        edges: n.edges.filter((e) => e.targetNodeId !== selected.id),
      }));
    const entryNodeId =
      graph.entryNodeId === selected.id
        ? nextNodes[0]!.id
        : graph.entryNodeId;
    updateGraph({ entryNodeId, nodes: nextNodes });
    setSelectedId(entryNodeId);
  };

  const handleSave = async () => {
    if (!currentUserId || !graph) return;
    setBusy("save");
    setMessage(null);
    try {
      await saveDraft({
        currentUserId,
        flowId,
        name,
        description,
        draftGraph: graph,
      });
      setDirty(false);
      setMessage("Draft saved");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  };

  const handlePublish = async () => {
    if (!currentUserId || !graph) return;
    setBusy("publish");
    setMessage(null);
    try {
      if (dirty) {
        await saveDraft({
          currentUserId,
          flowId,
          name,
          description,
          draftGraph: graph,
        });
        setDirty(false);
      }
      const result = await publish({ currentUserId, flowId });
      setMessage(`Published v${result.version}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  };

  const handleLoadNumbers = async () => {
    if (!currentUserId) return;
    setBusy("numbers");
    setMessage(null);
    try {
      const list = await listNumbers({ currentUserId });
      setNumbers(list);
      if (list[0]) setPickedNumberId(list[0].id);
      setMessage(
        list.length
          ? `Loaded ${list.length} Telnyx number(s)`
          : "No numbers on this Telnyx account",
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not list numbers");
    } finally {
      setBusy(null);
    }
  };

  const handleAssign = async () => {
    if (!currentUserId || !pickedNumberId) return;
    const picked = numbers.find((n) => n.id === pickedNumberId);
    if (!picked) return;
    setBusy("assign");
    setMessage(null);
    try {
      await assignNumber({
        currentUserId,
        flowId,
        phoneNumberId: picked.id,
        phoneNumber: picked.phoneNumber,
      });
      setMessage(`Assigned ${picked.phoneNumber}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setBusy(null);
    }
  };

  if (flow === undefined) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading IVR builder">
        <Skeleton className="h-10 w-64 bg-white/[0.04]" />
        <Skeleton className="h-96 w-full rounded-xl bg-white/[0.04]" />
      </div>
    );
  }

  if (flow === null || !graph) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-400">Flow not found.</p>
        <Button asChild variant="outline" className="border-white/10">
          <Link href={ROUTES.dashboard.ivr}>Back to IVR list</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <Link
            href={ROUTES.dashboard.ivr}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All flows
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <PhoneCall className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-white">
                IVR builder
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Edit the tree, save a draft, publish, then assign a Telnyx number.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              className={
                flow.status === "published"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/[0.04] text-slate-400"
              }
            >
              {flow.status === "published"
                ? `Live v${flow.publishedVersion}`
                : "Draft only"}
            </Badge>
            {dirty && (
              <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-300">
                Unsaved changes
              </Badge>
            )}
            {flow.phoneNumber && (
              <Badge className="border-cyan-500/20 bg-cyan-500/10 font-mono text-cyan-300">
                {flow.phoneNumber}
                {flow.numberActive ? " · active" : ""}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/10"
            disabled={!!busy}
            onClick={() => void handleSave()}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {busy === "save" ? "Saving…" : "Save draft"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
            disabled={!!busy}
            onClick={() => void handlePublish()}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {busy === "publish" ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-300"
        >
          {message}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ivr-flow-name">Name</Label>
          <Input
            id="ivr-flow-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            className="bg-[#070b14] border-white/10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ivr-flow-desc">Description</Label>
          <Input
            id="ivr-flow-desc"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setDirty(true);
            }}
            className="bg-[#070b14] border-white/10"
          />
        </div>
      </div>

      <section
        aria-label="Assign Telnyx number"
        className="space-y-3 rounded-xl border border-white/[0.08] bg-[#070b14]/60 p-4"
      >
        <h2 className="text-sm font-semibold text-white">Assign number</h2>
        <p className="text-xs text-slate-500">
          Publish first, then wire a Telnyx DID to this flow&apos;s Call Control app
          (webhook: <code className="text-slate-400">/telnyx/webhook</code>).
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/10"
            disabled={!!busy}
            onClick={() => void handleLoadNumbers()}
          >
            {busy === "numbers" ? "Loading…" : "Load Telnyx numbers"}
          </Button>
          {numbers.length > 0 && (
            <>
              <Select value={pickedNumberId} onValueChange={setPickedNumberId}>
                <SelectTrigger className="w-56 bg-[#0c1222] border-white/10">
                  <SelectValue placeholder="Pick a number" />
                </SelectTrigger>
                <SelectContent>
                  {numbers.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.phoneNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                disabled={!!busy || !pickedNumberId}
                onClick={() => void handleAssign()}
              >
                {busy === "assign" ? "Assigning…" : "Assign & activate"}
              </Button>
            </>
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section
          aria-label="IVR node tree"
          className="space-y-4 rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Flow tree</h2>
            <p className="text-[11px] text-slate-600">
              Entry:{" "}
              <span className="font-mono text-slate-400">{graph.entryNodeId}</span>
            </p>
          </div>
          <AddNodeMenu onAdd={handleAddNode} />
          <ul className="space-y-2" role="listbox" aria-label="Nodes">
            {graph.nodes.map((node) => {
              const isSelected = node.id === selectedId;
              const isEntry = node.id === graph.entryNodeId;
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => setSelectedId(node.id)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                      isSelected
                        ? "border-cyan-500/40 bg-cyan-500/10"
                        : "border-white/[0.06] bg-[#070b14]/80 hover:border-white/15",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white">
                        {node.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">
                        {NODE_TYPE_LABELS[node.type]}
                        {isEntry ? " · entry" : ""}
                      </span>
                    </div>
                    {node.edges.length > 0 && (
                      <p className="mt-1 truncate text-[11px] text-slate-600">
                        {node.edges
                          .map((e) => `${e.key}→${e.targetNodeId}`)
                          .join(" · ")}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-4">
          {selected ? (
            <IvrNodeInspector
              graph={graph}
              node={selected}
              onChange={handleNodeChange}
              onDelete={handleDeleteNode}
              onSetEntry={() =>
                updateGraph({ ...graph, entryNodeId: selected.id })
              }
            />
          ) : (
            <p className="text-xs text-slate-500">Select a node to edit.</p>
          )}
        </aside>
      </div>

      <section aria-label="Recent calls" className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Recent calls</h2>
        {!callLogs ? (
          <Skeleton className="h-24 w-full rounded-xl bg-white/[0.04]" />
        ) : callLogs.length === 0 ? (
          <p className="text-xs text-slate-600">
            No inbound calls logged for this flow yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full min-w-[36rem] text-left text-xs">
              <thead className="border-b border-white/[0.06] bg-[#070b14] text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">From</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Digit</th>
                  <th className="px-3 py-2 font-medium">Node</th>
                </tr>
              </thead>
              <tbody>
                {callLogs.map((log) => (
                  <tr
                    key={log._id}
                    className="border-b border-white/[0.04] text-slate-300"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(log.startedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono">{log.fromNumber}</td>
                    <td className="px-3 py-2">{log.status}</td>
                    <td className="px-3 py-2">{log.digitPressed ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-slate-500">
                      {log.currentNodeId ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
