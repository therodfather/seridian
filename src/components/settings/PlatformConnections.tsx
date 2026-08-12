"use client";

import { ExternalLink, GitBranch, Globe, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@bytecats/ui-kit";

const GITHUB_REPO = "https://github.com/therodfather/seridian";
const GITHUB_ACTIONS = `${GITHUB_REPO}/actions`;
const NETLIFY_SITE = "https://app.netlify.com/projects/seridian";
const NETLIFY_DEPLOYS = `${NETLIFY_SITE}/deploys`;
const PRODUCTION_URL = "https://seridian.com";

interface ConnectionCardProps {
  title: string;
  description: string;
  status: "connected" | "configure";
  icon: React.ReactNode;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

function ConnectionCard({
  title,
  description,
  status,
  icon,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: ConnectionCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#070b14] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            status === "connected"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-amber-500/20 bg-amber-500/10 text-amber-400"
          }`}
        >
          {status === "connected" ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {status === "connected" ? "Live" : "Setup"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          asChild
          size="sm"
          className="bg-seridian-500 text-slate-950 hover:bg-seridian-400 font-semibold text-xs"
        >
          <a href={primaryHref} target="_blank" rel="noopener noreferrer">
            {primaryLabel}
            <ExternalLink className="ml-1.5 h-3 w-3" />
          </a>
        </Button>
        {secondaryHref && secondaryLabel && (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-white/10 text-slate-300 hover:bg-white/5 text-xs"
          >
            <a href={secondaryHref} target="_blank" rel="noopener noreferrer">
              {secondaryLabel}
              <ExternalLink className="ml-1.5 h-3 w-3" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * One place for the tools that actually run Seridian: GitHub (source of truth)
 * and Netlify (production). Linear stays available under Sync but is no longer
 * presented as primary.
 */
export function PlatformConnections() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Globe className="h-4 w-4 text-cyan-400" />
          Platform connections
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          GitHub is the source of truth. Netlify ships production. Open these from
          here instead of hunting tabs.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ConnectionCard
          title="GitHub"
          description="Code, PRs, Actions, and Deploy Previews for therodfather/seridian"
          status="connected"
          icon={<GitBranch className="h-5 w-5" />}
          primaryHref={GITHUB_REPO}
          primaryLabel="Open repository"
          secondaryHref={GITHUB_ACTIONS}
          secondaryLabel="CI / Actions"
        />
        <ConnectionCard
          title="Netlify"
          description="Production site and Deploy Previews for the Seridian marketing app"
          status="connected"
          icon={<Globe className="h-5 w-5" />}
          primaryHref={NETLIFY_DEPLOYS}
          primaryLabel="Open deploys"
          secondaryHref={PRODUCTION_URL}
          secondaryLabel="View site"
        />
      </div>

      <p className="text-[11px] text-slate-600">
        Linear sync remains available below for the trial migration period. Prefer
        GitHub issues for new work.
      </p>
    </div>
  );
}
