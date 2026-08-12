/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("contracts", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest({ schema, modules });
  });

  test("create from proposal, send, and sign by token", async () => {
    const clientId = await t.mutation(api.clients.create, {
      name: "Ada",
      company: "Analytical Engines",
      email: "ada@example.com",
      status: "active",
    });

    const proposalId = await t.mutation(api.proposals.create, {
      title: "Cloud Health Check",
      clientId,
      content: "Prepaid $999 review. 3–5 day report.",
      status: "accepted",
      value: 999,
      createdBy: "rod",
    });

    const contractId = await t.mutation(api.contracts.createFromProposal, {
      proposalId,
    });
    const again = await t.mutation(api.contracts.createFromProposal, {
      proposalId,
    });
    expect(again).toBe(contractId);

    const listed = await t.query(api.contracts.list, { clientId });
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      name: "Cloud Health Check",
      value: 999,
      status: "draft",
      body: "Prepaid $999 review. 3–5 day report.",
    });

    const sent = await t.mutation(api.contracts.sendForSignature, { contractId });
    expect(sent.signToken.length).toBeGreaterThan(8);

    const preview = await t.query(api.contracts.getByToken, {
      token: sent.signToken,
    });
    expect(preview).toMatchObject({
      name: "Cloud Health Check",
      clientName: "Ada",
      status: "sent",
    });

    await t.mutation(api.contracts.signByToken, {
      token: sent.signToken,
      signerName: "Ada Lovelace",
      signerEmail: "ada@example.com",
      signatureText: "Ada Lovelace",
    });

    const signed = await t.query(api.contracts.get, { contractId });
    expect(signed).toMatchObject({
      status: "signed",
      signerName: "Ada Lovelace",
      signatureText: "Ada Lovelace",
    });
    expect(signed?.signedAt).toBeGreaterThan(0);

    await expect(
      t.mutation(api.contracts.signByToken, {
        token: sent.signToken,
        signerName: "Impostor",
        signatureText: "Impostor",
      }),
    ).rejects.toThrow(/already signed/);

    await t.mutation(api.contracts.activate, { contractId });
    expect((await t.query(api.contracts.get, { contractId }))?.status).toBe(
      "active",
    );
  });

  test("refuses to create a contract from a proposal without a client", async () => {
    const proposalId = await t.mutation(api.proposals.create, {
      title: "Orphan",
      content: "No client",
      status: "draft",
      createdBy: "rod",
    });

    await expect(
      t.mutation(api.contracts.createFromProposal, { proposalId }),
    ).rejects.toThrow(/needs a client/);
  });
});
