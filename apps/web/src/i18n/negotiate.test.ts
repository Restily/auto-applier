import { describe, expect, it } from "vitest";

import { negotiateLocale } from "@/i18n/negotiate";

describe("negotiateLocale", () => {
  it.each([
    ["ru-RU", "ru"],
    ["ru", "ru"],
    ["RU-ru", "ru"],
    ["en-US,en;q=0.9,ru;q=0.8", "en"],
    ["ru;q=0.5,en;q=0.9", "en"],
    ["uk-UA,ru;q=0.9", "en"],
    ["de-DE", "en"],
    ["", "en"],
    [null, "en"],
    [undefined, "en"],
    ["*", "en"],
    ["@@", "en"],
  ] as const)("%j -> %s", (header, expected) => {
    expect(negotiateLocale(header)).toBe(expected);
  });

  it("picks Russian when it has the highest q among several tags", () => {
    expect(negotiateLocale("en;q=0.4, ru;q=0.8, de;q=0.1")).toBe("ru");
  });

  it("does not treat a tag that merely starts with ru as Russian", () => {
    expect(negotiateLocale("rum")).toBe("en");
  });
});
