/** Canonical external links for settings → Platform connections. */
export const GITHUB_REPO = "https://github.com/therodfather/seridian";
export const GITHUB_ACTIONS = `${GITHUB_REPO}/actions`;
export const NETLIFY_SITE = "https://app.netlify.com/projects/seridian";
export const NETLIFY_DEPLOYS = `${NETLIFY_SITE}/deploys`;
export const PRODUCTION_URL = "https://seridian.netlify.app";

/** Honest badge: these are bookmarks, not verified OAuth sessions. */
export type PlatformLinkStatus = "linked";

export const PLATFORM_LINK_STATUS: PlatformLinkStatus = "linked";
