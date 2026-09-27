#!/usr/bin/env node
// Regenerates apps/web/src/lib/api/schema.gen.ts into a temp file and diffs
// it against the committed one. Exits 1 with a hint if they differ; exits 0
// if the committed file already matches what backend/openapi.json produces.
// Mirrors scripts/db_types.py's --check mode for the DB types generator.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WEB_DIR = path.join(ROOT, "apps", "web");
const TARGET = path.join(WEB_DIR, "src", "lib", "api", "schema.gen.ts");
const OPENAPI_JSON = path.join(ROOT, "backend", "openapi.json");
const DRIFT_MESSAGE = "API types drift: run npm run gen:api-types";

const tmpDir = mkdtempSync(path.join(tmpdir(), "openapi-check-"));
try {
  const tmpOut = path.join(tmpDir, "schema.gen.ts");
  execFileSync(
    "npx",
    ["--prefix", WEB_DIR, "openapi-typescript", OPENAPI_JSON, "-o", tmpOut],
    { cwd: WEB_DIR, stdio: "inherit" },
  );

  const generated = readFileSync(tmpOut, "utf8");
  let committed;
  try {
    committed = readFileSync(TARGET, "utf8");
  } catch {
    console.error(DRIFT_MESSAGE);
    process.exit(1);
  }

  if (generated !== committed) {
    console.error(DRIFT_MESSAGE);
    process.exit(1);
  }

  console.log(`${path.relative(ROOT, TARGET)} is up to date.`);
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
