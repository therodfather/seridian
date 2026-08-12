import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@bytecats/ui-kit";
import {
  CICD_SPRINT_ANCHOR,
  FEATURE_SPRINT_ANCHOR,
  HEALTH_CHECK_ANCHOR,
  MVP_SPRINT_ANCHOR,
  healthCheckCta,
  healthCheckCtaLabel,
  healthCheckPayHref,
  kickoffHref,
  sprintDepositCta,
} from "@/lib/healthCheckOffer";

type PackageCategory = "application" | "devops";

interface Package {
  category: PackageCategory;
  title: string;
  price: string;
  forWhom: string;
  includes: string[];
  deliverable: string;
  timeline: string;
  pitch: string;
  note?: string;
  anchor?: string;
  cta?: { href: string; label: string; hint: string };
}

const packages: Package[] = [
  {
    category: "application",
    title: "MVP Sprint",
    price: "$3,500–$5,000",
    forWhom:
      "Small businesses and startups that need a functional prototype or MVP — not a six-month development project.",
    includes: [
      "Requirements & technical planning session",
      "Architecture & design",
      "Responsive web application",
      "Up to 5 core screens/pages",
      "Basic authentication",
      "Database integration",
      "1–2 core workflows",
      "Deployment to client's cloud/hosting",
      "Basic documentation",
      "1 revision cycle",
    ],
    deliverable: "A working deployed application",
    timeline: "2–3 weeks",
    pitch:
      "Have an idea but don't need a six-month development project? We'll turn it into a working MVP in 2–3 weeks.",
    note: "Scope is intentionally bounded — we focus on core functionality, not unlimited feature requests.",
    anchor: MVP_SPRINT_ANCHOR,
    cta: sprintDepositCta("mvp"),
  },
  {
    category: "application",
    title: "Feature Development Sprint",
    price: "$2,500–$4,000",
    forWhom:
      "Teams that already have an application and need specific features shipped quickly.",
    includes: [
      "Technical discovery",
      "Development of 1–3 defined features",
      "API/database changes as required",
      "Automated testing for new functionality",
      "Deployment",
      "Documentation",
      "One revision cycle",
    ],
    deliverable: "Completed and deployed features",
    timeline: "1–2 weeks",
    pitch:
      "Have a backlog of features your team hasn't had time to build? Give us a two-week sprint and we'll ship them.",
    anchor: FEATURE_SPRINT_ANCHOR,
    cta: sprintDepositCta("feature"),
  },
  {
    category: "devops",
    title: "Cloud & Infrastructure Health Check",
    price: "$999",
    forWhom:
      "Teams that want a clear, prioritized picture of their cloud infrastructure without committing to a long engagement.",
    includes: [
      "Cloud architecture review",
      "Security configuration review",
      "Infrastructure review",
      "CI/CD review",
      "Monitoring & logging review",
      "Backup & recovery review",
      "Cost analysis",
      "Reliability assessment",
      "Prioritized recommendations",
    ],
    deliverable:
      "Written Cloud/SRE Assessment Report with Critical issues 🔴, High-priority 🟠, Recommended 🟡, Doing well 🟢, Cost savings 💰, and a 30/60/90-day remediation plan 📋",
    timeline: "3–5 business days",
    pitch:
      "We'll review your infrastructure and give you a prioritized list of what needs fixing for $999.",
    anchor: HEALTH_CHECK_ANCHOR,
    cta: healthCheckCta(),
  },
  {
    category: "devops",
    title: "CI/CD & Deployment Automation",
    price: "$2,500–$4,500",
    forWhom:
      "Teams still deploying manually who want reliable, automated pipelines from code to production.",
    includes: [
      "Review of current deployment process",
      "CI/CD pipeline design",
      "Automated build/test pipeline",
      "Automated deployment",
      "Environment configuration",
      "Secrets management",
      "Rollback procedure",
      "Basic deployment monitoring",
      "Documentation",
    ],
    deliverable: "Working pipeline: Git push → Build → Test → Deploy",
    timeline: "1–2 weeks",
    pitch:
      "Stop deploying your application manually. We'll build a reliable CI/CD pipeline that takes your code from Git to production automatically.",
    anchor: CICD_SPRINT_ANCHOR,
    cta: sprintDepositCta("cicd"),
  },
];

const categoryMeta: Record<
  PackageCategory,
  { label: string; description: string; badgeClass: string }
