import { describe, expect, it } from "vitest";

import config from "../../playwright.config";

function project(name: string) {
  const p = config.projects?.find((x) => x.name === name);
  if (!p) throw new Error(`project ${name} missing`);
  return p.use ?? {};
}

describe("playwright projects (T-008)", () => {
  it("chromium-mobile uses touch, isMobile and a mobile user agent at 360x740", () => {
    const use = project("chromium-mobile");
    expect(use.hasTouch).toBe(true);
    expect(use.isMobile).toBe(true);
    expect(use.userAgent).toMatch(/Mobile/);
    expect(use.viewport).toEqual({ width: 360, height: 740 });
    expect(use.defaultBrowserType).toBe("chromium");
  });

  it("chromium-desktop is unchanged at 1280x800", () => {
    const use = project("chromium-desktop");
    expect(use.viewport).toEqual({ width: 1280, height: 800 });
    expect(use.isMobile).toBeFalsy();
    expect(use.hasTouch).toBeFalsy();
  });
});
