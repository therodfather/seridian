"use client";

import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@bytecats/ui-kit";
import { Plus, Trash2 } from "lucide-react";
import {
  EDGE_KEYS,
  NODE_TYPE_LABELS,
  type IvrEdgeKey,
  type IvrGraph,
  type IvrNode,
  type IvrNodeType,
} from "./ivrTypes";

interface IvrNodeInspectorProps {
  graph: IvrGraph;
  node: IvrNode;
  onChange: (node: IvrNode) => void;
  onDelete: () => void;
  onSetEntry: () => void;
}

export function IvrNodeInspector({
  graph,
  node,
  onChange,
  onDelete,
  onSetEntry,
}: IvrNodeInspectorProps) {
  const isEntry = graph.entryNodeId === node.id;
  const otherNodes = graph.nodes.filter((n) => n.id !== node.id);

  const patch = (partial: Partial<IvrNode>) => {
    onChange({ ...node, ...partial });
  };

  const handleEdgeKey = (index: number, key: IvrEdgeKey) => {
    const edges = node.edges.map((e, i) => (i === index ? { ...e, key } : e));
    patch({ edges });
  };

  const handleEdgeTarget = (index: number, targetNodeId: string) => {
    const edges = node.edges.map((e, i) =>
      i === index ? { ...e, targetNodeId } : e,
    );
    patch({ edges });
  };

  const handleAddEdge = () => {
    const target = otherNodes[0]?.id ?? node.id;
    patch({
      edges: [...node.edges, { key: "next", targetNodeId: target }],
    });
  };

  const handleRemoveEdge = (index: number) => {
    patch({ edges: node.edges.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4" aria-label="Node inspector">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {NODE_TYPE_LABELS[node.type]}
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-600">{node.id}</p>
        </div>
        <div className="flex gap-2">
          {!isEntry && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-white/10 text-xs"
              onClick={onSetEntry}
            >
              Set entry
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-red-500/20 text-red-300 text-xs"
            onClick={onDelete}
            aria-label="Delete node"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ivr-node-label">Label</Label>
        <Input
          id="ivr-node-label"
          value={node.label}
          onChange={(e) => patch({ label: e.target.value })}
          className="bg-[#070b14] border-white/10"
        />
      </div>

      {(node.type === "speak" ||
        node.type === "gather" ||
        node.type === "voicemail" ||
        node.type === "hangup") && (
        <div className="space-y-2">
          <Label htmlFor="ivr-node-text">Spoken text</Label>
          <Textarea
            id="ivr-node-text"
            value={node.text ?? ""}
            onChange={(e) => patch({ text: e.target.value })}
            rows={3}
            className="bg-[#070b14] border-white/10"
          />
        </div>
      )}

      {(node.type === "speak" || node.type === "gather") && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="ivr-voice">Voice</Label>
            <Select
              value={node.voice ?? "female"}
              onValueChange={(v) => patch({ voice: v })}
            >
              <SelectTrigger id="ivr-voice" className="bg-[#070b14] border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ivr-lang">Language</Label>
            <Input
              id="ivr-lang"
              value={node.language ?? "en-US"}
              onChange={(e) => patch({ language: e.target.value })}
              className="bg-[#070b14] border-white/10"
            />
          </div>
        </div>
      )}

      {node.type === "transfer" && (
        <div className="space-y-2">
          <Label htmlFor="ivr-transfer">Transfer to (E.164)</Label>
          <Input
            id="ivr-transfer"
            value={node.transferTo ?? ""}
            onChange={(e) => patch({ transferTo: e.target.value })}
            placeholder="+15551234567"
            className="bg-[#070b14] border-white/10 font-mono text-xs"
          />
        </div>
      )}

      {node.type === "voicemail" && (
        <div className="space-y-2">
          <Label htmlFor="ivr-max-rec">Max recording (seconds)</Label>
          <Input
            id="ivr-max-rec"
            type="number"
            min={10}
            max={600}
            value={node.maxRecordingSecs ?? 120}
            onChange={(e) =>
              patch({ maxRecordingSecs: Number(e.target.value) || 120 })
            }
            className="bg-[#070b14] border-white/10"
          />
        </div>
      )}

      {node.type === "hours" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="ivr-tz">Timezone</Label>
            <Input
              id="ivr-tz"
              value={node.timezone ?? "America/New_York"}
              onChange={(e) => patch({ timezone: e.target.value })}
              className="bg-[#070b14] border-white/10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ivr-open">Open hour (0–23)</Label>
              <Input
                id="ivr-open"
                type="number"
                min={0}
                max={23}
                value={node.openHour ?? 9}
                onChange={(e) => patch({ openHour: Number(e.target.value) })}
                className="bg-[#070b14] border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ivr-close">Close hour (0–23)</Label>
              <Input
                id="ivr-close"
                type="number"
                min={0}
                max={23}
                value={node.closeHour ?? 17}
                onChange={(e) => patch({ closeHour: Number(e.target.value) })}
                className="bg-[#070b14] border-white/10"
              />
            </div>
          </div>
        </div>
      )}

      {node.type === "webhook" && (
        <div className="space-y-2">
          <Label htmlFor="ivr-hook">Webhook URL</Label>
          <Input
            id="ivr-hook"
            value={node.webhookUrl ?? ""}
            onChange={(e) => patch({ webhookUrl: e.target.value })}
            placeholder="https://…"
            className="bg-[#070b14] border-white/10"
          />
        </div>
      )}

      <div className="space-y-2 border-t border-white/[0.06] pt-4">
        <div className="flex items-center justify-between">
          <Label>Edges</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/10 text-xs"
            onClick={handleAddEdge}
          >
            <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
            Add edge
          </Button>
        </div>
        {node.edges.length === 0 ? (
          <p className="text-xs text-slate-600">
            No edges — terminal node (or add next / digit routes).
          </p>
        ) : (
          <ul className="space-y-2">
            {node.edges.map((edge, index) => (
              <li
                key={`${edge.key}-${index}`}
                className="grid grid-cols-[5.5rem_1fr_auto] gap-2"
              >
                <Select
                  value={edge.key}
                  onValueChange={(v) => handleEdgeKey(index, v as IvrEdgeKey)}
                >
                  <SelectTrigger
                    aria-label={`Edge ${index + 1} key`}
                    className="bg-[#070b14] border-white/10"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDGE_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={edge.targetNodeId}
                  onValueChange={(v) => handleEdgeTarget(index, v)}
                >
                  <SelectTrigger
                    aria-label={`Edge ${index + 1} target`}
                    className="bg-[#070b14] border-white/10"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {graph.nodes.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-white/10"
                  aria-label={`Remove edge ${index + 1}`}
                  onClick={() => handleRemoveEdge(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function AddNodeMenu({
  onAdd,
}: {
  onAdd: (type: IvrNodeType) => void;
}) {
  const types = Object.keys(NODE_TYPE_LABELS) as IvrNodeType[];
  return (
    <div className="flex flex-wrap gap-2">
      {types.map((type) => (
        <Button
          key={type}
          type="button"
          size="sm"
          variant="outline"
          className="border-white/10 text-xs"
          onClick={() => onAdd(type)}
        >
          <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
          {NODE_TYPE_LABELS[type]}
        </Button>
      ))}
    </div>
  );
}
