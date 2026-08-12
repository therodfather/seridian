import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("dashboard Content-Security-Policy", () => {
  const src = readFileSync(new URL("../../next.config.ts", import.meta.url), "utf8");

  test("allows Convex websockets and Hugging Face model downloads", () => {
    expect(src).toContain("wss://*.convex.cloud");
    expect(src).toContain("https://huggingface.co");
    expect(src).toContain("https://*.huggingface.co");
    expect(src).toContain("https://*.xethub.hf.co");
    expect(src).toContain("'wasm-unsafe-eval'");
    expect(src).toContain("worker-src 'self' blob:");
  });
});
