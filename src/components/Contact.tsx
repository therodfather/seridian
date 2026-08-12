"use client";

import * as React from "react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Separator,
  Textarea,
} from "@bytecats/ui-kit";
import {
  healthCheckCtaHint,
  healthCheckCtaLabel,
  healthCheckPayHref,
} from "@/lib/healthCheckOffer";

type Toast = { msg: string; type: "success" | "error" } | null;

export function Contact() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [company, setCompany] = React.useState(""); // honeypot
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState<Toast>(null);
  const [fieldErrors, setFieldErrors] = React.useState<{
    name?: string;
    email?: string;
    message?: string;
  }>({});

  // auto-dismiss toast
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function validate(): boolean {
    const errs: typeof fieldErrors = {};
    if (name.trim().length < 2) errs.name = "Name must be at least 2 characters";
    else if (name.trim().length > 100) errs.name = "Name too long";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email";
    if (message.trim().length < 10) errs.message = "Message must be at least 10 characters";
    else if (message.length > 2000) errs.message = "Message too long (max 2000)";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (company.trim().length > 0) {
      setToast({ msg: "Message sent — thank you!", type: "success" });
      setName("");
      setEmail("");
      setMessage("");
      return;
    }
    if (!validate()) {
      setToast({ msg: "Please fix the highlighted fields", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim(), company }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        identifier?: string;
      };

      if (!res.ok || !data.ok) {
        const msg =
          res.status === 429
            ? data.error ?? "Rate limited — try again in a minute"
            : data.error ?? "Failed to send — please try again";
        setToast({ msg, type: "error" });
        return;
      }

      if (data.identifier) {
        setToast({ msg: `Message sent — Issue ${data.identifier} created`, type: "success" });
      } else {
        setToast({ msg: "Message sent — thank you!", type: "success" });
      }
      setName("");
      setEmail("");
      setMessage("");
      setCompany("");
      setFieldErrors({});
    } catch {
      setToast({ msg: "Could not reach the server — please try again", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contact" className="border-t border-white/5 bg-slate-950 py-24" aria-labelledby="contact-heading">
      <div className="mx-auto max-w-6xl px-6">
        <Card className="card-glow relative overflow-hidden rounded-2xl border border-seridian-500/20 bg-slate-925 bg-gradient-to-br from-slate-850 to-slate-925 p-0 text-slate-300 ring-white/5">
          <div className="glow-orb absolute -right-32 -top-32 h-96 w-96 pointer-events-none" aria-hidden />
          <div className="glow-orb absolute -bottom-32 -left-32 h-96 w-96 pointer-events-none" aria-hidden />

          <CardContent className="relative grid gap-12 p-8 md:p-16 lg:grid-cols-2">
            <div>
              <p className="font-mono text-sm font-medium uppercase tracking-wider text-seridian-400">
                Contact
              </p>
              <h2
                id="contact-heading"
                className="font-display mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl"
              >
                Pay first. Start this week.
              </h2>
              <p className="mt-4 leading-relaxed text-slate-400">
                The $999 Cloud Health Check is prepaid — no call required. Sprint
                work starts when a 50% deposit clears. Use the form if you need a
                15-minute kickoff, not a free look at your infra.
              </p>

              <div className="mt-6">
                <Button
                  asChild
                  size="lg"
                  className="w-full rounded-lg bg-seridian-500 px-6 py-3.5 text-sm font-semibold text-slate-950 hover:bg-seridian-400 h-auto sm:w-auto"
                >
                  <a href={healthCheckPayHref()}>{healthCheckCtaLabel()}</a>
                </Button>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {healthCheckCtaHint()}
                </p>
              </div>

              <Separator className="my-8 bg-white/5" />

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-300">
                  <svg
                    className="h-5 w-5 text-seridian-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                  <a href="mailto:hello@seridian.dev" className="transition-colors hover:text-seridian-400">
                    hello@seridian.dev
                  </a>
                </div>
                <p className="text-xs text-slate-500">
                  Prefer email? Use the link above. The form is for kickoff notes —
                  it is not a free infrastructure review.
                </p>
              </div>

              <dl className="mt-8 space-y-4 text-sm">
                <div>
                  <dt className="font-medium text-slate-200">Do I need a call?</dt>
                  <dd className="mt-1 text-slate-400">
                    No. Pay the Health Check and we start from your access notes.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-200">What is in the report?</dt>
                  <dd className="mt-1 text-slate-400">
                    Critical / high / recommended findings, cost notes, and a
                    30/60/90-day remediation plan.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-200">How long?</dt>
                  <dd className="mt-1 text-slate-400">
                    Written report in 3–5 business days after access is granted.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-200">No card handy?</dt>
                  <dd className="mt-1 text-slate-400">
                    Email hello@seridian.dev and we will send a pay link or wire
                    instructions.
                  </dd>
                </div>
              </dl>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate aria-describedby="contact-status">
              {/* honeypot */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="contact-company">Company</label>
                <input
                  id="contact-company"
                  name="company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-slate-300">
                  Name
                </Label>
                <Input
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-white/10 bg-slate-950/80 text-white shadow-none placeholder:text-slate-500 focus-visible:border-seridian-500/50 focus-visible:ring-seridian-500/50"
                  placeholder="Your name"
                />
                {fieldErrors.name && (
                  <p id="contact-name-error" className="mt-1.5 text-xs text-red-400">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-slate-300">
                  Email
                </Label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-white/10 bg-slate-950/80 text-white shadow-none placeholder:text-slate-500 focus-visible:border-seridian-500/50 focus-visible:ring-seridian-500/50"
                  placeholder="you@company.com"
                />
                {fieldErrors.email && (
                  <p id="contact-email-error" className="mt-1.5 text-xs text-red-400">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-slate-300">
                  How can we help?
                </Label>
                <Textarea
                  id="contact-message"
                  name="message"
                  rows={4}
                  required
                  aria-invalid={!!fieldErrors.message}
                  aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  className="w-full resize-none border-white/10 bg-slate-950/80 text-white shadow-none placeholder:text-slate-500 focus-visible:border-seridian-500/50 focus-visible:ring-seridian-500/50"
                  placeholder="What's on fire this week? Demo date, CI, bill, or a contractor who vanished."
                />
                <div className="mt-1 flex justify-between">
                  {fieldErrors.message ? (
                    <p id="contact-message-error" className="text-xs text-red-400">
                      {fieldErrors.message}
                    </p>
                  ) : (
                    <span className="text-xs text-slate-500">{message.length}/2000</span>
                  )}
                  <span aria-hidden className="text-xs text-slate-500" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full rounded-lg bg-seridian-500 px-6 py-3.5 text-sm font-semibold text-slate-950 hover:bg-seridian-400 h-auto disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 004 12z" />
                    </svg>
                    Sending…
                  </span>
                ) : (
                  "Send kickoff note"
                )}
              </Button>

              <p id="contact-status" className="sr-only" aria-live="polite">
                {loading ? "Sending" : "Ready"}
              </p>

              {/* inline fallback toast — no ui-kit dependency */}
              {toast && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    toast.type === "success"
                      ? "border-seridian-500/20 bg-seridian-500/10 text-seridian-200"
                      : "border-red-500/20 bg-red-500/10 text-red-200"
                  }`}
                >
                  {toast.msg}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
