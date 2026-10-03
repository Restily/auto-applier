import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

import { LOCALES, NAMESPACES } from "@/i18n/config";
import { loadMessages, mergeMessages } from "@/i18n/messages";

type Plural = (key: "count", values: { count: number }) => string;

const MESSAGES_DIR = path.resolve(__dirname, "../../messages");

function readNamespace(locale: string, ns: string): unknown {
  return JSON.parse(readFileSync(path.join(MESSAGES_DIR, locale, `${ns}.json`), "utf8"));
}

function flatten(value: unknown, prefix = ""): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).reduce<Record<string, unknown>>(
      (acc, [k, v]) => Object.assign(acc, flatten(v, prefix ? `${prefix}.${k}` : k)),
      {},
    );
  }
  return { [prefix]: value };
}

describe("message catalogs", () => {
  it("every namespace exists in both locales", () => {
    for (const locale of LOCALES) {
      const files = readdirSync(path.join(MESSAGES_DIR, locale)).sort();
      expect(files).toEqual(NAMESPACES.map((ns) => `${ns}.json`).sort());
    }
  });

  it("en and ru have identical key sets", () => {
    const problems: string[] = [];
    for (const ns of NAMESPACES) {
      const en = Object.keys(flatten(readNamespace("en", ns)));
      const ru = Object.keys(flatten(readNamespace("ru", ns)));
      for (const k of en) if (!ru.includes(k)) problems.push(`ru/${ns}.json is missing ${k}`);
      for (const k of ru) if (!en.includes(k)) problems.push(`en/${ns}.json is missing ${k}`);
    }
    expect(problems).toEqual([]);
  });

  it("no empty string values", () => {
    const empty: string[] = [];
    for (const locale of LOCALES) {
      for (const ns of NAMESPACES) {
        for (const [key, value] of Object.entries(flatten(readNamespace(locale, ns)))) {
          if (key !== "" && (typeof value !== "string" || value.trim() === "")) empty.push(`${locale}/${ns}.${key}`);
        }
      }
    }
    expect(empty).toEqual([]);
  });

  it("ru credits plural", async () => {
    const messages = await loadMessages("ru");
    const t = createTranslator({ locale: "ru", messages, namespace: "shell.credits" }) as unknown as Plural;
    expect(t("count", { count: 1 })).toBe("1 кредит");
    expect(t("count", { count: 2 })).toBe("2 кредита");
    expect(t("count", { count: 5 })).toBe("5 кредитов");
    expect(t("count", { count: 11 })).toBe("11 кредитов");
    expect(t("count", { count: 21 })).toBe("21 кредит");
  });

  it("en credits plural", async () => {
    const messages = await loadMessages("en");
    const t = createTranslator({ locale: "en", messages, namespace: "shell.credits" }) as unknown as Plural;
    expect(t("count", { count: 1 })).toBe("1 credit");
    expect(t("count", { count: 20 })).toBe("20 credits");
  });

  it("loadMessages falls back to en for a key missing in ru", () => {
    const en = { shell: { a: "A", nested: { b: "B", c: "C" } } };
    const ru = { shell: { a: "А", nested: { b: "Б" } } };
    expect(mergeMessages(en, ru)).toEqual({ shell: { a: "А", nested: { b: "Б", c: "C" } } });
  });
});
