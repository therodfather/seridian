"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@bytecats/ui-kit";
import { ROUTES } from "@/lib/routes";

const navLinks = [
  { href: ROUTES.services, label: "Services" },
  { href: ROUTES.packages, label: "Packages" },
  { href: ROUTES.approach, label: "Approach" },
  { href: ROUTES.expertise, label: "Expertise" },
  { href: ROUTES.contact, label: "Contact" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href={ROUTES.home} className="flex items-center gap-2.5">
          <span
            aria-label="Seridian logo"
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg"
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
          <span className="font-display text-lg font-semibold tracking-tight text-white">
            Seridian
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-slate-400 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <Button
            asChild
            size="sm"
            className="rounded-lg bg-seridian-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-seridian-400"
          >
            <Link href={ROUTES.contact}>Get in touch</Link>
          </Button>
        </nav>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </Button>
      </div>

      {mobileOpen && (
        <nav className="border-t border-white/5 bg-slate-950/95 px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-slate-400 transition-colors hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Button
              asChild
              className="rounded-lg bg-seridian-500 px-4 py-2.5 text-center text-sm font-medium text-slate-950 hover:bg-seridian-400"
              onClick={() => setMobileOpen(false)}
            >
              <Link href={ROUTES.contact}>Get in touch</Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
