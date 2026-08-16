"use client";

/**
 * IVR builder — guided steps: Name → Tree → Publish → Assign number.
 * Change step labels in IVR_FLOW_STEPS below.
 */
import { useEffect, useState } from "react";
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
import { ChevronLeft, ChevronRight, PhoneCall, Save, Upload } from "lucide-react";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";
import {
  BackLink,
  FlowSteps,
  LoadingBlock,
  PageShell,
  PageSection,
  StatusBadge,
} from "@/components/dashboard/kit";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { AddNodeMenu, IvrNodeInspector } from "./IvrNodeInspector";
import {
  createBlankNode,
  hasReachableExitPath,
  NODE_TYPE_LABELS,
  transferDestinationsReady,
  type IvrGraph,
  type IvrNode,
  type IvrNodeType,
} from "./ivrTypes";

const IVR_FLOW_STEPS = [
  { id: "name", label: "Name", description: "Name the flow and add a short description." },
  { id: "tree", label: "Tree", description: "Build the menu tree callers will hear." },
  { id: "publish", label: "Publish", description: "Save a draft, then publish so Telnyx can run it." },
  { id: "assign", label: "Assign number", description: "Wire a Telnyx DID to this published flow." },
];

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

  const [step, setStep] = useState(0);
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
    if (
      !window.confirm(
        `Delete node "${selected.label}"? Connected edges to it will be removed.`,
      )
    ) {
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
    if (!name.trim()) {
      setMessage("Name is required before saving");
      return;
    }
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
    if (!name.trim()) {
      setMessage("Name the flow before publishing");
      setStep(0);
      return;
    }
    if (!hasReachableExitPath(graph)) {
      setMessage(
        "Add a reachable transfer, hangup, or voicemail path before publishing",
      );
      setStep(1);
      return;
    }
    if (!transferDestinationsReady(graph)) {
      setMessage("Every transfer node needs a destination number");
      setStep(1);
      return;
    }
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
      setStep(3);
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
    if (flow?.status !== "published") {
      setMessage("Publish the flow before assigning a number");
      setStep(2);
      return;
    }
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
    return <LoadingBlock rows={4} withHeader label="Loading IVR builder" />;
  }

  if (flow === null || !graph) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-400">Flow not found.</p>
        <BackLink href={ROUTES.dashboard.ivr} label="Back to IVR list" />
      </div>
    );
  }

  const isFirst = step === 0;
  const isLast = step === IVR_FLOW_STEPS.length - 1;
  const canPublish =
    Boolean(name.trim()) &&
    hasReachableExitPath(graph) &&
    transferDestinationsReady(graph);
  const isPublished = flow.status === "published";

  const tryAdvance = () => {
    if (step === 0 && !name.trim()) {
      setMessage("Name is required before continuing");
      return;
    }
    if (step === 1 && !hasReachableExitPath(graph)) {
      setMessage(
        "Add a reachable transfer, hangup, or voicemail before publish",
      );
      return;
    }
    if (step === 1 && !transferDestinationsReady(graph)) {
      setMessage("Fill transfer destinations before continuing");
      return;
    }
    if (step === 2 && !isPublished) {
      setMessage("Publish before assigning a number");
      return;
    }
    setMessage(null);
    setStep((s) => s + 1);
  };

  const handleStepChange = (next: number) => {
    if (next > step) {
      if (step === 0 && !name.trim()) {
        setMessage("Name is required before continuing");
        return;
      }
      if (next >= 2 && !hasReachableExitPath(graph)) {
        setMessage(
          "Add a reachable transfer, hangup, or voicemail before publish",
        );
        return;
      }
      if (next >= 3 && !isPublished) {
        setMessage("Publish before assigning a number");
        return;
      }
    }
    setMessage(null);
    setStep(next);
  };

  return (
    <PageShell
      title="IVR builder"
      description="Edit the tree, save a draft, publish, then assign a Telnyx number."
      icon={<PhoneCall className="h-5 w-5" aria-hidden="true" />}
      badge={
        <>
          <StatusBadge tone={flow.status === "published" ? "success" : "neutral"}>
            {flow.status === "published"
              ? `Live v${flow.publishedVersion}`
              : "Draft only"}
          </StatusBadge>
          {dirty && <StatusBadge tone="warning">Unsaved changes</StatusBadge>}
          {flow.phoneNumber && (
            <Badge className="border-cyan-500/20 bg-cyan-500/10 font-mono text-cyan-300">
              {flow.phoneNumber}
              {flow.numberActive ? " · active" : ""}
            </Badge>
          )}
        </>
      }
      action={
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
            disabled={!!busy || !canPublish}
            onClick={() => void handlePublish()}
            title={
              canPublish
                ? undefined
                : "Need a name and a reachable transfer, hangup, or voicemail"
            }
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {busy === "publish" ? "Publishing…" : "Publish"}
          </Button>
        </div>
      }
    >
      <BackLink href={ROUTES.dashboard.ivr} label="All flows" />

      <FlowSteps
        steps={IVR_FLOW_STEPS}
        current={step}
        onStepChange={handleStepChange}
      />
      {IVR_FLOW_STEPS[step]?.description && (
        <p className="text-xs text-slate-500">{IVR_FLOW_STEPS[step].description}</p>
      )}

      {message && (
        <p
          role="status"
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-300"
        >
          {message}
        </p>
      )}

      {step === 0 && (
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
      )}

      {step === 1 && (
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
      )}

      {step === 2 && (
        <PageSection
          title="Publish this flow"
          description="Telnyx only runs the published version. Requires a reachable transfer, hangup, or voicemail."
        >
          {!canPublish && (
            <p role="status" className="mb-3 text-xs text-amber-400">
              Finish the tree: name the flow and ensure callers can reach a transfer,
              hangup, or voicemail (with transfer numbers filled in).
            </p>
          )}
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
              disabled={!!busy || !canPublish}
              onClick={() => void handlePublish()}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {busy === "publish" ? "Publishing…" : "Publish"}
            </Button>
          </div>
        </PageSection>
      )}

      {step === 3 && (
        <PageSection
          title="Assign number"
          description={
            <>
              Publish first, then wire a Telnyx DID to this flow&apos;s Call Control app
              (webhook: <code className="text-slate-400">/telnyx/webhook</code>).
            </>
          }
        >
          {!isPublished && (
            <p role="status" className="mb-3 text-xs text-amber-400">
              Publish a version before assigning a number.
            </p>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-white/10"
              disabled={!!busy || !isPublished}
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
                  disabled={!!busy || !pickedNumberId || !isPublished}
                  onClick={() => void handleAssign()}
                >
                  {busy === "assign" ? "Assigning…" : "Assign & activate"}
                </Button>
              </>
            )}
          </div>
        </PageSection>
      )}

      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
        <div>
          {!isFirst && (
            <Button
              type="button"
              variant="ghost"
              className="text-slate-400"
              disabled={!!busy}
              onClick={() => setStep((s) => s - 1)}
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Back
            </Button>
          )}
        </div>
        <div>
          {!isLast && (
            <Button
              type="button"
              className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
              disabled={!!busy}
              onClick={tryAdvance}
            >
              Next <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      <PageSection title="Recent calls">
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
                    <td className="whitespace-nowrap px-3 py-2">
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
      </PageSection>
    </PageShell>
  );
}
