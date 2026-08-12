export interface ArenaModel {
  id: string;
  name: string;
  size: string;
  modelId: string;
}

export const ARENA_MODELS: ArenaModel[] = [
  {
    id: "minicpm5-1b",
    name: "MiniCPM5 1B",
    size: "2.4GB",
    modelId: "skjortan/MiniCPM5-1B-ONNX",
  },
  {
    id: "qwen3-06b",
    name: "Qwen3 0.6B",
    size: "1.2GB",
    modelId: "onnx-community/Qwen3-0.6B-ONNX",
  },
  {
    id: "gemma-270m",
    name: "Gemma 270M",
    size: "500MB",
    modelId: "onnx-community/gemma-3-270m-it-ONNX",
  },
  {
    id: "qwen-05b",
    name: "Qwen 0.5B",
    size: "1GB",
    modelId: "onnx-community/Qwen2.5-0.5B-Instruct",
  },
  {
    id: "smol-360m",
    name: "SmolLM2 360M",
    size: "770MB",
    modelId: "HuggingFaceTB/SmolLM2-360M-Instruct",
  },
];

export function getArenaModel(id: string): ArenaModel | undefined {
  return ARENA_MODELS.find((model) => model.id === id);
}

export function isOnnxCompatible(model: ArenaModel): boolean {
  return /onnx/i.test(model.modelId) || model.modelId.startsWith("HuggingFaceTB/");
}

/**
 * Map Transformers.js / fetch failures into a short UI string.
 * WebKit reports CSP and CORS connect-src blocks as
 * "NetworkError when attempting to fetch resource".
 */
export function formatArenaLoadError(err: unknown): string {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  if (/networkerror|failed to fetch|load failed|network request failed/i.test(message)) {
    return "Couldn't reach Hugging Face to download the model (blocked network or Content-Security-Policy). Check your connection and retry.";
  }
  return message.trim() || "Failed to load model";
}

/** Safe extract of model text from Transformers.js pipeline output. */
export function extractGeneratedText(output: unknown): string {
  if (!output) return "";
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const first = output[0] as { generated_text?: unknown } | string | undefined;
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && first.generated_text != null) {
      return String(first.generated_text);
    }
  }
  if (typeof output === "object" && output !== null && "generated_text" in output) {
    const text = (output as { generated_text?: unknown }).generated_text;
    return text != null ? String(text) : "";
  }
  return "";
}
