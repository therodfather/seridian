import { expect, test } from "@playwright/test";

test.describe("marketing site", { tag: "@smoke" }, () => {
  test("homepage renders hero and primary CTA", async ({ page }) => {
    const shaderWarnings: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "warning" && /\[WebGLHero\]/.test(msg.text())) {
        shaderWarnings.push(msg.text());
      }
    });

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /build and scale with/i }),
    ).toBeVisible();
    await expect(
      page.getByText("Cloud Infrastructure & Application Development", {
        exact: true,
      }),
    ).toBeVisible();

    const heroCanvas = page.locator(".webgl-hero canvas");
    await expect(heroCanvas).toBeAttached({ timeout: 10_000 });
    // Canvas fades in via rAF opacity; wait until WebGL/2D path has painted.
    await expect(heroCanvas).toHaveCSS("opacity", "1", { timeout: 10_000 });

    // If this browser exposes WebGL2, the hero must keep a live webgl2 context
    // (not silently fall back after a shader compile failure).
    const status = await page.evaluate(async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const probe = document.createElement("canvas");
      const canWebGL2 = !!probe.getContext("webgl2");
      const canvas = document.querySelector(".webgl-hero canvas");
      if (!(canvas instanceof HTMLCanvasElement)) {
        return { canWebGL2, hasCanvas: false, usingWebGL2: false, using2d: false };
      }
      const gl = canvas.getContext("webgl2");
      const ctx2d = canvas.getContext("2d");
      return {
        canWebGL2,
        hasCanvas: true,
        usingWebGL2: !!(gl && !gl.isContextLost()),
        using2d: !!ctx2d,
      };
    });

    expect(status.hasCanvas).toBe(true);
    if (status.canWebGL2) {
      expect(
        status.usingWebGL2,
        `WebGL2 available but hero fell back (warnings=${shaderWarnings.join(" | ") || "none"})`,
      ).toBe(true);
    }
    expect(
      shaderWarnings,
      `unexpected WebGLHero shader fallback: ${shaderWarnings.join(" | ")}`,
    ).toEqual([]);
  });

  test("contact section is reachable", async ({ page }) => {
    await page.goto("/");
    const contact = page.locator("#contact");
    await contact.scrollIntoViewIfNeeded();
    await expect(contact).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /talk about your next project/i }),
    ).toBeVisible();
  });

  test("packages page opens from header nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByRole("link", { name: "Packages" }).click();
    await expect(page).toHaveURL(/\/packages$/);
    await expect(
      page.getByRole("heading", { name: /Clear scope/i }),
    ).toBeVisible();
  });
});
