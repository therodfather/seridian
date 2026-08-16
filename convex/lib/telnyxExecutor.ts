/**
 * Execute a published IVR node via Telnyx Call Control commands.
 */
import type { Id } from "../_generated/dataModel";
import {
  findNode,
  isWithinBusinessHours,
  resolveEdge,
  type IvrEdgeKey,
  type IvrGraph,
  type IvrNode,
} from "./ivrGraph";
import {
  encodeClientState,
  telnyxCallAction,
  type CallClientState,
} from "./telnyxSignature";

function stateFor(
  flowId: Id<"ivrFlows">,
  versionId: Id<"ivrFlowVersions">,
  nodeId: string,
): string {
  return encodeClientState({
    flowId,
    versionId,
    nodeId,
  } satisfies CallClientState);
}

function gatherDigits(node: IvrNode): string {
  const keys = node.edges
    .map((e) => e.key)
    .filter((k) => /^[0-9*#]$/.test(k));
  return keys.length > 0 ? keys.join("") : "0123456789*#";
}

export async function executeNode(args: {
  apiKey: string;
  callControlId: string;
  flowId: Id<"ivrFlows">;
  versionId: Id<"ivrFlowVersions">;
  graph: IvrGraph;
  nodeId: string;
  nowMs?: number;
}): Promise<{
  status:
    | "in_progress"
    | "transferred"
    | "recorded"
    | "hangup"
    | "error";
  routedTo?: string;
  currentNodeId: string;
  errorMessage?: string;
}> {
  const node = findNode(args.graph, args.nodeId);
  if (!node) {
    await telnyxCallAction(args.apiKey, args.callControlId, "hangup");
    return {
      status: "error",
      currentNodeId: args.nodeId,
      errorMessage: `Unknown node ${args.nodeId}`,
    };
  }

  const clientState = stateFor(args.flowId, args.versionId, node.id);
  const voice = node.voice ?? "female";
  const language = node.language ?? "en-US";

  switch (node.type) {
    case "hours": {
      const open = isWithinBusinessHours(node, args.nowMs ?? Date.now());
      const nextId = resolveEdge(node, open ? "open" : "closed");
      if (!nextId) {
        await telnyxCallAction(args.apiKey, args.callControlId, "hangup");
        return {
          status: "hangup",
          currentNodeId: node.id,
          errorMessage: "Hours node missing open/closed edge",
        };
      }
      return executeNode({ ...args, nodeId: nextId });
    }
    case "speak": {
      const payload = node.text?.trim() || node.label;
      await telnyxCallAction(args.apiKey, args.callControlId, "speak", {
        payload,
        voice,
        language,
        client_state: clientState,
      });
      return { status: "in_progress", currentNodeId: node.id };
    }
    case "gather": {
      const payload = node.text?.trim() || node.label;
      await telnyxCallAction(
        args.apiKey,
        args.callControlId,
        "gather_using_speak",
        {
          payload,
          voice,
          language,
          minimum_digits: 1,
          maximum_digits: 1,
          valid_digits: gatherDigits(node),
          timeout_millis: 10000,
          client_state: clientState,
        },
      );
      return { status: "in_progress", currentNodeId: node.id };
    }
    case "transfer": {
      const to = node.transferTo?.trim();
      if (!to) {
        await telnyxCallAction(args.apiKey, args.callControlId, "hangup");
        return {
          status: "error",
          currentNodeId: node.id,
          errorMessage: "Transfer node has no destination",
        };
      }
      await telnyxCallAction(args.apiKey, args.callControlId, "transfer", {
        to,
        client_state: clientState,
      });
      return {
        status: "transferred",
        currentNodeId: node.id,
        routedTo: to,
      };
    }
    case "voicemail": {
      const payload =
        node.text?.trim() ||
        "Please leave a message after the tone. Press pound when finished.";
      await telnyxCallAction(args.apiKey, args.callControlId, "speak", {
        payload,
        voice,
        language,
        client_state: clientState,
      });
      await telnyxCallAction(args.apiKey, args.callControlId, "record_start", {
        format: "mp3",
        channels: "single",
        max_length_secs: node.maxRecordingSecs ?? 120,
        play_beep: true,
        client_state: clientState,
      });
      return { status: "recorded", currentNodeId: node.id };
    }
    case "webhook": {
      if (node.webhookUrl?.trim()) {
        try {
          await fetch(node.webhookUrl.trim(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              flowId: args.flowId,
              versionId: args.versionId,
              nodeId: node.id,
              callControlId: args.callControlId,
            }),
          });
        } catch {
          // Hop is best-effort; continue along `next`.
        }
      }
      const nextId = resolveEdge(node, "next");
      if (!nextId) {
        await telnyxCallAction(args.apiKey, args.callControlId, "hangup");
        return { status: "hangup", currentNodeId: node.id };
      }
      return executeNode({ ...args, nodeId: nextId });
    }
    case "hangup": {
      if (node.text?.trim()) {
        await telnyxCallAction(args.apiKey, args.callControlId, "speak", {
          payload: node.text.trim(),
          voice,
          language,
          client_state: clientState,
        });
        // speak.ended will hang up when node type is hangup — mark pending
        return { status: "in_progress", currentNodeId: node.id };
      }
      await telnyxCallAction(args.apiKey, args.callControlId, "hangup");
      return { status: "hangup", currentNodeId: node.id };
    }
    default: {
      await telnyxCallAction(args.apiKey, args.callControlId, "hangup");
      return {
        status: "error",
        currentNodeId: node.id,
        errorMessage: `Unsupported node type`,
      };
    }
  }
}

export function edgeKeyFromDigits(digits: string | undefined): IvrEdgeKey {
  if (!digits || digits.length === 0) return "no_input";
  const d = digits[0]!;
  if (/^[0-9*#]$/.test(d)) return d as IvrEdgeKey;
  return "invalid";
}

export function nextAfterSpeak(
  graph: IvrGraph,
  nodeId: string,
): string | undefined {
  const node = findNode(graph, nodeId);
  if (!node) return undefined;
  if (node.type === "hangup") return undefined;
  if (node.type === "voicemail") return undefined; // wait for recording
  return resolveEdge(node, "next");
}
