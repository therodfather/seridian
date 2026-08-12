/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("wikiSeed", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest({ schema, modules });
  });

  test("creates bank, pages, and facts on first run", async () => {
    const result = await t.mutation(api.wikiSeed.seedCompanyKnowledge, {});
    expect(result.pagesUpserted).toBe(5);
    expect(result.memoriesAdded).toBe(5);

    const pages = await t.query(api.wiki.listPages, { bankId: result.bankId });
    const titles = pages.map((p) => p.title).sort();
    expect(titles).toContain("Seridian — Company");
    expect(titles).toContain("Tech stack");
    expect(titles).toContain("Making money — operating playbook");

    const company = pages.find((p) => p.slug === "seridian-company");
    expect(company?.content).toMatch(/seridian\.netlify\.app/);
  });

  test("second run updates pages and does not duplicate facts", async () => {
    const first = await t.mutation(api.wikiSeed.seedCompanyKnowledge, {
      lastEditedBy: "dee",
    });
    const second = await t.mutation(api.wikiSeed.seedCompanyKnowledge, {
      lastEditedBy: "rod",
    });

    expect(second.bankId).toBe(first.bankId);
    expect(second.pagesUpserted).toBe(5);
    expect(second.memoriesAdded).toBe(0);

    const pages = await t.query(api.wiki.listPages, { bankId: first.bankId });
    expect(pages).toHaveLength(5);
    expect(pages.every((p) => p.lastEditedBy === "rod")).toBe(true);
  });
});
