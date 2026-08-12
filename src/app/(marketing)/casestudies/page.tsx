"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Badge } from "@bytecats/ui-kit";
import { CaseStudyCard } from "@/components/casestudies/CaseStudyCard";

export default function CaseStudiesPage() {
  const caseStudies = useQuery(api.caseStudies.listPublished, {});

  return (
    <section className="relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="glow-orb pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[800px] -translate-x-1/2 opacity-60" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-20 md:pb-32 md:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="outline"
            className="mb-6 inline-flex items-center gap-2 rounded-full border-seridian-500/20 bg-seridian-500/5 px-4 py-1.5 text-seridian-300"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-seridian-400" />
            <span className="font-mono text-sm text-seridian-300">
              Case Studies
            </span>
          </Badge>

          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl md:leading-[1.1]">
            Our{" "}
            <span className="gradient-text">success stories</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            Explore how we&apos;ve helped organizations architect resilient cloud
            infrastructure, ship modern applications, and navigate complex
            technical challenges.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          {caseStudies === undefined ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[320px] animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]"
                />
              ))}
            </div>
          ) : caseStudies.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-white/[0.06] text-slate-600">
              No case studies published yet. Check back soon.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {caseStudies.map((study) => (
                <CaseStudyCard key={study._id} study={study} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
