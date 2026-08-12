import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { healthCheckCtaLabel, healthCheckPayHref } from "@/lib/healthCheckOffer";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-slate-950 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <span
              aria-label="Seridian logo"
              className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-contain"
                aria-hidden="true"
              >
                <source
                  src="/assets/images/Can_you_make_a_video_of_that_a.mp4"
                  type="video/mp4"
                />
              </video>
            </span>
            <span className="font-display text-sm font-semibold text-white">Seridian</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
            <Link
              href={ROUTES.packagesHealthCheck}
              className="text-seridian-400 transition-colors hover:text-seridian-300"
            >
              {healthCheckCtaLabel()}
            </Link>
            <a
              href={healthCheckPayHref()}
              className="text-slate-400 transition-colors hover:text-white"
            >
              Pay / invoice
            </a>
            <a
              href="mailto:hello@seridian.dev"
              className="text-slate-400 transition-colors hover:text-white"
            >
              hello@seridian.dev
            </a>
          </nav>

          <p className="text-sm text-slate-600">
            &copy; {currentYear} Seridian. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}