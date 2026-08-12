import { expect, test } from "@playwright/test";
import { gotoDashboard } from "./helpers";

test.describe("LLM Arena model manager", () => {
  test("lists ONNX-compatible models", async ({ page }) => {
    await gotoDashboard(page);
    await page.goto("/dashboard/arena");
    await expect(page.getByRole("heading", { name: "LLM Arena", level: 1 })).toBeVisible();
    await expect(page.getByText("Model Manager")).toBeVisible();
    await expect(page.getByText("MiniCPM5 1B").first()).toBeVisible();
    await expect(page.getByText("Qwen3 0.6B").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Download" }).first()).toBeVisible();
    await expect(page.getByText("Download a model in the Model Manager")).toBeVisible();
  });
});