> = {
  application: {
    label: "Application Development",
    description:
      "Fixed-scope sprints to ship working software — from MVP to targeted feature delivery.",
    badgeClass: "border-seridian-500/20 bg-seridian-500/10 text-seridian-400",
  },
  devops: {
    label: "DevOps & Infrastructure",
    description:
      "Assessments and automation to make your cloud infrastructure reliable and efficient.",
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  },
};

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-seridian-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PackageCard({ pkg }: { pkg: Package }) {
  const meta = categoryMeta[pkg.category];

  return (
    <Card
      id={pkg.anchor}
      className="card-glow group flex h-full scroll-mt-24 flex-col rounded-2xl border-white/5 bg-slate-850/30 p-8 transition-all hover:border-seridian-500/20"
    >
      <CardHeader className="p-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Badge variant="outline" className={`${meta.badgeClass} text-xs uppercase tracking-wider`}>
            {meta.label}
          </Badge>
          <span className="font-mono text-sm text-slate-500">{pkg.timeline}</span>
        </div>
        <CardTitle className="font-display mt-4 text-2xl font-semibold text-white">
          {pkg.title}
        </CardTitle>
        <p className="font-display mt-2 text-3xl font-bold text-seridian-400">{pkg.price}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{pkg.forWhom}</p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-0 pt-6">
        <div className="rounded-xl border border-seridian-500/10 bg-seridian-500/5 px-5 py-4">
          <p className="text-sm italic leading-relaxed text-seridian-200/90">
            &ldquo;{pkg.pitch}&rdquo;
          </p>
        </div>

        <div className="mt-6">
          <h4 className="font-mono text-xs font-medium uppercase tracking-wider text-slate-500">
            Includes
          </h4>
          <ul className="mt-3 space-y-2.5">
            {pkg.includes.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                <CheckIcon />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 rounded-lg border border-white/5 bg-slate-925/50 px-4 py-3">
          <h4 className="font-mono text-xs font-medium uppercase tracking-wider text-slate-500">
            Deliverable
          </h4>
          <p className="mt-1.5 text-sm text-slate-300">{pkg.deliverable}</p>
        </div>

        {pkg.note && (
          <p className="mt-4 text-xs leading-relaxed text-slate-500">{pkg.note}</p>
        )}

        {pkg.cta && (
          <div className="mt-auto pt-6">
            <Button
              asChild
              size="lg"
              className="w-full rounded-lg bg-seridian-500 px-6 py-3.5 text-sm font-semibold text-slate-950 hover:bg-seridian-400 h-auto"
            >
              <a href={pkg.cta.href}>{pkg.cta.label}</a>
            </Button>
            <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">
              {pkg.cta.hint}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PackageSection({ category }: { category: PackageCategory }) {
  const meta = categoryMeta[category];
  const categoryPackages = packages.filter((pkg) => pkg.category === category);

  return (
    <div>
      <div className="mb-10 max-w-2xl">
        <Badge variant="secondary" className={`${meta.badgeClass} uppercase tracking-wider`}>
          {meta.label}
        </Badge>
        <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-white md:text-3xl">
          {meta.label}
        </h2>
        <p className="mt-3 text-slate-400">{meta.description}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {categoryPackages.map((pkg) => (
          <PackageCard key={pkg.title} pkg={pkg} />
        ))}
      </div>
    </div>
  );
}

export function Packages() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/5 bg-slate-950 pt-16">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="glow-orb pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[700px] -translate-x-1/2 opacity-50" aria-hidden="true" />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 md:pb-20 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="outline"
              className="mb-6 inline-flex items-center gap-2 rounded-full border-seridian-500/20 bg-seridian-500/5 px-4 py-1.5 text-seridian-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-seridian-400" />
              <span className="font-mono text-sm">Fixed-scope consulting packages</span>
            </Badge>

            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
              Clear scope.{" "}
              <span className="gradient-text">Predictable outcomes.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
              Pre-defined packages with transparent pricing and timelines — so you know
              exactly what you&apos;re getting before we start.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 bg-slate-925 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <PackageSection category="application" />
        </div>
      </section>

      <section className="border-b border-white/5 bg-slate-950 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <PackageSection category="devops" />
        </div>
      </section>

      <section className="bg-slate-925 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="card-glow mx-auto max-w-2xl rounded-2xl border-white/5 bg-slate-850/50 p-10 text-center backdrop-blur-sm">
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl">
              Pay $999 — start this week
            </h2>
            <p className="mt-4 text-slate-400">
              The Cloud Health Check is prepaid. No discovery call required. Sprint
              deposits are priced on a 20-minute kickoff.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="w-full rounded-lg bg-seridian-500 px-8 py-3.5 text-sm font-semibold text-slate-950 hover:bg-seridian-400 sm:w-auto h-auto"
              >
                <a href={healthCheckPayHref()}>{healthCheckCtaLabel()}</a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full rounded-lg border-white/10 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/10 hover:text-white sm:w-auto h-auto"
              >
                <a href={kickoffHref()}>Book a 15-min kickoff</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
