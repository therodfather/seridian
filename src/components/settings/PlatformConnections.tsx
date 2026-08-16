"use client";

import { Component, type ReactNode } from "react";
import { CreditCard, ExternalLink, GitBranch, Globe, Landmark, PhoneCall } from "lucide-react";
import { Button } from "@bytecats/ui-kit";
import { SecretConnectCard } from "./SecretConnectCard";
import { TelnyxConnectCard } from "./TelnyxConnectCard";
import {
  GITHUB_ACTIONS,
  GITHUB_REPO,
  NETLIFY_DEPLOYS,
  PLATFORM_LINK_STATUS,
  PRODUCTION_URL,
  type PlatformLinkStatus,
} from "./platformLinks";

interface ConnectionCardProps {
  title: string;
  description: string;
  status: PlatformLinkStatus;
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
        <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
          {status === "linked" ? "Links" : status}
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

class WizardBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return {
      error: error instanceof Error ? error.message : "Integrations setup unavailable",
    };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300"
        >
          This integration section could not load ({this.state.error}). Link cards above
          still work; deploy the latest Convex functions if this persists.
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Platform links always render (e2e-stable). Money and Voice cards are
 * Convex-backed and isolated so query/schema lag cannot blank the tab.
 */
export function PlatformConnections({
  currentUserId = "admin",
}: {
  currentUserId?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Globe className="h-4 w-4 text-cyan-400" />
          Platform connections
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          GitHub is the source of truth. Netlify ships production. These open the
          known project URLs — they are not live OAuth connection checks.
        </p>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Links
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <ConnectionCard
          title="GitHub"
          description="Code, PRs, Actions, and Deploy Previews for therodfather/seridian"
          status={PLATFORM_LINK_STATUS}
          icon={<GitBranch className="h-5 w-5" />}
          primaryHref={GITHUB_REPO}
          primaryLabel="Open repository"
          secondaryHref={GITHUB_ACTIONS}
          secondaryLabel="CI / Actions"
        />
        <ConnectionCard
          title="Netlify"
          description="Production site and Deploy Previews for the Seridian marketing app"
          status={PLATFORM_LINK_STATUS}
          icon={<Globe className="h-5 w-5" />}
          primaryHref={NETLIFY_DEPLOYS}
          primaryLabel="Open deploys"
          secondaryHref={PRODUCTION_URL}
          secondaryLabel="View site"
        />
      </div>

      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-cyan-400" />
          Money
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Paste a credential once, it&apos;s stored in the Convex vault. Disconnect
          removes it immediately.
        </p>
      </div>

      <WizardBoundary>
        <div className="grid gap-4 md:grid-cols-2">
          <SecretConnectCard
            provider="stripe"
            title="Stripe"
            description="Webhook secret — powers the payments feed on each client"
            icon={<CreditCard className="h-5 w-5" />}
            fieldLabel="Webhook signing secret"
            fieldPlaceholder="whsec_..."
            helpText="Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret."
            helpHref="https://dashboard.stripe.com/webhooks"
            currentUserId={currentUserId}
          />
          <SecretConnectCard
            provider="mercury"
            title="Mercury"
            description="Read-only API token — for pulling bank activity into the dashboard"
            icon={<Landmark className="h-5 w-5" />}
            fieldLabel="API token"
            fieldPlaceholder="Paste your Mercury API token"
            helpText="Mercury Dashboard → Settings → API → create a read-only token."
            helpHref="https://mercury.com/dashboard/settings/tokens"
            currentUserId={currentUserId}
          />
        </div>
      </WizardBoundary>

      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <PhoneCall className="h-4 w-4 text-cyan-400" />
          Voice
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Telnyx Call Control powers inbound IVR. Keys stay in the Convex vault;
          flows live under IVR / Voice.
        </p>
      </div>

      <WizardBoundary>
        <TelnyxConnectCard currentUserId={currentUserId} />
      </WizardBoundary>
    </div>
  );
}
