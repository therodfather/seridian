import type { ReactNode } from "react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@bytecats/ui-kit";
import { catalogApps, type CatalogApp } from "@/data/apps";

const iconClass = "h-6 w-6";

const icons: Record<CatalogApp["icon"], ReactNode> = {
  building: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"
      />
    </svg>
  ),
  package: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
      />
    </svg>
  ),
  wrench: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.375 1.093-.818 1.488-1.344 1.224-1.63.536-3.887-1.402-4.754-1.938-.867-4.07.266-4.754 2.204-.375.55-.626 1.093-.766 1.208"
      />
    </svg>
  ),
  activity: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l3.75-3.75 3 3L20.25 3.75M3.75 20.25h16.5"
      />
    </svg>
  ),
  file: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  ),
};

export function AppCatalog() {
  return (
    <section id="apps" className="border-t border-white/5 bg-slate-950 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="border-seridian-500/20 bg-seridian-500/10 text-seridian-400 uppercase tracking-wider"
          >
            Products
          </Badge>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Applications we&apos;ve built
          </h2>
          <p className="mt-4 text-slate-400">
            Production software we design, ship, and operate — from multi-tenant SaaS
            to field tools and developer products.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {catalogApps.map((app) => (
            <Card
              key={app.id}
              className="card-glow group rounded-xl border-white/5 bg-slate-850/30 p-6 transition-all hover:border-seridian-500/20"
            >
              <CardHeader className="p-0">
                <a
                  href={app.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-seridian-500/50"
                  aria-label={`Open ${app.name}`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-seridian-500/10 text-seridian-400 transition-colors group-hover:bg-seridian-500/15 group-hover:text-seridian-300">
                    {icons[app.icon]}
                  </span>
                  <CardTitle className="font-display text-lg font-semibold text-white transition-colors group-hover:text-seridian-300">
                    {app.name}
                  </CardTitle>
                </a>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                <CardDescription className="text-sm leading-relaxed text-slate-400">
                  {app.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
