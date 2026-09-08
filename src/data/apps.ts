export type CatalogApp = {
  id: string;
  name: string;
  description: string;
  href: string;
  /** Key used to pick a matching icon in AppCatalog */
  icon: "building" | "package" | "wrench" | "activity" | "file";
};

/**
 * Seridian product catalog — add entries here to extend the site catalog.
 */
export const catalogApps: CatalogApp[] = [
  {
    id: "property-portal",
    name: "Property Portal",
    description:
      "Multi-tenant property management SaaS — a live maintenance ledger for landlords, managers, residents, and technicians.",
    href: "https://propertyportal.pro/",
    icon: "building",
  },
  {
    id: "pack-n-pick",
    name: "Pack n Pick",
    description:
      "Warehouse pick & pack ERP — floor console for pick lists, scan-to-confirm, pack, ship, and live inventory counts.",
    href: "https://packnpick.netlify.app/",
    icon: "package",
  },
  {
    id: "i-you-fix-it",
    name: "I You Fix It",
    description:
      "Field tickets for building deficiencies — walk the site, photo and assign trades, then verify close-out live.",
    href: "https://iyoufixit.netlify.app/",
    icon: "wrench",
  },
  {
    id: "usermon",
    name: "Usermon",
    description:
      "Real-user and API performance across web, Android, and iOS — RUM vitals, spans, and actionable live dashboards.",
    href: "https://usermon-128.netlify.app/",
    icon: "activity",
  },
  {
    id: "easycv",
    name: "EasyCV",
    description:
      "Build a clean, recruiter-ready resume in seconds — upload CVs, optimize for a role, and export as PDF.",
    href: "https://easycv-app-4ce.netlify.app/",
    icon: "file",
  },
];
