import { describe, expect, test } from "vitest";
import {
  getModelCacheKey,
  isModelMarkedCached,
  markModelCached,
  unmarkModelCached,
} from "./modelCache";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

describe("modelCache", () => {
  test("uses a stable localStorage key", () => {
    expect(getModelCacheKey("onnx-community/Qwen3-0.6B-ONNX")).toBe(
      "model_cache_onnx-community/Qwen3-0.6B-ONNX",
    );
  });

  test("marks and unmarks a cached model", () => {
    const storage = memoryStorage();
    const modelId = "skjortan/MiniCPM5-1B-ONNX";
    expect(isModelMarkedCached(modelId, storage)).toBe(false);
    markModelCached(modelId, storage);
    expect(isModelMarkedCached(modelId, storage)).toBe(true);
    unmarkModelCached(modelId, storage);
    expect(isModelMarkedCached(modelId, storage)).toBe(false);
  });
});
