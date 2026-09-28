// @vitest-environment node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const cwd = path.dirname(fileURLToPath(import.meta.url));

async function lint(code: string, filePath: string) {
  const eslint = new ESLint({ cwd });
  const results = await eslint.lintText(code, { filePath });
  return results.flatMap((result) => result.messages);
}

const RULE = "i18next/no-literal-string";

describe("eslint i18n rule", () => {
  it("flags literal JSX text in src/app", async () => {
    const messages = await lint("export default function Page() {\n  return <p>Hello world</p>;\n}\n", "src/app/x/page.tsx");
    expect(messages.some((message) => message.ruleId === RULE)).toBe(true);
  });

  it("allows t() calls", async () => {
    const messages = await lint(
      'export function Page({ t }: { t: (k: string) => string }) {\n  return <p>{t("shell.title")}</p>;\n}\n',
      "src/app/x/page.tsx",
    );
    expect(messages.some((message) => message.ruleId === RULE)).toBe(false);
  });

  it("ignores src/components/ui", async () => {
    const messages = await lint("export function Thing() {\n  return <span>Close</span>;\n}\n", "src/components/ui/thing.tsx");
    expect(messages.some((message) => message.ruleId === RULE)).toBe(false);
  });

  it("ignores test files", async () => {
    const messages = await lint("export const el = <p>Hello world</p>;\n", "src/components/shell/x.test.tsx");
    expect(messages.some((message) => message.ruleId === RULE)).toBe(false);
  });
});
