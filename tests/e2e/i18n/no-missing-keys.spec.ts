import fs from "node:fs";
import path from "node:path";

import { adminClient } from "../../integration/helpers/supabase";
import { expect, signInEn, test } from "../auth/support";
import { collectMissingMessageErrors, expectNoRawKeys } from "../helpers/i18n";

import type { Page } from "@playwright/test";

const ROOT = path.resolve(__dirname, "../../..");
const MESSAGES = path.join(ROOT, "apps/web/messages");
const SERVER_LOG = path.join(ROOT, ".team/state/app.log");

const PUBLIC_PAGES = [
  "/sign-up",
  "/sign-in",
  "/sign-in/forgot-password",
  "/reset-password?error=link_invalid",
  "/account-deleted",
  "/privacy",
  "/health",
];
const SIGNED_IN_PAGES = ["/onboarding", "/onboarding/resume", "/onboarding/profile", "/profile", "/settings"];

function flatten(value: unknown, prefix = ""): string[] {
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

function keysOf(locale: "en" | "ru"): string[] {
  const dir = path.join(MESSAGES, locale);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => flatten(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")), f.replace(/\.json$/, "")))
    .sort();
}

/** The dev server logs next-intl's MISSING_MESSAGE on the server, where the browser console never sees it. */
function serverLogSize(): number {
  return fs.existsSync(SERVER_LOG) ? fs.statSync(SERVER_LOG).size : -1;
}

function serverLogSince(offset: number): string {
  if (offset < 0 || !fs.existsSync(SERVER_LOG)) return "";
  const fd = fs.openSync(SERVER_LOG, "r");
  try {
    const size = fs.fstatSync(fd).size;
    const buffer = Buffer.alloc(Math.max(0, size - offset));
    fs.readSync(fd, buffer, 0, buffer.length, offset);
    return buffer.toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

async function visitAll(page: Page, paths: string[], locale: "en" | "ru"): Promise<void> {
  const missing = collectMissingMessageErrors(page);
  const logOffset = serverLogSize();
  for (const url of paths) {
    const response = await page.goto(url);
    expect(response?.status(), `${url} status`).toBeLessThan(400);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("main h1, main h2").first(), `${url} has a heading`).toBeVisible();
    await expectNoRawKeys(page);
  }
  expect(missing(), "MISSING_MESSAGE in browser console").toEqual([]);
  const serverMissing = serverLogSince(logOffset)
    .split("\n")
    .filter((line) => line.includes("MISSING_MESSAGE"));
  expect(serverMissing, "MISSING_MESSAGE in server log").toEqual([]);
}

test.describe("no missing translation keys (S-005 AC3)", () => {
  test("EN and RU message files define exactly the same keys, with no empty values", () => {
    expect(keysOf("ru")).toEqual(keysOf("en"));
    for (const locale of ["en", "ru"] as const) {
      const dir = path.join(MESSAGES, locale);
      for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
        const strings = JSON.stringify(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")));
        expect(strings, `${locale}/${file} has an empty string`).not.toContain('""');
      }
    }
  });

  for (const locale of ["en", "ru"] as const) {
    test(`public pages show no raw or missing keys in ${locale.toUpperCase()}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: "NEXT_LOCALE", value: locale, url: baseURL ?? "http://localhost:3000" }]);
      await visitAll(page, PUBLIC_PAGES, locale);
    });

    test(`signed-in pages show no raw or missing keys in ${locale.toUpperCase()}`, async ({ page, newUser }) => {
      // The account language wins once signed in, so set it on the profile.
      const { error } = await adminClient().from("profiles").update({ ui_locale: locale }).eq("id", newUser.id);
      expect(error).toBeNull();
      await signInEn(page, newUser);
      await expect(page).toHaveURL(/\/onboarding$/);
      await visitAll(page, SIGNED_IN_PAGES, locale);
    });
  }
});
