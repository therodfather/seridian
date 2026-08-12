import type { Metadata } from "next";
import { Packages } from "@/components/Packages";

export const metadata: Metadata = {
  title: "Consulting Packages | Seridian",
  description:
    "Fixed-scope consulting packages for application development and DevOps. MVP sprints, feature development, cloud health checks, and CI/CD automation with transparent pricing.",
  keywords: [
    "consulting packages",
    "MVP development",
    "feature sprint",
    "cloud health check",
    "CI/CD automation",
    "DevOps consulting",
    "application development",
    "fixed price consulting",
  ],
  openGraph: {
    title: "Consulting Packages | Seridian",
    description:
      "Fixed-scope packages for MVP development, feature sprints, cloud infrastructure reviews, and CI/CD automation.",
    type: "website",
  },
};

export default function PackagesPage() {
  return <Packages />;
}
