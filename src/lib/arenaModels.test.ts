import { describe, expect, test } from "vitest";
import {
  ARENA_MODELS,
  extractGeneratedText,
  formatArenaLoadError,
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

  test("formatArenaLoadError maps WebKit NetworkError to a usable banner", () => {
    expect(
      formatArenaLoadError(
        new TypeError("NetworkError when attempting to fetch resource"),
      ),
    ).toMatch(/Hugging Face/);
    expect(formatArenaLoadError(new TypeError("Failed to fetch"))).toMatch(
      /Hugging Face/,
    );
    expect(formatArenaLoadError(new Error("model not found"))).toBe(
      "model not found",
    );
    expect(formatArenaLoadError(undefined)).toBe("Failed to load model");
  });

  test("extractGeneratedText tolerates missing or odd pipeline output", () => {
    expect(extractGeneratedText(undefined)).toBe("");
    expect(extractGeneratedText(null)).toBe("");
    expect(extractGeneratedText([])).toBe("");
    expect(extractGeneratedText([{ generated_text: "hello" }])).toBe("hello");
    expect(extractGeneratedText("plain")).toBe("plain");
    expect(extractGeneratedText({ generated_text: 42 })).toBe("42");
  });
});
