/**
 * Shared IVR graph validators + helpers. Graphs are intentionally small
 * (capped) so they can live as nested documents on flow drafts / versions.
 */
import { v } from "convex/values";

export const MAX_IVR_NODES = 40;

export const ivrNodeTypeValidator = v.union(
  v.literal("speak"),
  v.literal("gather"),
  v.literal("transfer"),
  v.literal("voicemail"),
  v.literal("hours"),
  v.literal("hangup"),
  v.literal("webhook"),
);

export const ivrEdgeKeyValidator = v.union(
  v.literal("0"),
  v.literal("1"),
  v.literal("2"),
  v.literal("3"),
  v.literal("4"),
  v.literal("5"),
  v.literal("6"),
  v.literal("7"),
  v.literal("8"),
  v.literal("9"),
  v.literal("*"),
  v.literal("#"),
  v.literal("timeout"),
  v.literal("invalid"),
  v.literal("no_input"),
  v.literal("next"),
  v.literal("open"),
  v.literal("closed"),
);

export const ivrEdgeValidator = v.object({
  key: ivrEdgeKeyValidator,
  targetNodeId: v.string(),
});

export const ivrNodeValidator = v.object({
  id: v.string(),
  type: ivrNodeTypeValidator,
  label: v.string(),
  /** TTS / gather prompt text */
  text: v.optional(v.string()),
  voice: v.optional(v.string()),
  language: v.optional(v.string()),
  /** E.164 transfer / voicemail notify target */
  transferTo: v.optional(v.string()),
  /** Optional hop URL (POST JSON; follow `next` on 2xx) */
  webhookUrl: v.optional(v.string()),
  /** IANA timezone for hours nodes */
  timezone: v.optional(v.string()),
  openHour: v.optional(v.number()),
  closeHour: v.optional(v.number()),
  /** 0=Sun … 6=Sat; empty/undefined = every day */
  openDays: v.optional(v.array(v.number())),
  maxRecordingSecs: v.optional(v.number()),
  edges: v.array(ivrEdgeValidator),
});

export const ivrGraphValidator = v.object({
  entryNodeId: v.string(),
  nodes: v.array(ivrNodeValidator),
});

export type IvrEdgeKey =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "*"
  | "#"
  | "timeout"
  | "invalid"
  | "no_input"
  | "next"
  | "open"
  | "closed";

export type IvrNodeType =
  | "speak"
  | "gather"
  | "transfer"
  | "voicemail"
  | "hours"
  | "hangup"
  | "webhook";

export type IvrNode = {
  id: string;
  type: IvrNodeType;
  label: string;
  text?: string;
  voice?: string;
  language?: string;
  transferTo?: string;
  webhookUrl?: string;
  timezone?: string;
  openHour?: number;
  closeHour?: number;
  openDays?: number[];
  maxRecordingSecs?: number;
  edges: Array<{ key: IvrEdgeKey; targetNodeId: string }>;
};

export type IvrGraph = {
  entryNodeId: string;
  nodes: IvrNode[];
};

export function defaultIvrGraph(): IvrGraph {
  return {
    entryNodeId: "welcome",
    nodes: [
      {
        id: "welcome",
        type: "speak",
        label: "Welcome",
        text: "Thank you for calling. Please listen carefully for options.",
        voice: "female",
        language: "en-US",
        edges: [{ key: "next", targetNodeId: "menu" }],
      },
      {
        id: "menu",
        type: "gather",
        label: "Main menu",
        text: "Press 1 to speak with the team. Press 2 to leave a message. Press 0 to hang up.",
        voice: "female",
        language: "en-US",
        edges: [
          { key: "1", targetNodeId: "transfer" },
          { key: "2", targetNodeId: "voicemail" },
          { key: "0", targetNodeId: "goodbye" },
          { key: "timeout", targetNodeId: "goodbye" },
          { key: "invalid", targetNodeId: "menu" },
          { key: "no_input", targetNodeId: "goodbye" },
        ],
      },
      {
        id: "transfer",
        type: "transfer",
        label: "Transfer to team",
        transferTo: "",
        edges: [],
      },
      {
        id: "voicemail",
        type: "voicemail",
        label: "Voicemail",
        text: "Please leave a message after the tone. Press pound when finished.",
        maxRecordingSecs: 120,
        edges: [{ key: "next", targetNodeId: "goodbye" }],
      },
      {
        id: "goodbye",
        type: "hangup",
        label: "Hang up",
        text: "Goodbye.",
        edges: [],
      },
    ],
  };
}

export function findNode(
  graph: IvrGraph,
  nodeId: string,
): IvrNode | undefined {
  return graph.nodes.find((n) => n.id === nodeId);
}

export function resolveEdge(
  node: IvrNode,
  key: IvrEdgeKey,
): string | undefined {
  const exact = node.edges.find((e) => e.key === key);
  if (exact) return exact.targetNodeId;
  if (key === "no_input") {
    return node.edges.find((e) => e.key === "timeout")?.targetNodeId;
  }
  return undefined;
}

export function assertValidGraph(graph: IvrGraph): void {
  if (graph.nodes.length === 0) {
    throw new Error("IVR graph needs at least one node");
  }
  if (graph.nodes.length > MAX_IVR_NODES) {
    throw new Error(`IVR graphs are limited to ${MAX_IVR_NODES} nodes`);
  }
  const ids = new Set(graph.nodes.map((n) => n.id));
  if (ids.size !== graph.nodes.length) {
    throw new Error("Duplicate node ids in IVR graph");
  }
  if (!ids.has(graph.entryNodeId)) {
    throw new Error("entryNodeId does not match any node");
  }
  for (const node of graph.nodes) {
    for (const edge of node.edges) {
      if (!ids.has(edge.targetNodeId)) {
        throw new Error(
          `Edge ${edge.key} on ${node.id} points to missing node ${edge.targetNodeId}`,
        );
      }
    }
  }
}

const EXIT_NODE_TYPES: ReadonlySet<IvrNodeType> = new Set([
  "transfer",
  "hangup",
  "voicemail",
]);

/** True when a transfer / hangup / voicemail node is reachable from entry. */
export function hasReachableExitPath(graph: IvrGraph): boolean {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const queue = [graph.entryNodeId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (!node) continue;
    if (EXIT_NODE_TYPES.has(node.type)) return true;
    for (const edge of node.edges) {
      if (!seen.has(edge.targetNodeId)) queue.push(edge.targetNodeId);
    }
  }
  return false;
}

export function assertHasExitPath(graph: IvrGraph): void {
  if (!hasReachableExitPath(graph)) {
    throw new Error(
      "Add a reachable transfer, hangup, or voicemail path before publishing",
    );
  }
}

/** Evaluate a business-hours node against the current instant. */
export function isWithinBusinessHours(
  node: IvrNode,
  nowMs: number,
): boolean {
  const tz = node.timezone ?? "America/New_York";
  const openHour = node.openHour ?? 9;
  const closeHour = node.closeHour ?? 17;
  const openDays = node.openDays;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date(nowMs));

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hourRaw = parts.find((p) => p.type === "hour")?.value ?? "0";
  const hour = Number(hourRaw === "24" ? "0" : hourRaw);

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const day = dayMap[weekday] ?? 1;

  if (openDays && openDays.length > 0 && !openDays.includes(day)) {
    return false;
  }
  if (closeHour > openHour) {
    return hour >= openHour && hour < closeHour;
  }
  // Overnight window (e.g. 22 → 6)
  return hour >= openHour || hour < closeHour;
}
