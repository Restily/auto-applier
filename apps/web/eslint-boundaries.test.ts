// @vitest-environment node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// This file lives at the apps/web root, so its own directory is the project
// cwd the ESLint Node API needs to find eslint.config.mjs and node_modules.
const cwd = path.dirname(fileURLToPath(import.meta.url));

async function lint(code: string, filePath: string) {
  const eslint = new ESLint({ cwd });
  const results = await eslint.lintText(code, { filePath });
  return results.flatMap((result) => result.messages);
}

describe("eslint import boundaries", () => {
  it("blocks supabase import outside lib/supabase", async () => {
    const messages = await lint(
      'import { createBrowserClient } from "@supabase/ssr";\nexport const client = createBrowserClient("", "");\n',
      "src/app/x.tsx",
    );

    expect(messages.some((message) => message.message.includes("createSupabaseServerClient"))).toBe(true);
  });

  it("allows supabase import inside lib/supabase", async () => {
    const messages = await lint(
      'import { createBrowserClient } from "@supabase/ssr";\nexport const client = createBrowserClient("", "");\n',
      "src/lib/supabase/x.ts",
    );

    expect(messages.some((message) => message.ruleId === "no-restricted-imports")).toBe(false);
  });

  it("blocks openapi-fetch outside lib/api", async () => {
    const messages = await lint(
      'import createClient from "openapi-fetch";\nexport const client = createClient({ baseUrl: "" });\n',
      "src/app/y.tsx",
    );

    expect(messages.some((message) => message.message.includes("createApiClient"))).toBe(true);
  });

  it("blocks components importing from app", async () => {
    const messages = await lint('import Page from "../app/page";\nexport const Wrapped = Page;\n', "src/components/foo.tsx");

    expect(messages.some((message) => message.message.includes("must not depend on routes"))).toBe(true);
  });
});
