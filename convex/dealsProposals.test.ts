/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("deals", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest({ schema, modules });
  });

  test("create list update remove round-trip", async () => {
    const clientId = await t.mutation(api.clients.create, {
      name: "Buyer",
      company: "Buyer Co",
      email: "buyer@example.com",
      status: "active",
    });

    const dealId = await t.mutation(api.deals.create, {
      name: "Cloud Deal",
      clientId,
      value: 50_000,
      stage: "lead",
      probability: 40,
    });

    const listed = await t.query(api.deals.list, { clientId });
    expect(listed).toHaveLength(1);
    expect(listed[0]._id).toBe(dealId);

    await t.mutation(api.deals.update, {
      dealId,
      stage: "proposal",
      probability: 60,
    });

    const deal = await t.query(api.deals.get, { dealId });
    expect(deal).toMatchObject({ stage: "proposal", probability: 60 });

    await t.mutation(api.deals.remove, { dealId });
    expect(await t.query(api.deals.get, { dealId })).toBeNull();
    expect(await t.query(api.deals.list, {})).toHaveLength(0);
  });
});

describe("proposals", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest({ schema, modules });
  });

  test("create list update and status transitions", async () => {
    const clientId = await t.mutation(api.clients.create, {
      name: "Prospect",
      company: "Prospect Co",
      email: "prospect@example.com",
      status: "active",
    });

    const proposalId = await t.mutation(api.proposals.create, {
      title: "Migration Proposal",
      clientId,
      content: "Scope and timeline",
      status: "draft",
      value: 75_000,
      createdBy: "tester",
    });

    expect(await t.query(api.proposals.list, {})).toHaveLength(1);

    await t.mutation(api.proposals.update, {
      proposalId,
      title: "Migration Proposal v2",
    });

    await t.mutation(api.proposals.send, { proposalId });
    let proposal = await t.query(api.proposals.get, { proposalId });
    expect(proposal?.status).toBe("sent");

    await t.mutation(api.proposals.accept, { proposalId });
    proposal = await t.query(api.proposals.get, { proposalId });
    expect(proposal).toMatchObject({
      title: "Migration Proposal v2",
      status: "accepted",
    });
  });
});
