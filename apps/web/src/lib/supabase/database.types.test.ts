// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, expectTypeOf, it } from "vitest";

import { createSupabaseBrowserClient } from "./client";
import type { Database } from "./database.types";

const dirname = path.dirname(fileURLToPath(import.meta.url));

describe("database.types.ts", () => {
  it("starts with the Supabase generator header", () => {
    const generated = fs.readFileSync(path.join(dirname, "database.types.ts"), "utf8");

    expect(generated.startsWith("export type Json")).toBe(true);
  });

  it("declares the public schema with Tables, Views and Functions", () => {
    // Compile-time only (see npm run typecheck) — M0 has no public tables yet;
    // M1 extends this with real rows.
    expectTypeOf<Database>().toHaveProperty("public");
    expectTypeOf<Database["public"]>().toHaveProperty("Tables");
    expectTypeOf<Database["public"]>().toHaveProperty("Views");
    expectTypeOf<Database["public"]>().toHaveProperty("Functions");
  });

  it("createSupabaseBrowserClient returns a client typed with Database", () => {
    // Compile-time only (see npm run typecheck).
    expectTypeOf<ReturnType<typeof createSupabaseBrowserClient>>().toEqualTypeOf<SupabaseClient<Database>>();
  });
});
