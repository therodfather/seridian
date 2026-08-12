"use client";

import dynamic from "next/dynamic";

export const StarryBackground = dynamic(
  () => import("./StarryField").then((m) => m.StarryBackground),
  { ssr: false },
);

export const SmokeBackground = dynamic(
  () => import("./SmokeDrift").then((m) => m.SmokeBackground),
  { ssr: false },
);

export const LiquidBackground = dynamic(
  () => import("./LiquidWaves").then((m) => m.LiquidBackground),
  { ssr: false },
);

export const LightBeamsBackground = dynamic(
  () => import("./LightBeams").then((m) => m.LightBeamsBackground),
  { ssr: false },
);

export const TwilightBackground = dynamic(
  () => import("./Twilight").then((m) => m.TwilightBackground),
  { ssr: false },
);

export const RainBackground = dynamic(
  () => import("./RainEffect").then((m) => m.RainBackground),
  { ssr: false },
);

export const AuroraBackground = dynamic(
  () => import("./Aurora").then((m) => m.AuroraBackground),
  { ssr: false },
);

export const NeuralBackground = dynamic(
  () => import("./NeuralNet").then((m) => m.NeuralBackground),
  { ssr: false },
);

export const GlowBackground = dynamic(
  () => import("./SoftGlow").then((m) => m.GlowBackground),
  { ssr: false },
);

export const GridBackground = dynamic(
  () => import("./GridScroll").then((m) => m.GridBackground),
  { ssr: false },
);

export const FloatingPagesBackground = dynamic(
  () => import("./FloatingPages").then((m) => m.FloatingPagesBackground),
  { ssr: false },
);

export const SyncPulseBackground = dynamic(
  () => import("./SyncPulse").then((m) => m.SyncPulseBackground),
  { ssr: false },
);
