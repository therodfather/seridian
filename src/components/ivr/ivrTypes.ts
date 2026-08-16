/** Client-side IVR graph types mirroring convex/lib/ivrGraph.ts */

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

export const NODE_TYPE_LABELS: Record<IvrNodeType, string> = {
  speak: "Speak / Welcome",
  gather: "Menu / Gather",
  transfer: "Transfer",
  voicemail: "Voicemail",
  hours: "Business hours",
  hangup: "Hang up",
  webhook: "Webhook hop",
};

export const EDGE_KEYS: IvrEdgeKey[] = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "*",
  "#",
  "next",
  "timeout",
  "invalid",
  "no_input",
  "open",
  "closed",
];

export function newNodeId(type: IvrNodeType): string {
  return `${type}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBlankNode(type: IvrNodeType): IvrNode {
  const id = newNodeId(type);
  const base: IvrNode = {
    id,
    type,
    label: NODE_TYPE_LABELS[type],
    edges: [],
  };
  switch (type) {
    case "speak":
      return {
        ...base,
        text: "Welcome.",
        voice: "female",
        language: "en-US",
        edges: [],
      };
    case "gather":
      return {
        ...base,
        text: "Press 1 for sales, 2 for support.",
        voice: "female",
        language: "en-US",
        edges: [
          { key: "timeout", targetNodeId: id },
          { key: "invalid", targetNodeId: id },
        ],
      };
    case "transfer":
      return { ...base, transferTo: "" };
    case "voicemail":
      return {
        ...base,
        text: "Please leave a message after the tone.",
        maxRecordingSecs: 120,
      };
    case "hours":
      return {
        ...base,
        timezone: "America/New_York",
        openHour: 9,
        closeHour: 17,
        openDays: [1, 2, 3, 4, 5],
      };
    case "webhook":
      return { ...base, webhookUrl: "" };
    case "hangup":
      return { ...base, text: "Goodbye." };
    default:
      return base;
  }
}

const EXIT_TYPES: ReadonlySet<IvrNodeType> = new Set([
  "transfer",
  "hangup",
  "voicemail",
]);

/** Client mirror of convex `hasReachableExitPath` — gate Publish / Next. */
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
    if (EXIT_TYPES.has(node.type)) return true;
    for (const edge of node.edges) {
      if (!seen.has(edge.targetNodeId)) queue.push(edge.targetNodeId);
    }
  }
  return false;
}

export function transferDestinationsReady(graph: IvrGraph): boolean {
  return graph.nodes
    .filter((n) => n.type === "transfer")
    .every((n) => Boolean(n.transferTo?.trim()));
}
