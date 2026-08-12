import { afterEach, describe, expect, it } from "vitest";
import {
  HEALTH_CHECK_INVOICE_MAILTO,
  healthCheckCtaHint,
  healthCheckCtaLabel,
  healthCheckHasLivePayUrl,
  healthCheckPayHref,
  kickoffHref,
  sprintDepositCta,
} from "./healthCheckOffer";

describe("healthCheckOffer", () => {
  const originalPay = process.env.NEXT_PUBLIC_HEALTH_CHECK_PAY_URL;
  const originalKickoff = process.env.NEXT_PUBLIC_KICKOFF_URL;

  afterEach(() => {
    if (originalPay === undefined) {
      delete process.env.NEXT_PUBLIC_HEALTH_CHECK_PAY_URL;
    } else {
      process.env.NEXT_PUBLIC_HEALTH_CHECK_PAY_URL = originalPay;
    }
    if (originalKickoff === undefined) {
      delete process.env.NEXT_PUBLIC_KICKOFF_URL;
    } else {
      process.env.NEXT_PUBLIC_KICKOFF_URL = originalKickoff;
    }
  });

  it("falls back to invoice mailto when no pay URL is set", () => {
    delete process.env.NEXT_PUBLIC_HEALTH_CHECK_PAY_URL;
    expect(healthCheckHasLivePayUrl()).toBe(false);
    expect(healthCheckPayHref()).toBe(HEALTH_CHECK_INVOICE_MAILTO);
    expect(healthCheckCtaLabel()).toBe("Request $999 invoice");
    expect(healthCheckCtaHint()).toMatch(/within an hour/i);
    expect(HEALTH_CHECK_INVOICE_MAILTO.startsWith("mailto:hello@seridian.dev")).toBe(
      true,
    );
  });

  it("uses a live pay URL when configured", () => {
    process.env.NEXT_PUBLIC_HEALTH_CHECK_PAY_URL = "https://pay.example/health-check";
    expect(healthCheckHasLivePayUrl()).toBe(true);
    expect(healthCheckPayHref()).toBe("https://pay.example/health-check");
    expect(healthCheckCtaLabel()).toBe("Buy Health Check — $999");
    expect(healthCheckCtaHint()).toMatch(/no call required/i);
  });

  it("falls back kickoff to the contact section", () => {
    delete process.env.NEXT_PUBLIC_KICKOFF_URL;
    expect(kickoffHref()).toBe("/#contact");
  });

  it("uses a live kickoff URL when configured", () => {
    process.env.NEXT_PUBLIC_KICKOFF_URL = "https://calendly.com/seridian/kickoff";
    expect(kickoffHref()).toBe("https://calendly.com/seridian/kickoff");
  });

  it("builds a 50% deposit mailto for sprint SKUs", () => {
    const cta = sprintDepositCta("mvp");
    expect(cta.href.startsWith("mailto:hello@seridian.dev")).toBe(true);
    expect(cta.href).toContain(encodeURIComponent("Deposit: MVP Sprint (50%)"));
    expect(cta.label).toMatch(/50% deposit/i);
    expect(cta.hint).toMatch(/deposit clears/i);
  });
});
