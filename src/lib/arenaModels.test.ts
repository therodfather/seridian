import { describe, expect, test } from "vitest";
import {
  ARENA_MODELS,
  getArenaModel,
  isOnnxCompatible,
} from "./arenaModels";

describe("ARENA_MODELS", () => {
  test("includes the ONNX-compatible catalog from the fork", () => {
    const ids = ARENA_MODELS.map((model) => model.id);
    expect(ids).toEqual([
      "minicpm5-1b",
      "qwen3-06b",
      "gemma-270m",
      "qwen-05b",
      "smol-360m",
    ]);
  });

  test("every catalog entry is ONNX-compatible for Transformers.js", () => {
    expect(ARENA_MODELS.every(isOnnxCompatible)).toBe(true);
  });

  test("looks up a model by id", () => {
    expect(getArenaModel("qwen3-06b")?.modelId).toBe(
      "onnx-community/Qwen3-0.6B-ONNX",
    );
    expect(getArenaModel("missing")).toBeUndefined();
  });
});
