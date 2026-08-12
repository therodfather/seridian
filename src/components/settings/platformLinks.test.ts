import { describe, expect, test } from "vitest";
import {
  GITHUB_ACTIONS,
  GITHUB_REPO,
  NETLIFY_DEPLOYS,
  PLATFORM_LINK_STATUS,
  PRODUCTION_URL,
} from "./platformLinks";

describe("platform links", () => {
  test("points at the canonical GitHub repo and Actions", () => {
    expect(GITHUB_REPO).toBe("https://github.com/therodfather/seridian");
    expect(GITHUB_ACTIONS).toBe(`${GITHUB_REPO}/actions`);
  });

  test("points at Netlify project deploys and production site", () => {
    expect(NETLIFY_DEPLOYS).toContain("app.netlify.com/projects/seridian");
    expect(PRODUCTION_URL).toBe("https://seridian.netlify.app");
  });

  test("does not claim a live OAuth connection", () => {
    expect(PLATFORM_LINK_STATUS).toBe("linked");
  });
});
