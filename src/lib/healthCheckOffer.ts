/**
 * Pay-first CTAs for productized packages.
 *
 * Set NEXT_PUBLIC_HEALTH_CHECK_PAY_URL to a live Stripe/PayPal/Wise link.
 * Set NEXT_PUBLIC_KICKOFF_URL to a Calendly (or similar) 15-min slot.
 * Until those exist, CTAs fall back to mailto:hello@seridian.dev.
 * Never ship a placeholder buy.stripe.com URL.
 */

export type OfferCta = {
  href: string;
  label: string;
  hint: string;
};

export type SprintSku = "mvp" | "feature" | "cicd";

const INVOICE_EMAIL = "hello@seridian.dev";

const HEALTH_CHECK_SUBJECT = "Invoice: Cloud Health Check $999";
const HEALTH_CHECK_BODY = [
  "Please send the $999 prepaid pay link for the Cloud & Infrastructure Health Check.",
  "",
  "Company:",
  "Cloud (AWS / GCP / Azure / other):",
  "What is on fire this week:",
  "",
].join("\n");

const SPRINT_META: Record<
  SprintSku,
  { title: string; range: string; deposit: string; subject: string }
> = {
  mvp: {
    title: "MVP Sprint",
    range: "$3,500–$5,000",
    deposit: "$1,750–$2,500",
    subject: "Deposit: MVP Sprint (50%)",
  },
  feature: {
    title: "Feature Development Sprint",
    range: "$2,500–$4,000",
    deposit: "$1,250–$2,000",
    subject: "Deposit: Feature Sprint (50%)",
  },
  cicd: {
    title: "CI/CD & Deployment Automation",
    range: "$2,500–$4,500",
    deposit: "$1,250–$2,250",
    subject: "Deposit: CI/CD Sprint (50%)",
  },
};

function envUrl(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function invoiceMailto(subject: string, body: string): string {
  return `mailto:${INVOICE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const HEALTH_CHECK_INVOICE_MAILTO = invoiceMailto(
  HEALTH_CHECK_SUBJECT,
  HEALTH_CHECK_BODY,
);

export const HEALTH_CHECK_ANCHOR = "health-check";
export const MVP_SPRINT_ANCHOR = "mvp-sprint";
export const FEATURE_SPRINT_ANCHOR = "feature-sprint";
export const CICD_SPRINT_ANCHOR = "cicd-sprint";

export function healthCheckHasLivePayUrl(): boolean {
  return Boolean(envUrl("NEXT_PUBLIC_HEALTH_CHECK_PAY_URL"));
}

export function healthCheckPayHref(): string {
  return envUrl("NEXT_PUBLIC_HEALTH_CHECK_PAY_URL") ?? HEALTH_CHECK_INVOICE_MAILTO;
}

export function healthCheckCtaLabel(): string {
  return healthCheckHasLivePayUrl()
    ? "Buy Health Check — $999"
    : "Request $999 invoice";
}

export function healthCheckCtaHint(): string {
  return healthCheckHasLivePayUrl()
    ? "Pay now. No call required. Written report in 3–5 business days."
    : "No call required. We'll send a prepaid pay link within an hour.";
}

export function healthCheckCta(): OfferCta {
  return {
    href: healthCheckPayHref(),
    label: healthCheckCtaLabel(),
    hint: healthCheckCtaHint(),
  };
}

export function kickoffHref(): string {
  return envUrl("NEXT_PUBLIC_KICKOFF_URL") ?? "/#contact";
}

export function sprintDepositCta(sku: SprintSku): OfferCta {
  const meta = SPRINT_META[sku];
  const body = [
    `Please send a 50% deposit invoice for the ${meta.title} (${meta.range}; deposit about ${meta.deposit}).`,
    "",
    "Company:",
    "What must ship, and by when:",
    "Decision-maker on this thread:",
    "",
  ].join("\n");

  return {
    href: invoiceMailto(meta.subject, body),
    label: `Request 50% deposit — ${meta.deposit}`,
    hint: "Priced on a 20-minute kickoff. Work starts when the deposit clears.",
  };
}
