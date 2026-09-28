// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// This file lives at apps/web/src/app/globals.test.ts — four levels up is the repo root.
const dirname = path.dirname(fileURLToPath(import.meta.url));
const globalsCssPath = path.join(dirname, "globals.css");
const TOKENS_IMPORT_PATH = "../../../../docs/design/tokens.css";

function readGlobalsCss(): string {
  return fs.readFileSync(globalsCssPath, "utf8");
}

function listCssFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listCssFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".css")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("globals.css", () => {
  it("imports design tokens by path", () => {
    const css = readGlobalsCss();
    expect(css).toContain(`@import "${TOKENS_IMPORT_PATH}"`);

    // The design system is the single source of truth for token values; this
    // file must reference it by path rather than hand-copy any value from it.
    const resolvedTokensPath = path.resolve(dirname, TOKENS_IMPORT_PATH);
    expect(fs.existsSync(resolvedTokensPath)).toBe(true);
  });

  it("has no color literals", () => {
    // src/lib/design-system-review or similar future .css files are covered
    // too: walk every .css file under apps/web/src, not just globals.css.
    // (dirname is apps/web/src/app, so one level up is apps/web/src — two
    // levels up would be apps/web and pick up build output like
    // .next-build/**/*.css, which is generated and out of scope here.)
    const srcDir = path.resolve(dirname, "..");
    const colorLiteral = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(/;
    const offenders = listCssFiles(srcDir).filter((file) => colorLiteral.test(fs.readFileSync(file, "utf8")));

    expect(offenders).toEqual([]);
  });

  it("defines shadcn semantic variables", () => {
    const css = readGlobalsCss();
    const required = ["--background", "--foreground", "--primary", "--destructive", "--success", "--border", "--ring"];

    for (const name of required) {
      expect(css).toContain(name);
    }
  });
});
